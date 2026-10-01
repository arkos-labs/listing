import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { MonthClosure } from '@/types/closure';
import { loadClosures, upsertClosure, deleteClosure } from '@/lib/storage';
import { buildMonthClosure, buildCurrentMonthClosure, yearMonthKey } from '@/lib/closure';
import { scheduleSync } from '@/lib/sync';
import { useCourses } from '@/context/CoursesContext';
import { useFuel } from '@/context/FuelContext';
import { useMoto } from '@/context/MotoContext';
import { useWork } from '@/context/WorkContext';
import { useKm } from '@/context/KmContext';

interface ClosuresContextValue {
  closures: MonthClosure[];
  loading: boolean;
  closeCurrentMonth: () => Promise<MonthClosure>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ClosuresContext = createContext<ClosuresContextValue | undefined>(undefined);

export function ClosuresProvider({ children }: { children: React.ReactNode }) {
  const [closures, setClosures] = useState<MonthClosure[]>([]);
  const [loading, setLoading] = useState(true);

  const { courses, loading: coursesLoading } = useCourses();
  const { expenses: fuelExpenses, loading: fuelLoading } = useFuel();
  const { expenses: motoExpenses, loading: motoLoading } = useMoto();
  const { sessions: workSessions, loading: workLoading } = useWork();
  const { entries: kmEntries, loading: kmLoading } = useKm();

  const refresh = useCallback(async () => {
    try {
      const data = await loadClosures();
      setClosures(data.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Au démarrage : clôture automatiquement tous les mois passés qui ont des
   * données mais pas encore de clôture. S'exécute silencieusement.
   */
  const autoClosePastMonths = useCallback(async () => {
    if (coursesLoading || fuelLoading || motoLoading || workLoading || kmLoading) return;

    const now = new Date();
    const currentYM = yearMonthKey(now);
    const existingClosures = await loadClosures();
    const closedSet = new Set(existingClosures.map((c) => c.yearMonth));

    // Collecte tous les mois passés ayant des données
    const pastMonths = new Set<string>();
    for (const c of courses) {
      const ym = yearMonthKey(new Date(c.dateSaisie));
      if (ym < currentYM) pastMonths.add(ym);
    }
    for (const e of fuelExpenses) {
      const ym = yearMonthKey(new Date(e.date));
      if (ym < currentYM) pastMonths.add(ym);
    }
    for (const m of motoExpenses) {
      const ym = yearMonthKey(new Date(m.date));
      if (ym < currentYM) pastMonths.add(ym);
    }

    if (pastMonths.size === 0) return;

    for (const ym of pastMonths) {
      const input = buildMonthClosure(ym, courses, fuelExpenses, motoExpenses, workSessions, kmEntries);
      await upsertClosure(input);
    }
    await refresh();
    scheduleSync();
  }, [courses, fuelExpenses, motoExpenses, workSessions, kmEntries, coursesLoading, fuelLoading, motoLoading, workLoading, kmLoading, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!coursesLoading && !fuelLoading && !motoLoading && !workLoading && !kmLoading) {
      autoClosePastMonths();
    }
  }, [coursesLoading, fuelLoading, motoLoading, workLoading, kmLoading, autoClosePastMonths]);

  const closeCurrentMonth = useCallback(async () => {
    const input = buildCurrentMonthClosure(courses, fuelExpenses, motoExpenses, workSessions, kmEntries);
    const closure = await upsertClosure(input);
    await refresh();
    scheduleSync();
    return closure;
  }, [courses, fuelExpenses, motoExpenses, workSessions, kmEntries, refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteClosure(id);
    await refresh();
    scheduleSync();
  }, [refresh]);

  return (
    <ClosuresContext.Provider value={{ closures, loading, closeCurrentMonth, remove, refresh }}>
      {children}
    </ClosuresContext.Provider>
  );
}

export function useClosures() {
  const ctx = useContext(ClosuresContext);
  if (!ctx) throw new Error('useClosures must be used within ClosuresProvider');
  return ctx;
}

