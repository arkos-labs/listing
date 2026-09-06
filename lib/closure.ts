import type { Course } from '@/types/course';
import type { FuelExpense } from '@/types/fuel';
import type { MotoExpense } from '@/types/moto';
import type { WorkSession } from '@/types/worksession';
import type { KmEntry } from '@/types/kmEntry';
import type { MonthClosureInput } from '@/types/closure';
import { round2 } from '@/lib/kpi';

export function yearMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabelFromKey(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Construit la photo d'un mois donné (yearMonth = "2026-07") */
export function buildMonthClosure(
  ym: string,
  courses: Course[],
  fuelExpenses: FuelExpense[],
  motoExpenses: MotoExpense[],
  workSessions: WorkSession[] = [],
  kmEntries: KmEntry[] = [],
): MonthClosureInput {
  let ca = 0, bons = 0, coursesCount = 0;
  for (const c of courses) {
    if (yearMonthKey(new Date(c.dateSaisie)) === ym) {
      ca += c.montantAchat; bons += c.qteBon; coursesCount++;
    }
  }
  let essence = 0;
  for (const e of fuelExpenses) {
    if (yearMonthKey(new Date(e.date)) === ym) essence += e.montant;
  }
  let moto = 0;
  for (const m of motoExpenses) {
    if (yearMonthKey(new Date(m.date)) === ym) moto += m.montant;
  }
  // Heures travaillées : somme des sessions dont le démarrage est dans ce mois
  let heuresTravail = 0;
  for (const s of workSessions) {
    if (yearMonthKey(new Date(s.startTime)) !== ym) continue;
    const start = new Date(s.startTime).getTime();
    const end = s.endTime ? new Date(s.endTime).getTime() : Date.now();
    heuresTravail += Math.max(0, (end - start) / 3_600_000);
  }
  // Km parcourus
  let km = 0;
  for (const k of kmEntries) {
    if (yearMonthKey(new Date(k.date)) === ym) km += k.km;
  }

  const net = round2(ca - essence - moto);
  const tauxHoraire = heuresTravail > 0 ? round2(ca / heuresTravail) : 0;

  return {
    yearMonth: ym,
    label: monthLabelFromKey(ym),
    courses: coursesCount,
    bons: round2(bons),
    ca: round2(ca),
    essence: round2(essence),
    moto: round2(moto),
    net,
    heuresTravail: round2(heuresTravail),
    tauxHoraire,
    km: round2(km),
  };
}

/** Construit la photo du mois en cours (raccourci) */
export function buildCurrentMonthClosure(
  courses: Course[],
  fuelExpenses: FuelExpense[],
  motoExpenses: MotoExpense[],
  workSessions: WorkSession[] = [],
  kmEntries: KmEntry[] = [],
): MonthClosureInput {
  return buildMonthClosure(yearMonthKey(new Date()), courses, fuelExpenses, motoExpenses, workSessions, kmEntries);
}
