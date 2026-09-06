import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { FuelExpense, FuelExpenseInput, FuelTotals } from '@/types/fuel';
import { computeFuelTotals } from '@/lib/fuel';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const toYearMonth = (iso: string) => iso.slice(0, 7);

interface FuelContextValue {
  expenses: FuelExpense[];
  totals: FuelTotals;
  loading: boolean;
  add: (input: FuelExpenseInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const FuelContext = createContext<FuelContextValue | undefined>(undefined);

export function FuelProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<FuelExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('fuel_expenses')
        .select('*')
        .eq('driver_id', user.id)
        .order('date', { ascending: false });

      const mapped: FuelExpense[] = (data ?? []).map((r) => ({
        id: r.id,
        date: r.date,
        montant: r.montant,
      }));
      setExpenses(mapped);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (input: FuelExpenseInput) => {
    if (!user) return;
    const date = new Date().toISOString().slice(0, 10);
    await supabase.from('fuel_expenses').insert({
      driver_id: user.id,
      date,
      montant: input.montant,
      month_year: toYearMonth(date),
      is_locked: false,
    });
    await refresh();
  }, [user, refresh]);

  const remove = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('fuel_expenses').delete().eq('id', id).eq('driver_id', user.id);
    await refresh();
  }, [user, refresh]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase.from('fuel_expenses').delete().eq('driver_id', user.id).eq('is_locked', false);
    await refresh();
  }, [user, refresh]);

  const totals = computeFuelTotals(expenses);

  return (
    <FuelContext.Provider value={{ expenses, totals, loading, add, remove, clearAll, refresh }}>
      {children}
    </FuelContext.Provider>
  );
}

export function useFuel() {
  const ctx = useContext(FuelContext);
  if (!ctx) throw new Error('useFuel must be used within FuelProvider');
  return ctx;
}
