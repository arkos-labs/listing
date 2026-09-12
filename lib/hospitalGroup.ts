/**
 * Regroupement d'AFFICHAGE des lieux par hôpital (ex: "MONDOR EFS", "MONDOR
 * PHARMACIE", "HENRI-MONDOR CENTRE DE TRI" → tous rattachés à "MONDOR").
 *
 * ⚠️ Ceci ne modifie JAMAIS les tarifs : chaque ReferenceCourse garde son
 * lieuEnlevement/lieuLivraison exact et son propre qteBon. Ça sert uniquement
 * à regrouper visuellement les résultats de recherche sous un même hôpital
 * (voir app/(tabs)/base.tsx), pour éviter d'avoir une ligne par service.
 */

import { normalize } from '@/lib/text';

/** Noms d'hôpitaux connus, du plus spécifique au plus générique (ordre important). */
const HOSPITALS: string[] = [
  'ROBERT DEBRE', 'SAINT ANTOINE', 'ST ANTOINE', 'ST-ANTOINE',
  'ANTOINE BECLERE', 'RAYMOND POINCARE', 'LOUIS MOURIER', 'PAUL BROUSSE',
  'JEAN VERDIER', 'CHARLES FOIX', 'VAL DE GRACE', 'SAINTE ANNE',
  'MAISON BLANCHE', 'RENE HUGUENIN', 'FERNAND WIDAL', 'GOREN BEAUMONT',
  'GEORGES CLEMENCEAU', 'ALBERT CHENEVIER', 'EMILE ROUX', 'AMBROISE PARE',
  'HOPITAL FOCH', 'SAINT LOUIS', 'ST-LOUIS', 'ST LOUIS',
  'SAINT JOSEPH', 'ST JOSEPH', 'SAINT MICHEL', 'MONT VALERIEN',
  'KREMLIN BICETRE', 'HAUTEVILLE',
  'JOFFRE DUPUYTREN', 'CLINIQUE DU BOIS D AMOUR',
  'MONDOR', 'BICETRE', 'TENON', 'COCHIN', 'BICHAT', 'NECKER', 'TROUSSEAU',
  'BEAUJON', 'POISSY', 'FOCH', 'PERCY', 'BEGIN', 'ROTHSCHILD', 'AVICENNE',
  'LARIBOISIERE', 'PITIE', 'SALPETRIERE', 'HEGP', 'CUSTINE',
  'CURIE', 'NANTERRE', 'ARGENTEUIL', 'MELUN', 'VERSAILLES', 'PONTOISE',
  'EVRY', 'GARCHES', 'IGR', 'GUSTAVE ROUSSY', 'MIGNOT', 'BECLERE',
  'EMILE ROUX', 'BROUSSE', 'DEBRE',
].sort((a, b) => b.length - a.length);

const HOSPITALS_NORM = HOSPITALS.map((h) => ({ raw: h, norm: normalize(h) }));

const NOISE_PREFIXES: RegExp[] = [
  /^retour\s+/,
  /^courbe\s*\/?\s*temp\s*\/?\s*/,
  /^courbe\s*\/?\s*/,
  /^\+\s*/,
  /^\d+[-–]\s*/,
  /^\*\s*/,
];

function stripPostal(s: string): string {
  return s.replace(/\s*-\s*\d{5}.*$/, '').trim();
}

/**
 * Détecte l'hôpital "canonique" contenu dans un lieu brut, ou null si aucun
 * hôpital connu n'y figure (ex: adresse privée, clinique non répertoriée...).
 */
export function detectHospital(rawLieu: string | undefined | null): string | null {
  if (!rawLieu) return null;
  let s = normalize(stripPostal(rawLieu));
  for (const re of NOISE_PREFIXES) s = s.replace(re, '');
  s = s.trim();
  for (const h of HOSPITALS_NORM) {
    if (s.includes(h.norm)) return h.raw;
  }
  return null;
}

/**
 * Si la requête de recherche correspond à un hôpital connu (ou en est une
 * variante), retourne son nom canonique — sinon null (pas de regroupement).
 */
export function matchHospitalQuery(query: string): string | null {
  const q = normalize(query);
  if (!q) return null;
  for (const h of HOSPITALS_NORM) {
    if (q.includes(h.norm) || h.norm.includes(q)) return h.raw;
  }
  return null;
}
