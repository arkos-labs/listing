import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { KmEntry, KmEntryInput, KmTotals } from '@/types/kmEntry';
import { computeKmTotals, computeTotalKm } from '@/lib/kmEntries';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const toYearMonth = (iso: string) => iso.slice(0, 7);

interface KmContextValue {
  entries: KmEntry[];
  totals: KmTotals;
  totalKm: number;
  loading: boolean;
  add: (input: KmEntryInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const KmContext = createContext<KmContextValue | undefined>(undefined);

export function KmProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<KmEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('km_entries')
        .select('*')
        .eq('driver_id', user.id)
        .order('date', { ascending: false });

      const mapped: KmEntry[] = (data ?? []).map((r) => ({
        id: r.id,
        date: r.date,
        km: r.km,
      }));
      setEntries(mapped);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (input: KmEntryInput) => {
    if (!user) return;
    const date = new Date().toISOString().slice(0, 10);
    await supabase.from('km_entries').insert({
      driver_id: user.id,
      date,
      km: input.km,
      month_year: toYearMonth(date),
      is_locked: false,
    });
    await refresh();
  }, [user, refresh]);

  const remove = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('km_entries').delete().eq('id', id).eq('driver_id', user.id);
    await refresh();
  }, [user, refresh]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase.from('km_entries').delete().eq('driver_id', user.id).eq('is_locked', false);
    await refresh();
  }, [user, refresh]);

  const totals = computeKmTotals(entries);
  const totalKm = computeTotalKm(entries);

  return (
    <KmContext.Provider value={{ entries, totals, totalKm, loading, add, remove, clearAll, refresh }}>
      {children}
    </KmContext.Provider>
  );
}

export function useKm() {
  const ctx = useContext(KmContext);
  if (!ctx) throw new Error('useKm must be used within KmProvider');
  return ctx;
}
