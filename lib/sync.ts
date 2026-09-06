import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadCourses,
  loadReferenceCourses,
  loadFuelExpenses,
  loadMotoExpenses,
  loadClosures,
  replaceAllCourses,
  replaceAllReferenceCourses,
  replaceAllFuelExpenses,
  replaceAllMotoExpenses,
  replaceAllClosures,
} from '@/lib/storage';
import type { Course, ReferenceCourse } from '@/types/course';
import type { FuelExpense } from '@/types/fuel';
import type { MotoExpense } from '@/types/moto';
import type { MonthClosure } from '@/types/closure';

const CONFIG_KEY = '@sync_config';
const LAST_RESULT_KEY = '@sync_last_result';

export interface SyncConfig {
  host: string;
  port: string;
  apiKey: string;
}

export interface SyncResult {
  ok: boolean;
  at: string;
  error?: string;
  summary?: Record<string, number>;
}

export interface BackupPayload {
  courses: Course[];
  referenceCourses: ReferenceCourse[];
  fuelExpenses: FuelExpense[];
  motoExpenses: MotoExpense[];
  closures: MonthClosure[];
}

export async function loadSyncConfig(): Promise<SyncConfig | null> {
  const raw = await AsyncStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SyncConfig;
  } catch {
    return null;
  }
}

export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function clearSyncConfig(): Promise<void> {
  await AsyncStorage.removeItem(CONFIG_KEY);
}

export async function loadLastSyncResult(): Promise<SyncResult | null> {
  const raw = await AsyncStorage.getItem(LAST_RESULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SyncResult;
  } catch {
    return null;
  }
}

async function saveLastSyncResult(result: SyncResult): Promise<void> {
  await AsyncStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result));
}

function baseUrl(config: SyncConfig): string {
  return `http://${config.host}:${config.port}`;
}

export async function checkConnection(config: SyncConfig): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl(config)}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Envoie une copie complète des données locales vers le serveur du Pi. */
export async function pushBackup(): Promise<SyncResult> {
  const config = await loadSyncConfig();
  if (!config) {
    const result: SyncResult = { ok: false, at: new Date().toISOString(), error: 'Pas encore configuré' };
    return result;
  }

  try {
    const [courses, referenceCourses, fuelExpenses, motoExpenses, closures] = await Promise.all([
      loadCourses(),
      loadReferenceCourses(),
      loadFuelExpenses(),
      loadMotoExpenses(),
      loadClosures(),
    ]);

    const payload: BackupPayload = { courses, referenceCourses, fuelExpenses, motoExpenses, closures };

    const res = await fetch(`${baseUrl(config)}/api/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as { error?: string });
      const result: SyncResult = {
        ok: false,
        at: new Date().toISOString(),
        error: body.error || `Erreur serveur (${res.status})`,
      };
      await saveLastSyncResult(result);
      return result;
    }

    const data = (await res.json()) as { savedAt: string; summary: Record<string, number> };
    const result: SyncResult = { ok: true, at: data.savedAt, summary: data.summary };
    await saveLastSyncResult(result);
    return result;
  } catch (e) {
    const result: SyncResult = {
      ok: false,
      at: new Date().toISOString(),
      error: e instanceof Error ? e.message : 'Échec de connexion',
    };
    await saveLastSyncResult(result);
    return result;
  }
}

/** Récupère la dernière sauvegarde complète depuis le Pi. */
export async function fetchBackup(): Promise<{ ok: boolean; data?: BackupPayload; error?: string }> {
  const config = await loadSyncConfig();
  if (!config) return { ok: false, error: 'Pas encore configuré' };
  try {
    const res = await fetch(`${baseUrl(config)}/api/backup`, { headers: { 'x-api-key': config.apiKey } });
    if (!res.ok) return { ok: false, error: `Erreur serveur (${res.status})` };
    const data = (await res.json()) as BackupPayload;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Échec de connexion' };
  }
}

/** Remplace toutes les données locales par celles reçues du Pi (restauration). */
export async function applyBackup(data: BackupPayload): Promise<void> {
  await Promise.all([
    replaceAllCourses(data.courses || []),
    replaceAllReferenceCourses(data.referenceCourses || []),
    replaceAllFuelExpenses(data.fuelExpenses || []),
    replaceAllMotoExpenses(data.motoExpenses || []),
    replaceAllClosures(data.closures || []),
  ]);
}

// ---------------------------------------------------------------------------
// Déclenchement automatique en arrière-plan après chaque écriture locale.
// Regroupe (debounce) les écritures rapprochées pour ne pas spammer le
// serveur (ex: import de 2000 lignes = un seul envoi, pas 2000).
// ---------------------------------------------------------------------------

type Listener = (result: SyncResult) => void;
let listeners: Listener[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function onSyncResult(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function scheduleSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const config = await loadSyncConfig();
    if (!config) return; // pas configuré: rien à faire
    const result = await pushBackup();
    listeners.forEach((l) => l(result));
  }, 2000);
}
