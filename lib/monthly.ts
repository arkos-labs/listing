import type { Course } from '@/types/course';
import type { FuelExpense } from '@/types/fuel';
import type { MotoExpense } from '@/types/moto';
import type { MonthStats } from '@/types/monthly';
import { round2 } from '@/lib/kpi';

function yearMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(d: Date): string {
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Regroupe automatiquement courses, essence et frais moto par mois (aucune
 * action manuelle requise) pour savoir, pour chaque mois où il y a eu de
 * l'activité, combien a été gagné et dépensé. Trié du plus récent au plus
 * ancien. Ne fonctionne que sur les données encore présentes dans l'appli
 * (si l'historique d'un mois est vidé, seule une clôture manuelle en garde
 * la trace).
 */
export function computeMonthlyStats(courses: Course[], fuel: FuelExpense[], moto: MotoExpense[]): MonthStats[] {
  const map = new Map<string, MonthStats>();

  const ensure = (d: Date): MonthStats => {
    const key = yearMonthKey(d);
    let s = map.get(key);
    if (!s) {
      s = { yearMonth: key, label: monthLabel(d), courses: 0, bons: 0, ca: 0, essence: 0, moto: 0, net: 0 };
      map.set(key, s);
    }
    return s;
  };

  for (const c of courses) {
    const s = ensure(new Date(c.dateSaisie));
    s.courses += 1;
    s.bons += c.qteBon;
    s.ca += c.montantAchat;
  }
  for (const e of fuel) {
    ensure(new Date(e.date)).essence += e.montant;
  }
  for (const m of moto) {
    ensure(new Date(m.date)).moto += m.montant;
  }

  const stats = Array.from(map.values()).map((s) => ({
    ...s,
    bons: round2(s.bons),
    ca: round2(s.ca),
    essence: round2(s.essence),
    moto: round2(s.moto),
    net: round2(s.ca - s.essence - s.moto),
  }));

  return stats.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
}
