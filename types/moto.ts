/** Une dépense liée à la moto (pièce changée, réparation...), saisie manuellement. */
export interface MotoExpense {
  id: string;
  date: string; // ISO string
  piece: string; // ex: "Plaquettes de frein"
  montant: number; // €
}

export type MotoExpenseInput = Omit<MotoExpense, 'id' | 'date'>;

export interface MotoTotals {
  jour: number;
  mois: number;
  annee: number;
}
