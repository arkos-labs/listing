/**
 * supabaseSync.ts
 *
 * Gère la synchronisation des courses de référence avec Supabase :
 *  - Import XLS → dédoublonnage → insertion dans Supabase
 *  - Abonnement Realtime : tous les appareils reçoivent une notification
 *    dès qu'un autre utilisateur ajoute de nouvelles courses.
 *  - Cache local dans AsyncStorage pour éviter de requêter Supabase
 *    à chaque affichage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { ReferenceCourseInput } from '@/types/course';

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE_KEY = '@supabase_reference_courses';
const CACHE_TS_KEY = '@supabase_reference_courses_ts';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 jours — le cache n'expire que si quelqu'un ajoute un listing (Realtime invalide le cache)

export interface CachedReferenceCourse {
  id: string;
  lieuEnlevement: string;
  lieuLivraison: string;
  qteBon: number;
  vehicule?: string;
  domaine?: 'medical' | 'courseCourse';
  hash: string;
}

/** Charge les courses depuis le cache local (AsyncStorage). */
export async function loadCachedCourses(): Promise<CachedReferenceCourse[] | null> {
  try {
    const ts = await AsyncStorage.getItem(CACHE_TS_KEY);
    if (!ts) return null;
    if (Date.now() - Number(ts) > CACHE_TTL_MS) return null; // cache périmé
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedReferenceCourse[];
    // Sécurité : si le cache contient exactement 1000 lignes, il vient probablement
    // de l'ancienne version sans pagination → on l'invalide pour forcer un rechargement
    if (parsed.length === 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveCacheFromRows(rows: CachedReferenceCourse[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  await AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now()));
}

/** Force la suppression du cache (utile après un import). */
export async function invalidateCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
  await AsyncStorage.removeItem(CACHE_TS_KEY);
}

// ---------------------------------------------------------------------------
// Hash de dédoublonnage
// ---------------------------------------------------------------------------

/**
 * Hash basé sur les 4 champs qui définissent une course unique :
 * enlèvement + livraison + type de véhicule + nombre de bons.
 * Deux courses ayant les mêmes adresses et le même type mais un prix différent
 * (ex: 3 bons vs 5 bons) ont des hashes différents → ce sont deux entrées distinctes.
 */
function makeHash(input: ReferenceCourseInput): string {
  const str = [
    (input.lieuEnlevement ?? '').trim().toLowerCase(),
    (input.lieuLivraison ?? '').trim().toLowerCase(),
    (input.vehicule ?? '').trim().toLowerCase(),
    String(input.qteBon ?? 0),
  ].join('|');

  // Implémentation djb2 (légère, suffisante pour une clé de dédup)
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // forcer uint32
  }
  return hash.toString(16).padStart(8, '0') + '_' + str.slice(0, 40).replace(/[^a-z0-9]/g, '_');
}

// ---------------------------------------------------------------------------
// Règles de prix minimum (identiques au script Python)
// ---------------------------------------------------------------------------

function getPostal2(addr: string): string {
  const m = addr.match(/\b(\d{5})\b/);
  return m ? m[1].slice(0, 2) : '';
}

function isParis(addr: string): boolean {
  return getPostal2(addr) === '75';
}

function isBanlieue(addr: string): boolean {
  return ['91', '92', '93', '94', '77', '78', '95'].includes(getPostal2(addr));
}

/**
 * Applique les prix minimum par zone et type de véhicule.
 * Paris↔Paris : 2.5 (express/2R), 3.5 (vital), 4.5 (break)
 * Banlieue impliquée : 3.0
 * PROGRAMME : pas de minimum
 */
type MappedRow = {
  lieuEnlevement: string;
  lieuLivraison: string;
  qteBon: number;
  vehicule: string | null;
  domaine: 'medical' | 'courseCourse' | null;
  hash: string;
};

function applyPriceMinimum(rows: MappedRow[]): void {
  for (const r of rows) {
    const veh = (r.vehicule ?? '').toUpperCase();
    if (veh.includes('PROGRAMME')) continue;

    const enl = r.lieuEnlevement ?? '';
    const liv = r.lieuLivraison ?? '';
    const isBreak = veh.includes('BREAK');
    const isVital = veh.includes('VITAL') || veh.includes('URGENCE');

    if (isParis(enl) && isParis(liv)) {
      if (isBreak && (r.qteBon ?? 0) < 4.5) r.qteBon = 4.5;
      else if (isVital && (r.qteBon ?? 0) < 3.5) r.qteBon = 3.5;
      else if (!isBreak && !isVital && (r.qteBon ?? 0) < 2.5) r.qteBon = 2.5;
    } else if (isBanlieue(enl) || isBanlieue(liv)) {
      if ((r.qteBon ?? 0) < 3.0) r.qteBon = 3.0;
    }
  }
}

// ---------------------------------------------------------------------------
// Import XLS → Supabase
// ---------------------------------------------------------------------------

export interface ImportResult {
  /** Nouvelles lignes réellement insérées en base */
  inserted: number;
  /** Doublons à l'intérieur des fichiers importés (même trajet+type+prix) */
  duplicates: number;
  /** Lignes déjà présentes en base (ignorées) */
  alreadyInDb: number;
  /** Lignes refusées par la base */
  errors: number;
  /** Premier message d'erreur renvoyé par Supabase (RLS, colonne, etc.) */
  errorMessage?: string;
}

/** Message utilisateur honnête : distingue "rien de nouveau" d'un vrai échec. */
export function formatImportResult(r: ImportResult): string {
  if (r.errors > 0 && r.inserted === 0) {
    return `❌ Import refusé par la base : ${r.errorMessage ?? 'erreur inconnue'}`;
  }
  const parts: string[] = [];
  parts.push(`${r.inserted} nouvelle${r.inserted > 1 ? 's' : ''} course${r.inserted > 1 ? 's' : ''}`);
  const dejaLa = r.alreadyInDb + r.duplicates;
  if (dejaLa > 0) parts.push(`${dejaLa} déjà dans la base`);
  if (r.errors > 0) parts.push(`${r.errors} refusée${r.errors > 1 ? 's' : ''}`);
  const icon = r.inserted > 0 ? '✅' : 'ℹ️';
  return `${icon} ${parts.join(' · ')}`;
}

/**
 * Insère une liste de ReferenceCourseInput dans Supabase.
 * - Calcule le hash de chaque course.
 * - Ignore silencieusement les doublons (ON CONFLICT DO NOTHING).
 * - Retourne le nombre de nouvelles courses réellement insérées.
 */
export async function importCoursesToSupabase(
  courses: ReferenceCourseInput[]
): Promise<ImportResult> {
  if (courses.length === 0) return { inserted: 0, duplicates: 0, alreadyInDb: 0, errors: 0 };

  // Étape 1 : calcul du hash par itinéraire (sans prix) + dédoublonnage MAX qte_bon
  const mapped: MappedRow[] = courses.map((c) => ({
    lieuEnlevement: (c.lieuEnlevement ?? '').trim(),
    lieuLivraison: (c.lieuLivraison ?? '').trim(),
    qteBon: c.qteBon ?? 0,
    vehicule: c.vehicule ?? null,
    domaine: c.domaine ?? null,
    hash: makeHash(c),
  }));

  // Pour chaque itinéraire unique (hash), on garde uniquement le MAX qteBon
  const best = new Map<string, MappedRow>();
  for (const r of mapped) {
    const existing = best.get(r.hash);
    if (!existing || r.qteBon > existing.qteBon) {
      best.set(r.hash, r);
    }
  }

  const dedupedRows = Array.from(best.values());
  const dupCount = courses.length - dedupedRows.length;

  // Étape 2 : appliquer les prix minimum par zone
  applyPriceMinimum(dedupedRows);

  // Étape 3 : préparer pour Supabase
  const rows = dedupedRows.map((r) => ({
    lieu_enlevement: r.lieuEnlevement,
    lieu_livraison: r.lieuLivraison,
    qte_bon: r.qteBon,
    vehicule: r.vehicule,
    domaine: r.domaine,
    hash: r.hash,
  }));

  const BATCH = 500;
  let inserted = 0;
  let errors = 0;
  let alreadyInDb = 0;
  let errorMessage: string | undefined;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('reference_courses')
      .upsert(batch, { onConflict: 'hash', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error('[supabaseSync] Erreur insertion batch', i, error.message);
      errors += batch.length;
      if (!errorMessage) errorMessage = error.message;
    } else {
      const n = data?.length ?? 0;
      inserted += n;
      // ignoreDuplicates ne renvoie que les lignes créées : le reste existait déjà
      alreadyInDb += batch.length - n;
    }
  }

  // Invalider le cache local pour forcer un rechargement
  if (inserted > 0) await invalidateCache();

  return { inserted, duplicates: Math.max(0, dupCount), alreadyInDb, errors, errorMessage };
}

// ---------------------------------------------------------------------------
// Chargement depuis Supabase (avec cache)
// ---------------------------------------------------------------------------

export async function fetchReferenceCourses(): Promise<CachedReferenceCourse[]> {
  const cached = await loadCachedCourses();
  
  if (cached) {
    try {
      // Lightweight check to see if Supabase has changed since we cached
      const { data, count, error } = await supabase
        .from('reference_courses')
        .select('created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error) {
        const dbCount = count ?? 0;
        const dbLatest = data?.[0]?.created_at ?? null;
        
        const cachedCount = cached.length;
        const cachedLatest = await AsyncStorage.getItem('@supabase_reference_courses_latest');

        if (dbCount !== cachedCount || dbLatest !== cachedLatest) {
          await invalidateCache();
          // We don't return cached, we let it fall through to fetch fresh data
        } else {
          return cached;
        }
      } else {
        return cached; // offline or error, return cache
      }
    } catch (e) {
      return cached;
    }
  }

  // Supabase limite à 1000 lignes par défaut — on pagine pour tout récupérer
  const PAGE_SIZE = 1000;
  let allRows: CachedReferenceCourse[] = [];
  let from = 0;
  let latestCreatedAt: string | null = null;

  while (true) {
    const { data, error } = await supabase
      .from('reference_courses')
      .select('id, lieu_enlevement, lieu_livraison, qte_bon, vehicule, domaine, hash, created_at')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('[supabaseSync] Erreur fetch page', from, error?.message);
      break;
    }

    if (!data || data.length === 0) break;

    // The first row of the first page has the latest created_at
    if (from === 0 && data.length > 0) {
      latestCreatedAt = data[0].created_at;
    }

    const rows: CachedReferenceCourse[] = data.map((r: any) => ({
      id: r.id,
      lieuEnlevement: r.lieu_enlevement,
      lieuLivraison: r.lieu_livraison,
      qteBon: r.qte_bon,
      vehicule: r.vehicule ?? undefined,
      domaine: r.domaine ?? undefined,
      hash: r.hash,
    }));

    allRows = allRows.concat(rows);

    // Si on a reçu moins que PAGE_SIZE, c'est la dernière page
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  await saveCacheFromRows(allRows);
  if (latestCreatedAt) {
    await AsyncStorage.setItem('@supabase_reference_courses_latest', latestCreatedAt);
  } else if (allRows.length === 0) {
    await AsyncStorage.removeItem('@supabase_reference_courses_latest');
  }
  
  return allRows;
}

// ---------------------------------------------------------------------------
// Realtime — notification temps réel sur tous les appareils
// ---------------------------------------------------------------------------

export interface RealtimeNotification {
  count: number; // nombre de nouvelles courses insérées
}

type NotificationListener = (notif: RealtimeNotification) => void;
let realtimeListeners: NotificationListener[] = [];
let realtimeSubscribed = false;

/**
 * S'abonne au canal Realtime Supabase.
 * À appeler une seule fois au démarrage de l'app (ex: dans _layout.tsx).
 * Quand un autre utilisateur insère des courses, tous les appareils connectés
 * reçoivent un événement → le listener déclenche le popup.
 */
export function subscribeToRealtimeUpdates(onNotification: NotificationListener): () => void {
  realtimeListeners.push(onNotification);

  if (!realtimeSubscribed) {
    realtimeSubscribed = true;

    // On regroupe les INSERT arrivant en rafale (batch import) sur 1 seconde
    let pendingCount = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    supabase
      .channel('reference_courses_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reference_courses' },
        () => {
          pendingCount += 1;
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const count = pendingCount;
            pendingCount = 0;
            // Invalider le cache pour que tous rechargent les nouvelles données
            invalidateCache();
            // Notifier tous les listeners (déclenche le popup)
            realtimeListeners.forEach((fn) => fn({ count }));
          }, 1500);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reference_courses' },
        () => {
          // L'admin a corrigé un prix → invalider le cache sur tous les appareils
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            await invalidateCache();
            realtimeListeners.forEach((fn) => fn({ count: 0 }));
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reference_courses' },
        () => {
          // L'admin a vidé la base → invalider le cache sur tous les appareils.
          // Debounce 3s : laisse le temps à tous les DELETE (potentiellement 2000+) d'arriver
          // avant de déclencher le rechargement.
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            pendingCount = 0;
            await invalidateCache();
            // Notifier avec count=0 → ReferenceContext recharge depuis Supabase (base vide)
            realtimeListeners.forEach((fn) => fn({ count: 0 }));
          }, 3000);
        }
      )
      .subscribe();
  }

  // Retourne une fonction de désinscription
  return () => {
    realtimeListeners = realtimeListeners.filter((fn) => fn !== onNotification);
  };
}
