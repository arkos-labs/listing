import type { MaintenanceReminder } from '@/types/maintenance';

export interface ReminderStatus {
  sinceLastKm: number; // km parcourus depuis le dernier entretien
  remainingKm: number; // km restants avant le prochain (0 si dépassé)
  progress: number; // 0..1
  overdue: boolean;
  dueSoon: boolean; // proche de l'échéance (>=85%) sans l'avoir dépassée
}

export function computeReminderStatus(reminder: MaintenanceReminder, totalKm: number): ReminderStatus {
  const sinceLastKm = Math.max(0, totalKm - reminder.lastKm);
  const remainingKm = Math.max(0, reminder.intervalKm - sinceLastKm);
  const progress = reminder.intervalKm > 0 ? Math.min(1, sinceLastKm / reminder.intervalKm) : 0;
  const overdue = reminder.intervalKm > 0 && sinceLastKm >= reminder.intervalKm;
  const dueSoon = !overdue && progress >= 0.85;
  return { sinceLastKm, remainingKm, progress, overdue, dueSoon };
}
