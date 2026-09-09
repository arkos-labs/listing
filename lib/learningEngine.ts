// lib/learningEngine.ts
// Apprentissage léger : stocke les stats journalières et calcule les habitudes
// de l'utilisateur pour personnaliser les messages de motivation.
// 100% local (AsyncStorage), pas de réseau, pas d'IA externe.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'listing_learning_v1';
const MAX_DAYS = 60; // on garde 60 jours de données

export interface DaySnapshot {
  dateIso: string;     // "2026-09-09"
  dayOfWeek: number;   // 0=dim, 1=lun … 6=sam
  bonsTotal: number;   // bons ce jour-là au final
  firstHour: number;   // heure de la 1ère course (0-23)
  coursesCount: number;
}

export interface HourSnapshot {
  dateIso: string;
  hour: number;
  bonsAtHour: number; // bons cumulés à cette heure-là
}

interface LearningData {
  days: DaySnapshot[];
  hours: HourSnapshot[];
}

// ── Lecture / écriture ──────────────────────────────────────────────────────

async function load(): Promise<LearningData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { days: [], hours: [] };
}

async function save(data: LearningData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

// ── API publique ────────────────────────────────────────────────────────────

/**
 * Appelé à chaque ajout de course.
 * Met à jour le snapshot du jour courant.
 */
export async function recordCourseAdded(
  bonsJour: number,
  coursesJour: number,
  heureActuelle: number,
  isFirstToday: boolean
): Promise<void> {
  const data = await load();
  const today = new Date();
  const dateIso = today.toISOString().slice(0, 10);
  const dayOfWeek = today.getDay();

  // Mettre à jour ou créer le snapshot du jour
  const existingDay = data.days.find((d) => d.dateIso === dateIso);
  if (existingDay) {
    existingDay.bonsTotal = bonsJour;
    existingDay.coursesCount = coursesJour;
  } else {
    data.days.push({ dateIso, dayOfWeek, bonsTotal: bonsJour, firstHour: heureActuelle, coursesCount: coursesJour });
    // Garder seulement MAX_DAYS
    if (data.days.length > MAX_DAYS) {
      data.days = data.days.slice(-MAX_DAYS);
    }
  }

  // Snapshot horaire — un par heure par jour
  const existingHour = data.hours.find((h) => h.dateIso === dateIso && h.hour === heureActuelle);
  if (existingHour) {
    existingHour.bonsAtHour = bonsJour;
  } else {
    data.hours.push({ dateIso, hour: heureActuelle, bonsAtHour: bonsJour });
    if (data.hours.length > MAX_DAYS * 14) {
      data.hours = data.hours.slice(-(MAX_DAYS * 14));
    }
  }

  await save(data);
}

export interface UserHabits {
  /** Moyenne de bons à cette heure-ci (sur les jours similaires) */
  avgBonsAtThisHour: number | null;
  /** Moyenne de bons ce jour de la semaine */
  avgBonsByDayOfWeek: number | null;
  /** Heure de début habituelle (median) */
  usualStartHour: number | null;
  /** Nombre de jours de données disponibles */
  dataPoints: number;
}

/**
 * Calcule les habitudes de l'utilisateur à partir des données stockées.
 * Retourne null si pas assez de données (< 5 jours).
 */
export async function getUserHabits(
  heureActuelle: number,
  dayOfWeek: number
): Promise<UserHabits | null> {
  const data = await load();
  if (data.days.length < 5) return null; // pas assez de données

  // Moyenne de bons à cette heure (± 1h) sur les 30 derniers jours
  const recentDays = new Set(data.days.slice(-30).map((d) => d.dateIso));
  const hourMatches = data.hours.filter(
    (h) => recentDays.has(h.dateIso) && Math.abs(h.hour - heureActuelle) <= 1
  );
  const avgBonsAtThisHour = hourMatches.length >= 3
    ? hourMatches.reduce((s, h) => s + h.bonsAtHour, 0) / hourMatches.length
    : null;

  // Moyenne de bons ce jour de la semaine (sur 60 jours)
  const sameDayData = data.days.filter((d) => d.dayOfWeek === dayOfWeek && d.bonsTotal > 0);
  const avgBonsByDayOfWeek = sameDayData.length >= 3
    ? sameDayData.reduce((s, d) => s + d.bonsTotal, 0) / sameDayData.length
    : null;

  // Heure de début habituelle (médiane)
  const startHours = data.days.filter((d) => d.firstHour != null).map((d) => d.firstHour).sort((a, b) => a - b);
  const usualStartHour = startHours.length >= 5
    ? startHours[Math.floor(startHours.length / 2)]
    : null;

  return {
    avgBonsAtThisHour: avgBonsAtThisHour ? Math.round(avgBonsAtThisHour * 10) / 10 : null,
    avgBonsByDayOfWeek: avgBonsByDayOfWeek ? Math.round(avgBonsByDayOfWeek * 10) / 10 : null,
    usualStartHour,
    dataPoints: data.days.length,
  };
}
