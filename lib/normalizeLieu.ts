/**
 * Normalise un lieu brut issu d'un fichier listing transporteur.
 *
 * Fusionne tous les services d'un même hôpital vers son nom canonique
 * (ex: "BICHAT EFS", "BICHAT CDT", "CENTRE DE TRI BICHAT" → tous "BICHAT").
 *
 * Cette fusion est volontaire : sur l'historique des courses de référence
 * (voir analyse du 2026-09-11 sur reference_courses), le tarif d'une course
 * ne dépend PAS du service précisé dans le libellé — seul le type de course
 * (véhicule : EXPRESS / URGENCE VITALE / NUIT / DIMANCHE ET JF / PROGRAMME…)
 * fait varier le prix. Fusionner les services n'affecte donc pas le tarif.
 *
 * Exemples:
 *   "TRI  ST-LOUIS - 75010 PARIS"                → "ST-LOUIS - 75010 PARIS"
 *   "BICHAT EFS - 75018 PARIS 18"                → "BICHAT - 75018 PARIS 18"
 *   "SAINT ANTOINE EFS - 75012 PARIS 12"         → "ST ANTOINE - 75012 PARIS 12"
 *   "MONDOR BIOCHIMIE - 94010 CRETEIL"           → "MONDOR - 94010 CRETEIL"
 *   "COURBE MONDOR EFS - 94010 CRETEIL"          → "MONDOR - 94010 CRETEIL"
 *   "BOISSY LOG - 94470 BOISSY SAINT LEGER"      → "BOISSY ST-LEGER - 94470 BOISSY SAINT LEGER"
 *   "LOGE ACCUEIL - CHARLES FOIX - 94200 IVRY"   → "CHARLES FOIX - 94200 IVRY SUR SEINE"
 */

type Override = [RegExp, string];

/** Consomme tout le libellé (préfixes/suffixes parasites, service, etc.) jusqu'au
 *  code postal ou à la fin de chaîne, à condition qu'il contienne `matchSrc`.
 *  On n'utilise pas \b car \b gère mal les accents (É est un non-word en JS).
 */
function mergeAllPattern(matchSrc: string): RegExp {
  return new RegExp(`^[\\s\\S]*?(?:^|\\s|[-_/'".,])(?:${matchSrc})(?:\\s|[-_/'".,]|$)[\\s\\S]*?(?=\\s*[-–]\\s*\\d{5}|$)`, 'i');
}

// ---------------------------------------------------------------------------
// Henri Mondor : tous les services (y compris Biochimie) fusionnent vers
// "MONDOR". Le tarif Biochimie n'est plus distingué (confirmé 2026-09-12).
// ---------------------------------------------------------------------------
const MONDOR_OVERRIDES: Override[] = [
  [/^[\s\S]*?(?:^|\s|[-_/'".,])MONDOR(?:\s|[-_/'".,]|$)[\s\S]*?(?=\s*[-–]\s*\d{5}|$)/i, 'MONDOR'],
];

/**
 * Hôpitaux pour lesquels on a vérifié (sur l'historique réel des courses)
 * que le tarif ne dépend pas du service → fusion complète vers le nom
 * canonique. `match` peut couvrir plusieurs orthographes (ex: SAINT/ST).
 */
const HOSPITALS_MERGE_ALL: { match: string; canonical: string }[] = [
  { match: 'SAINT[\\s-]?ANTOINE|ST[\\s-]?ANTOINE', canonical: 'SAINT ANTOINE' },
  { match: 'SAINT[\\s-]?LOUIS|ST[\\s-]?LOUIS', canonical: 'ST-LOUIS' },
  { match: 'SAINT[\\s-]?JOSEPH|ST[\\s-]?JOSEPH', canonical: 'ST JOSEPH' },
  { match: '(?:ROBERT[\\s-]?)?DEBR[EÉÈ]', canonical: 'ROBERT DEBRE' },
  { match: 'ANTOINE[\\s-]?B[EÉÈ]CL[EÉÈ]RE|B[EÉÈ]CL[EÉÈ]RE(?:[\\s-]?ANTOINE)?', canonical: 'ANTOINE BECLERE' },
  { match: 'RAYMOND[\\s-]?POINCAR[EÉÈ]', canonical: 'RAYMOND POINCARE' },
  { match: 'LOUIS[\\s-]?MOURIER', canonical: 'LOUIS MOURIER' },
  { match: '(?:PAUL[\\s-]?)?BROUSSE', canonical: 'PAUL BROUSSE' },
  { match: 'JEAN[\\s-]?VERDIER', canonical: 'JEAN VERDIER' },
  { match: 'CHARLES[\\s-]?FOIX', canonical: 'CHARLES FOIX' },
  { match: 'MAISON[\\s-]?BLANCHE', canonical: 'MAISON BLANCHE' },
  { match: 'REN[EÉÈ][\\s-]?HUGUENIN', canonical: 'RENE HUGUENIN' },
  { match: 'FERNAND[\\s-]?WIDAL', canonical: 'FERNAND WIDAL' },
  { match: 'GEORGES[\\s-]?CLEMENCEAU', canonical: 'GEORGES CLEMENCEAU' },
  { match: 'ALBERT[\\s-]?CHENEVIER', canonical: 'ALBERT CHENEVIER' },
  { match: 'AMBROISE[\\s-]?PAR[EÉÈ]', canonical: 'AMBROISE PARE' },
  { match: 'FOCH', canonical: 'FOCH' },
  { match: 'COCHIN', canonical: 'COCHIN' },
  { match: 'TENON', canonical: 'TENON' },
  { match: 'TROUSS+EAU', canonical: 'TROUSSEAU' },
  { match: 'BIC[EÊÈ]TRE', canonical: 'BICETRE' },
  { match: 'BICHAT', canonical: 'BICHAT' },
  { match: 'NECKER', canonical: 'NECKER' },
  { match: 'AVICENNE', canonical: 'AVICENNE' },
  { match: 'ROTHSCHILD', canonical: 'ROTHSCHILD' },
  { match: 'PITI[EÉÈ](?:[\\s-]?SALP[EÉÊÈ]TRI[EÈ]RE)?|SALP[EÉÊÈ]TRI[EÈ]RE', canonical: 'PITIE SALPETRIERE' },
  { match: 'HEGP|GEORGES[\\s-]?POMPIDOU', canonical: 'HEGP' },
  { match: '(?:INSTIT?U?T?\\s+CURIE|INST\\.?\\s+CURIE|CURIE)', canonical: 'INSTITUT CURIE' },
  { match: 'NANTERRE', canonical: 'NANTERRE' },
  { match: 'PONTOISE', canonical: 'PONTOISE' },
  { match: 'VERSAILLES|(?:ANDR[EÉÈ][\\s-]?)?MIGNOT', canonical: 'VERSAILLES' },
  { match: 'EVRY', canonical: 'EVRY' },
  { match: 'IGR|GUSTAVE[\\s-]?ROUSSY', canonical: 'IGR' },
  { match: 'JOFFRE[\\s-]?DUPUYTREN', canonical: 'JOFFRE DUPUYTREN' },
  { match: 'BOIS[\\s-]?D[\\s\']?AMOUR', canonical: 'CLINIQUE DU BOIS D AMOUR' },
  { match: 'EMILE[\\s-]?ROUX', canonical: 'EMILE ROUX' },
  { match: 'BEAUJON', canonical: 'BEAUJON' },
  { match: 'POISSY', canonical: 'POISSY' },
  { match: 'BEGIN', canonical: 'BEGIN' },
  { match: 'ROSERAIE', canonical: 'LA ROSERAIE' },
  { match: 'MARNE[\\s-]?LA[\\s-]?VALLEE|HOPITAL PRIV[EÉÈ] MARNE LA VALLEE', canonical: 'HOPITAL PRIVE MARNE LA VALLEE' },
];

const MERGE_ALL_OVERRIDES: Override[] = HOSPITALS_MERGE_ALL.map(({ match, canonical }) => [
  mergeAllPattern(match),
  canonical,
]);

/**
 * Overrides pour des lieux NON médicaux (ou non encore vérifiés côté tarif)
 * — corrige uniquement les variantes/préfixes parasites, sans fusionner de
 * service.
 */
const MISC_OVERRIDES: Override[] = [
  [/^[\s\S]*?(?:^|\s|[-_/'".,])LARIB(?:OISI[EÈ]RE|OIERE)?[a-z]*[\s\S]*$/i, 'LARIBOISIERE - 75010 PARIS'],
  [/RUNGIS\s*[/\\]\s*PLATEAU\s+TECHNIQUE/i, 'RUNGIS'],
  [/BOISSY\s+LOG\b/i, 'BOISSY ST-LEGER'],
  [/\+?H\s+A\s+D\b/i, 'HAD'],
  [/RATP\s+CAP\b/i, 'RATP'],
  [/RATP\s*\/\s*MRF\b/i, 'RATP'],
  [/RDS\s+CENTRE\s+BUS\b/i, 'RATP'],
  [/CAP\s+CENTRE\s+BUS\b/i, 'RATP'],
  [/GCS\s+SEQOIA\b/i, 'GCS SEQOIA'],
  [/CEGOS\s*-*\s*ISSY\b/i, 'CEGOS ISSY'],
  [/LES\s+ATELIERS\s+DE\s+VAUGIRARD/i, 'ATELIERS VAUGIRARD'],
];

// Ordre : Mondor (exception Biochimie) → fusion complète des autres hôpitaux
// vérifiés → divers non-médicaux. Le premier pattern qui matche gagne.
const MANUAL_OVERRIDES: Override[] = [
  ...MONDOR_OVERRIDES,
  ...MERGE_ALL_OVERRIDES,
  ...MISC_OVERRIDES,
];

export function normalizeLieu(raw: string): string {
  let s = raw
    .trim()
    .replace(/\s*\+\s*retour\b.*/i, '') // "... + retour" → supprimé
    .replace(/^\+\s*/, '')              // +BICHAT → BICHAT
    .replace(/^\d+[-–]\s*/, '')         // 8- CURIE → CURIE
    .replace(/^\*\s*/, '')
    .trim();

  // 1. Appliquer le premier override de nom qui matche
  for (const [pat, rep] of MANUAL_OVERRIDES) {
    if (pat.test(s)) {
      s = s.replace(pat, rep);
      break;
    }
  }

  // 2. Normaliser le code postal + ville en fin de chaîne
  const postalMatch = s.match(/\s*[-–]\s*(\d{5})\s+(.+)$/);
  let namePart: string;
  let suffix: string;

  if (postalMatch && postalMatch.index !== undefined) {
    namePart = s.slice(0, postalMatch.index).trim();
    // "PARIS 10", "PARIS 14" etc. → "PARIS" (le code postal suffit)
    const city = postalMatch[2].trim().replace(/^(PARIS)\s+\d+$/i, '$1');
    suffix = ` - ${postalMatch[1]} ${city}`;
  } else {
    namePart = s;
    suffix = '';
  }

  // 3. Nettoyage minimal : espaces multiples, tirets résiduels en bout
  namePart = namePart
    .replace(/\s{2,}/g, ' ')
    .replace(/[-–/\s]+$/, '')
    .replace(/^[-–/\s]+/, '')
    .trim();

  if (!namePart) {
    namePart = raw.trim().replace(/^\+\s*/, '').replace(/^\d+[-–]\s*/, '');
  }

  return namePart + suffix;
}
