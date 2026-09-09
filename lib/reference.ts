import type { ReferenceCourse } from '@/types/course';
import { includesNormalized, normalize } from '@/lib/text';
import { CANONICAL_VEHICULES, canonicalizeVehicule, type CanonicalVehicule } from '@/lib/vehicule';

/** Toutes les lignes de la base dont le lieu d'enlèvement correspond à `query`. */
export function matchByPickup(courses: ReferenceCourse[], query: string): ReferenceCourse[] {
  if (!query.trim()) return [];
  return courses.filter((c) => includesNormalized(c.lieuEnlevement, query));
}

/** Toutes les lignes de la base dont le lieu de livraison correspond à `query`. */
export function matchByDelivery(courses: ReferenceCourse[], query: string): ReferenceCourse[] {
  if (!query.trim()) return [];
  return courses.filter((c) => includesNormalized(c.lieuLivraison, query));
}

// Les fichiers importés ont plein de variantes du même type de course
// ("EXPRESS 2R", "2 ROUES EXPRESS A/R"...). On compare toujours après les
// avoir ramenées à l'une des 4 catégories réelles (voir lib/vehicule.ts).
export function matchesVehicule(c: ReferenceCourse, vehicule?: string): boolean {
  if (!vehicule || !vehicule.trim()) return true;
  return canonicalizeVehicule(c.vehicule) === canonicalizeVehicule(vehicule);
}

export interface VehiculeOption {
  value: string;
  count: number;
}

/**
 * Types de course réellement vus dans le lot fourni (2 ROUES EXPRESS /
 * NORMAL / PROGRAMME / URGENCE VITALE), avec leur fréquence. Les fichiers du
 * transporteur contiennent plein de variantes du même type ("EXPRESS 2R",
 * "75 - 2 ROUES NORMAL"...) : elles sont toutes ramenées à la bonne
 * catégorie avant comptage. Un type qui n'apparaît jamais dans `courses`
 * n'est pas renvoyé — passer un lot déjà filtré (ex: par lieu d'enlèvement)
 * pour ne proposer que les types pertinents pour CE trajet, pas les 4 en
 * permanence.
 */
export function listVehicules(courses: ReferenceCourse[]): VehiculeOption[] {
  const counts = new Map<string, number>();
  for (const c of courses) {
    const canon = canonicalizeVehicule(c.vehicule);
    if (!canon) continue;
    counts.set(canon, (counts.get(canon) ?? 0) + 1);
  }
  return CANONICAL_VEHICULES.filter((v) => (counts.get(v) ?? 0) > 0)
    .map((value) => ({ value, count: counts.get(value) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

export interface Suggestion {
  lieuLivraison: string;
  qteBon: number;
  count: number;
}

/**
 * À partir des courses correspondant à un lieu d'enlèvement, regroupe par
 * (lieu de livraison, quantité de bons) et trie par fréquence décroissante.
 * Permet d'afficher "cette course fait habituellement X bons vers Y".
 */
export function suggestionsForPickup(courses: ReferenceCourse[], lieuEnlevement: string, vehicule?: string): Suggestion[] {
  const matches = matchByPickup(courses, lieuEnlevement)
    .filter((c) =>
      // on ne suggère que sur une correspondance suffisamment précise, pas juste "contient"
      normalize(c.lieuEnlevement) === normalize(lieuEnlevement) || includesNormalized(c.lieuEnlevement, lieuEnlevement)
    )
    .filter((c) => matchesVehicule(c, vehicule));

  const byKey = new Map<string, Suggestion>();
  for (const c of matches) {
    const key = `${normalize(c.lieuLivraison)}|${c.qteBon}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byKey.set(key, { lieuLivraison: c.lieuLivraison, qteBon: c.qteBon, count: 1 });
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.count - a.count);
}

/**
 * Courses correspondant à la fois au lieu d'enlèvement ET au lieu de
 * livraison (si celui-ci est renseigné). Un même lieu d'enlèvement peut
 * livrer à plein d'endroits différents avec des quantités différentes: il
 * faut donc les deux lieux pour retrouver la bonne quantité.
 */
export function matchByPickupAndDelivery(
  courses: ReferenceCourse[],
  lieuEnlevement: string,
  lieuLivraison: string,
  vehicule?: string
): ReferenceCourse[] {
  let matches = matchByPickup(courses, lieuEnlevement);
  if (lieuLivraison.trim()) {
    matches = matches.filter((c) => includesNormalized(c.lieuLivraison, lieuLivraison));
  }
  if (vehicule && vehicule.trim()) {
    matches = matches.filter((c) => matchesVehicule(c, vehicule));
  }
  return matches;
}

export interface ExactMatch {
  qteBon: number;
  count: number;
  totalMatches: number;
  ambiguous: boolean; // plusieurs quantités différentes trouvées pour ce couple enlèvement/livraison
}

/**
 * Résout la quantité de bons à partir du couple (enlèvement, livraison).
 * Si plusieurs quantités différentes existent pour ce couple (rare), on
 * retient la plus fréquente et on le signale via `ambiguous`.
 */
export function resolveQte(
  courses: ReferenceCourse[],
  lieuEnlevement: string,
  lieuLivraison: string,
  vehicule?: string
): ExactMatch | null {
  const matches = matchByPickupAndDelivery(courses, lieuEnlevement, lieuLivraison, vehicule);
  if (matches.length === 0) return null;

  const counts = new Map<number, number>();
  for (const m of matches) counts.set(m.qteBon, (counts.get(m.qteBon) ?? 0) + 1);
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const [qteBon, count] = sorted[0];

  return { qteBon, count, totalMatches: matches.length, ambiguous: sorted.length > 1 };
}

export interface VehiculeMatch {
  vehicule: CanonicalVehicule;
  count: number;
  totalMatches: number;
  ambiguous: boolean; // plusieurs types différents déjà vus pour ce trajet
}

/**
 * Retrouve le type de course habituel (2 ROUES EXPRESS / NORMAL / PROGRAMME /
 * URGENCE VITALE) pour un couple enlèvement/livraison déjà vu dans la base
 * importée — comme pour les bons, pas besoin de le sélectionner à la main si
 * ce trajet a toujours été fait avec le même type.
 */
export function resolveVehicule(
  courses: ReferenceCourse[],
  lieuEnlevement: string,
  lieuLivraison: string
): VehiculeMatch | null {
  const matches = matchByPickupAndDelivery(courses, lieuEnlevement, lieuLivraison)
    .map((c) => canonicalizeVehicule(c.vehicule))
    .filter((v): v is CanonicalVehicule => v !== null);
  if (matches.length === 0) return null;

  const counts = new Map<CanonicalVehicule, number>();
  for (const v of matches) counts.set(v, (counts.get(v) ?? 0) + 1);
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const [vehicule, count] = sorted[0];

  return { vehicule, count, totalMatches: matches.length, ambiguous: sorted.length > 1 };
}

export interface RouteVehiculeOption {
  /** Valeur brute stockée en base (ex: 'BREAK EXPRESS', '2 ROUES PROGRAMME') */
  vehicule: string;
  /** Nombre de bons le plus fréquent pour ce type sur ce trajet */
  qteBon: number;
  /** Nombre total de courses de référence correspondantes */
  count: number;
}

/**
 * Retourne les types de course disponibles pour un trajet enlèvement→livraison,
 * avec le nombre de bons associé à chaque type.
 * Utilisé pour afficher des chips dynamiques dans la saisie dès que les deux
 * adresses sont renseignées, à la place d'un sélecteur statique.
 */
export function listVehiculesForRoute(
  courses: ReferenceCourse[],
  lieuEnlevement: string,
  lieuLivraison: string
): RouteVehiculeOption[] {
  const matches = matchByPickupAndDelivery(courses, lieuEnlevement, lieuLivraison);
  if (matches.length === 0) return [];

  // Grouper par vehicule (valeur brute), compter les occurrences de chaque qteBon
  const byVehicule = new Map<string, Map<number, number>>();
  for (const c of matches) {
    const veh = (c.vehicule ?? '').trim();
    if (!veh) continue;
    if (!byVehicule.has(veh)) byVehicule.set(veh, new Map());
    const qteCounts = byVehicule.get(veh)!;
    qteCounts.set(c.qteBon, (qteCounts.get(c.qteBon) ?? 0) + 1);
  }

  const result: RouteVehiculeOption[] = [];
  for (const [vehicule, qteCounts] of byVehicule) {
    const sorted = Array.from(qteCounts.entries()).sort((a, b) => b[1] - a[1]);
    const totalCount = Array.from(qteCounts.values()).reduce((s, v) => s + v, 0);
    result.push({ vehicule, qteBon: sorted[0][0], count: totalCount });
  }

  // Trier par nombre de bons croissant (course la moins chère d'abord)
  return result.sort((a, b) => a.qteBon - b.qteBon);
}

export interface BidirectionalMatch extends ExactMatch {
  /** true si le match trouvé est dans le sens inverse (livraison→enlèvement) */
  reversed: boolean;
}

/**
 * Comme `resolveQte` mais cherche dans les deux sens :
 * d'abord A→B, puis B→A si aucun résultat.
 * Utile quand l'utilisateur saisit la livraison en premier.
 */
export function resolveQteBidirectional(
  courses: ReferenceCourse[],
  lieuEnlevement: string,
  lieuLivraison: string,
  vehicule?: string
): BidirectionalMatch | null {
  const direct = resolveQte(courses, lieuEnlevement, lieuLivraison, vehicule);
  if (direct) return { ...direct, reversed: false };

  // Essai dans le sens inverse (B→A)
  const reversed = resolveQte(courses, lieuLivraison, lieuEnlevement, vehicule);
  if (reversed) return { ...reversed, reversed: true };

  return null;
}

/**
 * Types de course disponibles pour un trajet, en cherchant dans les deux sens.
 */
export function listVehiculesForRouteBidirectional(
  courses: ReferenceCourse[],
  lieuEnlevement: string,
  lieuLivraison: string
): { options: RouteVehiculeOption[]; reversed: boolean } {
  const direct = listVehiculesForRoute(courses, lieuEnlevement, lieuLivraison);
  if (direct.length > 0) return { options: direct, reversed: false };

  const reversed = listVehiculesForRoute(courses, lieuLivraison, lieuEnlevement);
  return { options: reversed, reversed: reversed.length > 0 };
}

export interface LocationOption {
  value: string;
  count: number;
}

/**
 * Auto-complétion: renvoie les lieux (enlèvement ou livraison) déjà vus dans
 * la base qui correspondent à ce que l'utilisateur tape, pour éviter de
 * retaper le nom en entier. Triés par fréquence (les plus courants d'abord).
 * `pool` permet de restreindre la recherche (ex: seulement les livraisons
 * déjà associées au lieu d'enlèvement en cours de saisie).
 */
export function suggestLocations(
  pool: ReferenceCourse[],
  field: 'lieuEnlevement' | 'lieuLivraison',
  query: string,
  limit = 6
): LocationOption[] {
  const q = query.trim();
  const counts = new Map<string, LocationOption>();
  for (const c of pool) {
    const v = (c[field] ?? '').trim();
    if (!v) continue;
    if (q && !includesNormalized(v, q)) continue;
    const key = normalize(v);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { value: v, count: 1 });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}

