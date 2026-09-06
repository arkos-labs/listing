/** Une session de travail (pointeuse) : début, et fin une fois terminée. */
export interface WorkSession {
  id: string;
  startTime: string; // ISO
  endTime: string | null; // null = session en cours
}

export type WorkSessionInput = Omit<WorkSession, 'id'>;
