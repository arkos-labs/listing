/** Une dépense d'essence, saisie manuellement. */
export interface FuelExpense {
  id: string;
  date: string; // ISO string
  montant: number; // €
}

export type FuelExpenseInput = Omit<FuelExpense, 'id' | 'date'>;

export interface FuelTotals {
  jour: number;
  mois: number;
  annee: number;
}
