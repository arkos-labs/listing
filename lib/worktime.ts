import type { WorkSession } from '@/types/worksession';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function durationHours(session: WorkSession, now: Date): number {
  const start = new Date(session.startTime);
  const end = session.endTime ? new Date(session.endTime) : now;
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
}

export interface WorkTotals {
  jour: number; // heures travaillées aujourd'hui
  mois: number; // heures travaillées ce mois
  open: WorkSession | null; // session en cours, si il y en a une
}

/**
 * Une session est comptée sur le jour/mois de son démarrage.
 * La session ouverte (endTime null) compte son temps jusqu'à maintenant.
 * Si une session ouverte a démarré hier (passage minuit), on comptabilise
 * quand même le temps depuis minuit aujourd'hui pour le total du jour.
 */
export function computeWorkTotals(sessions: WorkSession[]): WorkTotals {
  const now = new Date();

  // Minuit aujourd'hui
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  // Premier jour du mois courant
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  let jour = 0;
  let mois = 0;
  let open: WorkSession | null = null;

  for (const s of sessions) {
    if (s.endTime === null) open = s;

    const start = new Date(s.startTime);
    const end = s.endTime ? new Date(s.endTime) : now;

    // Contribution au mois
    if (start < now && end > monthStart) {
      const effectiveStart = start < monthStart ? monthStart : start;
      const effectiveEnd = end > now ? now : end;
      mois += Math.max(0, (effectiveEnd.getTime() - effectiveStart.getTime()) / 3_600_000);
    }

    // Contribution au jour (compte même si session démarrée hier et toujours ouverte)
    if (start < now && end > todayMidnight) {
      const effectiveStart = start < todayMidnight ? todayMidnight : start;
      const effectiveEnd = end > now ? now : end;
      jour += Math.max(0, (effectiveEnd.getTime() - effectiveStart.getTime()) / 3_600_000);
    }
  }

  return { jour, mois, open };
}

/** Affiche une durée en heures décimales sous la forme "6h32". */
export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}
