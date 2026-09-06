/**
 * Normalise un lieu brut issu d'un fichier listing transporteur.
 *
 * Corrige uniquement les VARIANTES DE NOM pour un même établissement
 * (ex: "SAINT ANTOINE" = "ST ANTOINE", "TRI ST-LOUIS" = "ST-LOUIS").
 *
 * Les services internes (MYCOBACTERIOLOGIE, PHARMACIE, EFS, BACTERIOLOGIE…)
 * sont CONSERVÉS car ils différencient les courses et font varier le prix.
 *
 * Exemples:
 *   "TRI  ST-LOUIS - 75010 PARIS"              → "ST-LOUIS - 75010 PARIS"
 *   "BICHAT MYCOBACTERIOLOGIE - 75018 PARIS 18" → "BICHAT MYCOBACTERIOLOGIE - 75018 PARIS 18"
 *   "SAINT ANTOINE EFS - 75012 PARIS 12"        → "ST ANTOINE EFS - 75012 PARIS 12"
 *   "BOISSY LOG - 94470 BOISSY SAINT LEGER"     → "BOISSY ST-LEGER - 94470 BOISSY SAINT LEGER"
 *   "LOGE ACCUEIL - CHARLES FOIX - 94200 IVRY"  → "CHARLES FOIX - 94200 IVRY SUR SEINE"
 */

type Override = [RegExp, string];

/**
 * Overrides de NOM DE LIEU uniquement — corrige les variantes orthographiques
 * ou les préfixes parasites pour qu'un même établissement ait toujours le
 * même nom en base. Ne touche PAS aux services.
 */
const MANUAL_OVERRIDES: Override[] = [
  // Centres de tri → nom de l'hôpital seul (TRI est un préfixe technique)
  [/CENTRE\s+DE\s+TRI\s+TROUSS+EAU\w*/i, 'TROUSSEAU'],
  [/CENTRE\s+DE\s+TRI\s+BICHAT\w*/i, 'BICHAT'],
  [/CENTRE\s+DE\s+TRI\s+LARIBOISIERE\w*/i, 'LARIBOISIERE'],
  [/TRI\s+(?:SAINT|ST)[\s-]+LOUIS/i, 'ST-LOUIS'],

  // ST-LOUIS : unifier l'orthographe (SAINT LOUIS / ST LOUIS → ST-LOUIS)
  [/(?:SAINT|ST)\s+LOUIS\b/i, 'ST-LOUIS'],

  // ST ANTOINE variantes d'écriture
  [/LBU\s+ST\s+ANTOINE\s+HOPITAL/i, 'ST ANTOINE'],
  [/HOPITAL\s+ST\s+ANTOINE/i, 'ST ANTOINE'],
  [/SAINT\s+ANTOINE/i, 'ST ANTOINE'],

  // Robert Debré préfixes parasites
  [/URGEB\s+ROBERT\s+DEBRE\b/i, 'ROBERT DEBRE'],
  [/ROBERT\s+DEBRE\s*\([^)]*\)/i, 'ROBERT DEBRE'],

  // Lieux avec préfixe "LOGE ACCUEIL"
  [/LOGE\s+ACCUEIL\s*-+\s*CHARLES\s+FOIX/i, 'CHARLES FOIX'],
  [/LOGE\s+ACCUEIL\s*-+\s*PITIE\b/i, 'PITIE SALPETRIERE'],

  // Divers variantes de nom
  [/ACDL\s+BEAUJON/i, 'BEAUJON'],
  [/HAUTEVILLE\s+MAISON\s+BLANCHE/i, 'MAISON BLANCHE'],
  [/RUNGIS\s*[/\\]\s*PLATEAU\s+TECHNIQUE/i, 'RUNGIS'],
  [/BOISSY\s+LOG\b/i, 'BOISSY ST-LEGER'],
  [/\+?H\s+A\s+D\b/i, 'HAD'],
  [/RATP\s+CAP\b/i, 'RATP'],
  [/RATP\s*\/\s*MRF\b/i, 'RATP'],
  [/RDS\s+CENTRE\s+BUS\b/i, 'RATP'],
  [/CAP\s+CENTRE\s+BUS\b/i, 'RATP'],
  [/GCS\s+SEQOIA\b/i, 'GCS SEQOIA'],
  [/CEGOS\s*-*\s*ISSY\b/i, 'CEGOS ISSY'],
  [/(?:INSTIT?U?T?\s+CURIE|INST\.?\s+CURIE)\b/i, 'INSTITUT CURIE'],
  [/HOPITAL\s+RENE\s+HUGUENIN/i, 'RENE HUGUENIN'],
  [/LES\s+ATELIERS\s+DE\s+VAUGIRARD/i, 'ATELIERS VAUGIRARD'],
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
