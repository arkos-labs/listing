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
    const ca = c.montantAchat;
    
    // Parse en date locale. Sécuriser le format pour React Native (remplacer l'espace par T)
    const dateStr = c.dateSaisie || '';
    const safeIso = dateStr.replace(' ', 'T');
    const d = new Date(safeIso);
    
    // Si la date est invalide, on fallback sur la comparaison de préfixe
    const isToday = isNaN(d.getTime()) 
      ? dateStr.startsWith(todayPrefix) 
      : (d.getFullYear() === y && d.getMonth() === mo && d.getDate() === day);
      
    const isMonth = isNaN(d.getTime())
      ? dateStr.startsWith(monthPrefix)
      : (d.getFullYear() === y && d.getMonth() === mo);
    
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
