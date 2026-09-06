/** Bilan d'un mois, calculé automatiquement à partir des données existantes. */
export interface MonthStats {
  yearMonth: string; // "2026-07"
  label: string; // "Juillet 2026"
  courses: number;
  bons: number;
  ca: number;
  essence: number;
  moto: number;
  net: number; // ca - essence - moto
}
