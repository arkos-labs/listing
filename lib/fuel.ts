import type { FuelExpense, FuelTotals } from '@/types/fuel';
import { round2 } from '@/lib/kpi';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isSameYear(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear();
}

/** Total des dépenses d'essence pour aujourd'hui / ce mois / cette année. */
export function computeFuelTotals(expenses: FuelExpense[]): FuelTotals {
  const now = new Date();
  let jour = 0;
  let mois = 0;
  let annee = 0;

  for (const e of expenses) {
    const d = new Date(e.date);
    if (isSameYear(d, now)) annee += e.montant;
    if (isSameMonth(d, now)) mois += e.montant;
    if (isSameDay(d, now)) jour += e.montant;
  }

  return { jour: round2(jour), mois: round2(mois), annee: round2(annee) };
}
