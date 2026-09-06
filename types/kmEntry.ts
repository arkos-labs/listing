/** Un relevé de kilomètres, saisi manuellement (ex: en fin de journée). */
export interface KmEntry {
  id: string;
  date: string; // ISO string
  km: number;
}

export type KmEntryInput = Omit<KmEntry, 'id' | 'date'>;

export interface KmTotals {
  jour: number;
  mois: number;
  annee: number;
}
