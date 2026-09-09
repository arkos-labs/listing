import type { Course, DashboardKpi } from '@/types/course';


export function computeKpi(courses: Course[]): DashboardKpi {
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth(), day = now.getDate();
  // Préfixe YYYY-MM-DD et YYYY-MM pour comparaison rapide sans instancier Date
  const todayPrefix = `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const monthPrefix = todayPrefix.slice(0, 7); // "YYYY-MM"

  let coursesJour = 0;
  let caJour = 0;
  let caMois = 0;
  let bonsJour = 0;
  let bonsMois = 0;

  for (const c of courses) {
    const iso = c.dateSaisie; // "2026-07-15T..."
    const ca = c.montantAchat;
    const isToday = iso.startsWith(todayPrefix);
    const isMonth = isToday || iso.startsWith(monthPrefix);
    if (isToday) {
      coursesJour += 1;
      caJour += ca;
      bonsJour += c.qteBon;
    }
    if (isMonth) {
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

const _euroFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

export function formatEuro(n: number): string {
  return _euroFmt.format(n);
}

/** Affiche une quantité de bons à la française (virgule), sans décimales inutiles. */
export function formatQte(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toString().replace('.', ',');
}
