import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { WorkSession } from '@/types/worksession';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const toYearMonth = (iso: string) => iso.slice(0, 7);

interface WorkContextValue {
  sessions: WorkSession[];
  loading: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const WorkContext = createContext<WorkContextValue | undefined>(undefined);

export function WorkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('driver_id', user.id)
        .order('start_time', { ascending: false });

      const mapped: WorkSession[] = (data ?? []).map((r) => ({
        id: r.id,
        startTime: r.start_time,
        endTime: r.end_time,
      }));
      setSessions(mapped);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const start = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    
    // Fermer les sessions restées ouvertes
    const openSessions = sessions.filter(s => s.endTime === null);
    for (const s of openSessions) {
      await supabase.from('work_sessions').update({ end_time: now }).eq('id', s.id);
    }

    await supabase.from('work_sessions').insert({
      driver_id: user.id,
      start_time: now,
      end_time: null,
      month_year: toYearMonth(now),
    });
    await refresh();
  }, [user, sessions, refresh]);

  const stop = useCallback(async () => {
    if (!user) return;
    const openSession = sessions.find((s) => s.endTime === null || s.endTime === undefined);
    if (!openSession) return;

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('work_sessions')
      .update({ end_time: now })
      .eq('id', openSession.id)
      .eq('driver_id', user.id);

    if (error) {
      console.error('Erreur stop session:', error.message);
      return;
    }
    await refresh();
  }, [user, sessions, refresh]);

  const remove = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('work_sessions').delete().eq('id', id).eq('driver_id', user.id);
    await refresh();
  }, [user, refresh]);

  return (
    <WorkContext.Provider value={{ sessions, loading, start, stop, remove, refresh }}>
      {children}
    </WorkContext.Provider>
  );
}

export function useWork() {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error('useWork must be used within WorkProvider');
  return ctx;
}
