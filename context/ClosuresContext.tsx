import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { MonthClosure } from '@/types/closure';
import { loadClosures, upsertClosure, deleteClosure, loadCourses, loadFuelExpenses, loadMotoExpenses, loadWorkSessions, loadKmEntries } from '@/lib/storage';
import { buildMonthClosure, buildCurrentMonthClosure, yearMonthKey } from '@/lib/closure';
import { scheduleSync } from '@/lib/sync';

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
    const now = new Date();
    const currentYM = yearMonthKey(now);
    const [courses, fuelExpenses, motoExpenses, workSessions, kmEntries, existingClosures] = await Promise.all([
      loadCourses(),
      loadFuelExpenses(),
      loadMotoExpenses(),
      loadWorkSessions(),
      loadKmEntries(),
      loadClosures(),
    ]);
    const closedSet = new Set(existingClosures.map((c) => c.yearMonth));

    // Collecte tous les mois passés ayant des données non clôturées
    const pastMonths = new Set<string>();
    for (const c of courses) {
      const ym = yearMonthKey(new Date(c.dateSaisie));
      if (ym < currentYM && !closedSet.has(ym)) pastMonths.add(ym);
    }
    for (const e of fuelExpenses) {
      const ym = yearMonthKey(new Date(e.date));
      if (ym < currentYM && !closedSet.has(ym)) pastMonths.add(ym);
    }
    for (const m of motoExpenses) {
      const ym = yearMonthKey(new Date(m.date));
      if (ym < currentYM && !closedSet.has(ym)) pastMonths.add(ym);
    }

    if (pastMonths.size === 0) return;

    for (const ym of pastMonths) {
      const input = buildMonthClosure(ym, courses, fuelExpenses, motoExpenses, workSessions, kmEntries);
      await upsertClosure(input);
    }
    await refresh();
    scheduleSync();
  }, [refresh]);

  useEffect(() => {
    refresh().then(() => autoClosePastMonths());
  }, [refresh, autoClosePastMonths]);

  const closeCurrentMonth = useCallback(async () => {
    const [courses, fuelExpenses, motoExpenses, workSessions, kmEntries] = await Promise.all([
      loadCourses(),
      loadFuelExpenses(),
      loadMotoExpenses(),
      loadWorkSessions(),
      loadKmEntries(),
    ]);
    const input = buildCurrentMonthClosure(courses, fuelExpenses, motoExpenses, workSessions, kmEntries);
    const closure = await upsertClosure(input);
    await refresh();
    scheduleSync();
    return closure;
  }, [refresh]);

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
