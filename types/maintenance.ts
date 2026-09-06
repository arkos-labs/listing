/** Rappel d'entretien moto basé sur le kilométrage cumulé (ex: vidange tous les 3000 km). */
export interface MaintenanceReminder {
  id: string;
  label: string; // ex: "Vidange", "Pneus", "Chaîne"
  intervalKm: number; // tous les combien de km il faut refaire cet entretien
  lastKm: number; // kilométrage total (cumulé) au dernier entretien fait
  createdAt: string; // ISO
}

export type MaintenanceReminderInput = { label: string; intervalKm: number; lastKm: number };
