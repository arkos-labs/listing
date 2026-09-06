import type { Course, DashboardKpi } from '@/types/course';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function computeKpi(courses: Course[]): DashboardKpi {
  const now = new Date();
  let coursesJour = 0;
  let caJour = 0;
  let caMois = 0;
  let bonsJour = 0;
  let bonsMois = 0;

  for (const c of courses) {
    const d = new Date(c.dateSaisie);
    const ca = c.montantAchat;
    if (isSameDay(d, now)) {
      coursesJour += 1;
      caJour += ca;
      bonsJour += c.qteBon;
    }
    if (isSameMonth(d, now)) {
      caMois += ca;
      bonsMois += c.qteBon;
    }
  }

  return {
    coursesJour,
    caJour: round2(caJour),
    caMois: round2(caMois),
    totalCourses: courses.length,
    bonsJour: round2(bonsJour),
    bonsMois: round2(bonsMois),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(n);
}

/** Affiche une quantité de bons à la française (virgule), sans décimales inutiles. */
export function formatQte(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toString().replace('.', ',');
}
