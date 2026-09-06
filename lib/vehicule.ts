import { normalize } from '@/lib/text';

/**
 * Les fichiers du transporteur contiennent plein de variantes du même type de
 * course ("EXPRESS 2R", "2 ROUES EXPRESS A/R", "75 - 2 ROUES NORMAL",
 * "2 ROUES EXPRESS DIMANCHE ET JF"...). En réalité il n'y a que 4 types qui
 * comptent pour les courses en 2 roues : EXPRESS, NORMAL, PROGRAMME et
 * URGENCE VITALE. Les courses "4 ROUES" / "BREAK" (voiture) ne concernent pas
 * ces catégories et sont ignorées ici.
 */
export const CANONICAL_VEHICULES = [
  '2 ROUES EXPRESS',
  '2 ROUES URGENCE VITALE',
  '2 ROUES NORMAL',
  '2 ROUES PROGRAMME',
  '2 ROUES ALLER-RETOUR',
  'SUIVEUSE',
  'NUIT',
  'BREAK / 4 ROUES',
] as const;

export type CanonicalVehicule = (typeof CANONICAL_VEHICULES)[number];

/**
 * Ramène un libellé brut à l'une des catégories ci-dessus. Renvoie `null`
 * pour les courses en 4 roues/break ou tout libellé non reconnu.
 */
export function canonicalizeVehicule(raw: string | undefined | null): CanonicalVehicule | null {
  if (!raw || !raw.trim()) return null;
  const n = normalize(raw);

  if (/4\s*roues|break/.test(n)) return 'BREAK / 4 ROUES';
  if (/suiv/.test(n)) return 'SUIVEUSE';
  if (/nuit/.test(n)) return 'NUIT';
  if (/urgence|vital/.test(n)) return '2 ROUES URGENCE VITALE';
  if (/aller|retour|a\/r/.test(n)) return '2 ROUES ALLER-RETOUR';
  if (/programme?/.test(n)) return '2 ROUES PROGRAMME';
  if (/express/.test(n)) return '2 ROUES EXPRESS';
  if (/normal/.test(n)) return '2 ROUES NORMAL';
  return null;
}
