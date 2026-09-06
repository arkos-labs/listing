/** Un mois clôturé : photo figée des totaux de ce mois-là, conservée définitivement. */
export interface MonthClosure {
  id: string;
  yearMonth: string;   // "2026-07"
  label: string;       // "Juillet 2026"
  courses: number;
  bons: number;
  ca: number;
  essence: number;
  moto: number;
  net: number;         // ca - essence - moto
  heuresTravail: number; // heures travaillées ce mois
  tauxHoraire: number;   // ca / heuresTravail (0 si pas de travail)
  km: number;            // km parcourus ce mois
  closedAt: string;    // ISO
}

export type MonthClosureInput = Omit<MonthClosure, 'id' | 'closedAt'>;
