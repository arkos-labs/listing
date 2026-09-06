/**
 * Détecte automatiquement le domaine d'une course : "medical" ou "courseCourse".
 *
 * Une course est médicale si au moins un des deux lieux (enlèvement ou livraison)
 * contient un nom d'hôpital, de laboratoire ou de service de santé connu.
 */

export type Domaine = 'medical' | 'courseCourse';

/** Mots-clés et noms d'établissements médicaux. */
const MEDICAL_PATTERNS: RegExp[] = [
  // Hôpitaux AP-HP et assimilés
  /\bBICHAT\b/i,
  /\bLARIBOISIERE\b/i,
  /\bTROUSS?EAU\b/i,
  /\bPITIE\b/i,
  /\bSALPETRIERE\b/i,
  /\bST[\s-]ANTOINE\b/i,
  /\bSAINT[\s-]ANTOINE\b/i,
  /\bBEAUJON\b/i,
  /\bAVICENNE\b/i,
  /\bCOCHIN\b/i,
  /\bNECKER\b/i,
  /\bHEGP\b/i,
  /\bTENON\b/i,
  /\bST[\s-]LOUIS\b/i,
  /\bSAINT[\s-]LOUIS\b/i,
  /\bFERNAND[\s-]WIDAL\b/i,
  /\bROTHSCHILD\b/i,
  /\bROBERT[\s-]DEBR[EÉ]\b/i,
  /\bCHARLES[\s-]FOIX\b/i,
  /\bRAYMOND[\s-]POINCAR[EÉ]\b/i,
  /\bAMBROISE[\s-]PAR[EÉ]\b/i,
  /\bANTOINE[\s-]B[EÉ]CL[EÈ]RE\b/i,
  /\bLOUIS[\s-]MOURIER\b/i,
  /\bJEAN[\s-]VERDIER\b/i,
  /\bPOISSY\b/i,
  /\bGOREN[\s-]BEAUMONT\b/i,
  /\bCHAMPION\b/i,
  /\bBICETRE\b/i,
  /\bKREMLIN\b/i,
  /\bFOCH\b/i,
  /\bPERCY\b/i,
  /\bBEGIN\b/i,
  /\bVAL[\s-]DE[\s-]GR[AÂ]CE\b/i,
  /\bINSTITUT[\s-]CURIE\b/i,
  /\bREN[EÉ][\s-]HUGUENIN\b/i,
  /\bCUSTINE\b/i,
  /\bSAINTE[\s-]ANNE\b/i,
  /\bMAISON[\s-]BLANCHE\b/i,
  /\bSAINT[\s-]ESPRIT\b/i,
  /\bCHSF\b/i,           // Centre Hospitalier Sud Francilien
  /\bCLINIQUE\b/i,
  /\bSAINT[\s-]JOSEPH\b/i,
  /\bST[\s-]JOSEPH\b/i,
  /\bSAINT[\s-]MICHEL\b/i,
  /\bCENTRE[\s-]IMAGERIE\b/i,
  /\bMONT[\s-]VALERIEN\b/i,
  /\bGCS[\s-]SEQOIA\b/i,
  /\bHAD\b/i,
  // Services / structures de santé
  /\bHOPITAL\b/i,
  /\bLABOR?ATOIRE\b/i,
  /\b\bLABO\b/i,
  /\bEFS\b/i,          // Établissement Français du Sang
  /\bCNRHP\b/i,
  /\bCDT\b/i,
  /\bCeGIDD\b/i,
  /\bPHARMACIE\b/i,
  /\bURGENCES?\b/i,
  /\bMATERNITE\b/i,
  /\bANAPATH\b/i,
  /\bANATOMO[\s-]PATHOLOGIE\b/i,
  /\bHEMATOLOGIE\b/i,
  /\bBANQUE[\s-]DE[\s-]SANG\b/i,
  /\bDEPOT[\s-]DE[\s-]SANG\b/i,
  /\bTHERAPEUITQUE[\s-]CELLULAIRE\b/i,
  /\bCOLLECTE\b/i,
  /\bPRELEVEMENTS?\b/i,
  /\bREANIMATION\b/i,
  /\bBLOC[\s-]OPERATOIRE\b/i,
];

/**
 * Retourne "medical" si au moins un des deux lieux contient un mot-clé médical,
 * sinon "courseCourse".
 */
export function detectDomaine(lieuEnlevement: string, lieuLivraison: string): Domaine {
  const combined = `${lieuEnlevement} ${lieuLivraison}`;
  for (const pat of MEDICAL_PATTERNS) {
    if (pat.test(combined)) return 'medical';
  }
  return 'courseCourse';
}
