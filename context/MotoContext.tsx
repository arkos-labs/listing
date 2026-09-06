import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { MotoExpense, MotoExpenseInput, MotoTotals } from '@/types/moto';
import {
  loadMotoExpenses,
  addMotoExpense,
  deleteMotoExpense,
  clearMotoExpenses,
} from '@/lib/storage';
import { computeMotoTotals } from '@/lib/moto';
import { scheduleSync } from '@/lib/sync';

interface MotoContextValue {
  expenses: MotoExpense[];
  totals: MotoTotals;
  loading: boolean;
  add: (input: MotoExpenseInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const MotoContext = createContext<MotoContextValue | undefined>(undefined);

export function MotoProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<MotoExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await loadMotoExpenses();
      setExpenses(data.sort((a, b) => b.date.localeCompare(a.date)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async (input: MotoExpenseInput) => {
    await addMotoExpense(input);
    await refresh();
    scheduleSync();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteMotoExpense(id);
    await refresh();
    scheduleSync();
  }, [refresh]);

  const clearAll = useCallback(async () => {
    await clearMotoExpenses();
    await refresh();
    scheduleSync();
  }, [refresh]);

  const totals = computeMotoTotals(expenses);

  return (
    <MotoContext.Provider value={{ expenses, totals, loading, add, remove, clearAll, refresh }}>
      {children}
    </MotoContext.Provider>
  );
}

export function useMoto() {
  const ctx = useContext(MotoContext);
  if (!ctx) throw new Error('useMoto must be used within MotoProvider');
  return ctx;
}
