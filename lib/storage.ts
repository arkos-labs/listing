import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Course, CourseInput, ReferenceCourse, ReferenceCourseInput } from '@/types/course';
import type { FuelExpense, FuelExpenseInput } from '@/types/fuel';
import type { MotoExpense, MotoExpenseInput } from '@/types/moto';
import type { MonthClosure, MonthClosureInput } from '@/types/closure';
import type { WorkSession } from '@/types/worksession';
import type { MaintenanceReminder, MaintenanceReminderInput } from '@/types/maintenance';
import type { KmEntry, KmEntryInput } from '@/types/kmEntry';
import { generateId } from '@/lib/uuid';

const KEY = '@courses';
const REF_KEY = '@reference_courses';
const FUEL_KEY = '@fuel_expenses';
const MOTO_KEY = '@moto_expenses';
const CLOSURES_KEY = '@month_closures';
const WORK_KEY = '@work_sessions';
const MAINTENANCE_KEY = '@maintenance_reminders';
const KM_KEY = '@km_entries';

export async function loadCourses(): Promise<Course[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Course[];
  } catch {
    return [];
  }
}

async function saveCourses(courses: Course[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(courses));
}

export async function addCourse(input: CourseInput): Promise<Course> {
  const courses = await loadCourses();
  const course: Course = {
    id: generateId(),
    dateSaisie: new Date().toISOString(),
    ...input,
  };
  courses.push(course);
  await saveCourses(courses);
  return course;
}

export async function addManyCourses(inputs: CourseInput[]): Promise<number> {
  if (inputs.length === 0) return 0;
  const courses = await loadCourses();
  const now = new Date().toISOString();
  const newCourses: Course[] = inputs.map((input) => ({
    id: generateId(),
    dateSaisie: now,
    ...input,
  }));
  await saveCourses([...courses, ...newCourses]);
  return newCourses.length;
}

export async function deleteCourse(id: string): Promise<void> {
  const courses = await loadCourses();
  await saveCourses(courses.filter((c) => c.id !== id));
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<void> {
  const courses = await loadCourses();
  const index = courses.findIndex((c) => c.id === id);
  if (index !== -1) {
    courses[index] = { ...courses[index], ...updates };
    await saveCourses(courses);
  }
}

export async function clearAllCourses(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/** Remplace tout le contenu local par ce qui vient d'une restauration (ex: depuis le Pi). */
export async function replaceAllCourses(courses: Course[]): Promise<void> {
  await saveCourses(courses);
}

// ---------------------------------------------------------------------------
// Base de données de référence (import des fichiers .xls du transporteur).
// Séparée des "courses" ci-dessus: ne compte jamais comme une course du jour
// et n'entre pas dans les KPI. Sert uniquement à retrouver le nombre de bons
// d'un lieu d'enlèvement quand on saisit une course en cours.
// ---------------------------------------------------------------------------

export async function loadReferenceCourses(): Promise<ReferenceCourse[]> {
  const raw = await AsyncStorage.getItem(REF_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ReferenceCourse[];
  } catch {
    return [];
  }
}

async function saveReferenceCourses(courses: ReferenceCourse[]): Promise<void> {
  await AsyncStorage.setItem(REF_KEY, JSON.stringify(courses));
}

/**
 * Importe des lignes dans la base de référence. Dédoublonne par
 * `numeroCourse` quand disponible (un ré-import du même fichier ne crée pas
 * de doublons), sinon ajoute la ligne telle quelle.
 */
export async function importReferenceCourses(inputs: ReferenceCourseInput[]): Promise<number> {
  if (inputs.length === 0) return 0;
  const existing = await loadReferenceCourses();
  const byRef = new Map<string, ReferenceCourse>();
  for (const c of existing) {
    if (c.numeroCourse) byRef.set(c.numeroCourse, c);
  }

  const withoutRef: ReferenceCourse[] = existing.filter((c) => !c.numeroCourse);
  let added = 0;

  for (const input of inputs) {
    if (input.numeroCourse && byRef.has(input.numeroCourse)) {
      // Mise à jour de la ligne existante (même référence de course).
      byRef.set(input.numeroCourse, { ...byRef.get(input.numeroCourse)!, ...input });
      continue;
    }
    const course: ReferenceCourse = { id: generateId(), ...input };
    if (input.numeroCourse) {
      byRef.set(input.numeroCourse, course);
    } else {
      withoutRef.push(course);
    }
    added += 1;
  }

  await saveReferenceCourses([...withoutRef, ...byRef.values()]);
  return added;
}

export async function clearReferenceCourses(): Promise<void> {
  await AsyncStorage.removeItem(REF_KEY);
}

export async function replaceAllReferenceCourses(courses: ReferenceCourse[]): Promise<void> {
  await saveReferenceCourses(courses);
}

// ---------------------------------------------------------------------------
// Dépenses d'essence, saisies manuellement. Sert à calculer le total dépensé
// par jour / mois / année.
// ---------------------------------------------------------------------------

export async function loadFuelExpenses(): Promise<FuelExpense[]> {
  const raw = await AsyncStorage.getItem(FUEL_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as FuelExpense[];
  } catch {
    return [];
  }
}

async function saveFuelExpenses(expenses: FuelExpense[]): Promise<void> {
  await AsyncStorage.setItem(FUEL_KEY, JSON.stringify(expenses));
}

export async function addFuelExpense(input: FuelExpenseInput): Promise<FuelExpense> {
  const expenses = await loadFuelExpenses();
  const expense: FuelExpense = {
    id: generateId(),
    date: new Date().toISOString(),
    ...input,
  };
  expenses.push(expense);
  await saveFuelExpenses(expenses);
  return expense;
}

export async function deleteFuelExpense(id: string): Promise<void> {
  const expenses = await loadFuelExpenses();
  await saveFuelExpenses(expenses.filter((e) => e.id !== id));
}

export async function clearFuelExpenses(): Promise<void> {
  await AsyncStorage.removeItem(FUEL_KEY);
}

export async function replaceAllFuelExpenses(expenses: FuelExpense[]): Promise<void> {
  await saveFuelExpenses(expenses);
}

// ---------------------------------------------------------------------------
// Frais moto (pièces changées, réparations...), saisis manuellement.
// ---------------------------------------------------------------------------

export async function loadMotoExpenses(): Promise<MotoExpense[]> {
  const raw = await AsyncStorage.getItem(MOTO_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MotoExpense[];
  } catch {
    return [];
  }
}

async function saveMotoExpenses(expenses: MotoExpense[]): Promise<void> {
  await AsyncStorage.setItem(MOTO_KEY, JSON.stringify(expenses));
}

export async function addMotoExpense(input: MotoExpenseInput): Promise<MotoExpense> {
  const expenses = await loadMotoExpenses();
  const expense: MotoExpense = {
    id: generateId(),
    date: new Date().toISOString(),
    ...input,
  };
  expenses.push(expense);
  await saveMotoExpenses(expenses);
  return expense;
}

export async function deleteMotoExpense(id: string): Promise<void> {
  const expenses = await loadMotoExpenses();
  await saveMotoExpenses(expenses.filter((e) => e.id !== id));
}

export async function clearMotoExpenses(): Promise<void> {
  await AsyncStorage.removeItem(MOTO_KEY);
}

export async function replaceAllMotoExpenses(expenses: MotoExpense[]): Promise<void> {
  await saveMotoExpenses(expenses);
}

// ---------------------------------------------------------------------------
// Mois clôturés : photo figée des totaux d'un mois, conservée pour toujours,
// pour pouvoir s'y référer même une fois le mois suivant commencé (le
// tableau de bord ne montre que le mois EN COURS, ceci sert d'archive).
// ---------------------------------------------------------------------------

export async function loadClosures(): Promise<MonthClosure[]> {
  const raw = await AsyncStorage.getItem(CLOSURES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MonthClosure[];
  } catch {
    return [];
  }
}

async function saveClosures(closures: MonthClosure[]): Promise<void> {
  await AsyncStorage.setItem(CLOSURES_KEY, JSON.stringify(closures));
}

/**
 * Enregistre (ou remplace) la photo d'un mois, indexée par `yearMonth`. Si
 * on clôture deux fois le même mois, la dernière photo remplace la
 * précédente au lieu d'en créer une deuxième.
 */
export async function upsertClosure(input: MonthClosureInput): Promise<MonthClosure> {
  const closures = await loadClosures();
  const idx = closures.findIndex((c) => c.yearMonth === input.yearMonth);
  const closure: MonthClosure = {
    id: idx !== -1 ? closures[idx].id : generateId(),
    closedAt: new Date().toISOString(),
    ...input,
  };
  if (idx !== -1) {
    closures[idx] = closure;
  } else {
    closures.push(closure);
  }
  await saveClosures(closures);
  return closure;
}

export async function deleteClosure(id: string): Promise<void> {
  const closures = await loadClosures();
  await saveClosures(closures.filter((c) => c.id !== id));
}

export async function replaceAllClosures(closures: MonthClosure[]): Promise<void> {
  await saveClosures(closures);
}

// ---------------------------------------------------------------------------
// Temps de travail (pointeuse) : sessions avec heure de début / fin, pour
// calculer combien d'heures sont travaillées par jour / mois.
// ---------------------------------------------------------------------------

export async function loadWorkSessions(): Promise<WorkSession[]> {
  const raw = await AsyncStorage.getItem(WORK_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as WorkSession[];
  } catch {
    return [];
  }
}

async function saveWorkSessions(sessions: WorkSession[]): Promise<void> {
  await AsyncStorage.setItem(WORK_KEY, JSON.stringify(sessions));
}

/** Démarre une nouvelle session. Ferme d'abord toute session restée ouverte par erreur. */
export async function startWorkSession(): Promise<WorkSession> {
  const sessions = await loadWorkSessions();
  const now = new Date().toISOString();
  const closed = sessions.map((s) => (s.endTime === null ? { ...s, endTime: now } : s));
  const session: WorkSession = { id: generateId(), startTime: now, endTime: null };
  await saveWorkSessions([...closed, session]);
  return session;
}

export async function stopWorkSession(): Promise<void> {
  const sessions = await loadWorkSessions();
  const idx = sessions.findIndex((s) => s.endTime === null);
  if (idx === -1) return;
  sessions[idx] = { ...sessions[idx], endTime: new Date().toISOString() };
  await saveWorkSessions(sessions);
}

export async function deleteWorkSession(id: string): Promise<void> {
  const sessions = await loadWorkSessions();
  await saveWorkSessions(sessions.filter((s) => s.id !== id));
}

export async function clearWorkSessions(): Promise<void> {
  await AsyncStorage.removeItem(WORK_KEY);
}

export async function replaceAllWorkSessions(sessions: WorkSession[]): Promise<void> {
  await saveWorkSessions(sessions);
}

// ---------------------------------------------------------------------------
// Rappels d'entretien moto (vidange, pneus, chaîne...) basés sur le
// kilométrage cumulé plutôt que sur une date.
// ---------------------------------------------------------------------------

export async function loadMaintenanceReminders(): Promise<MaintenanceReminder[]> {
  const raw = await AsyncStorage.getItem(MAINTENANCE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MaintenanceReminder[];
  } catch {
    return [];
  }
}

async function saveMaintenanceReminders(items: MaintenanceReminder[]): Promise<void> {
  await AsyncStorage.setItem(MAINTENANCE_KEY, JSON.stringify(items));
}

export async function addMaintenanceReminder(input: MaintenanceReminderInput): Promise<MaintenanceReminder> {
  const items = await loadMaintenanceReminders();
  const reminder: MaintenanceReminder = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  await saveMaintenanceReminders([...items, reminder]);
  return reminder;
}

/** Marque un entretien comme fait : le compteur repart de zéro à partir du km actuel. */
export async function markMaintenanceDone(id: string, currentTotalKm: number): Promise<void> {
  const items = await loadMaintenanceReminders();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], lastKm: currentTotalKm };
  await saveMaintenanceReminders(items);
}

export async function deleteMaintenanceReminder(id: string): Promise<void> {
  const items = await loadMaintenanceReminders();
  await saveMaintenanceReminders(items.filter((i) => i.id !== id));
}

export async function clearMaintenanceReminders(): Promise<void> {
  await AsyncStorage.removeItem(MAINTENANCE_KEY);
}

export async function replaceAllMaintenanceReminders(items: MaintenanceReminder[]): Promise<void> {
  await saveMaintenanceReminders(items);
}

// ---------------------------------------------------------------------------
// Relevés de kilomètres, saisis manuellement (typiquement en fin de journée,
// un seul total plutôt qu'un km par course). Sert à calculer le total
// jour/mois/année, et le cumul global pour les rappels d'entretien.
// ---------------------------------------------------------------------------

export async function loadKmEntries(): Promise<KmEntry[]> {
  const raw = await AsyncStorage.getItem(KM_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as KmEntry[];
  } catch {
    return [];
  }
}

async function saveKmEntries(entries: KmEntry[]): Promise<void> {
  await AsyncStorage.setItem(KM_KEY, JSON.stringify(entries));
}

export async function addKmEntry(input: KmEntryInput): Promise<KmEntry> {
  const entries = await loadKmEntries();
  const entry: KmEntry = {
    id: generateId(),
    date: new Date().toISOString(),
    ...input,
  };
  entries.push(entry);
  await saveKmEntries(entries);
  return entry;
}

export async function deleteKmEntry(id: string): Promise<void> {
  const entries = await loadKmEntries();
  await saveKmEntries(entries.filter((e) => e.id !== id));
}

export async function clearKmEntries(): Promise<void> {
  await AsyncStorage.removeItem(KM_KEY);
}

export async function replaceAllKmEntries(entries: KmEntry[]): Promise<void> {
  await saveKmEntries(entries);
}
