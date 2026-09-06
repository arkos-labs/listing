import type { KmEntry, KmTotals } from '@/types/kmEntry';
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

/** Total des km parcourus pour aujourd'hui / ce mois / cette année. */
export function computeKmTotals(entries: KmEntry[]): KmTotals {
  const now = new Date();
  let jour = 0;
  let mois = 0;
  let annee = 0;

  for (const e of entries) {
    const d = new Date(e.date);
    if (isSameYear(d, now)) annee += e.km;
    if (isSameMonth(d, now)) mois += e.km;
    if (isSameDay(d, now)) jour += e.km;
  }

  return { jour: round2(jour), mois: round2(mois), annee: round2(annee) };
}

/** Kilométrage total cumulé depuis le début (tous les relevés confondus) — sert aux rappels d'entretien. */
export function computeTotalKm(entries: KmEntry[]): number {
  return round2(entries.reduce((sum, e) => sum + e.km, 0));
}
