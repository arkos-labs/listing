import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { MaintenanceReminder } from '@/types/maintenance';
import {
  loadMaintenanceReminders,
  addMaintenanceReminder,
  markMaintenanceDone,
  deleteMaintenanceReminder,
} from '@/lib/storage';
import { useKm } from '@/context/KmContext';
import { scheduleSync } from '@/lib/sync';

interface MaintenanceContextValue {
  reminders: MaintenanceReminder[];
  totalKm: number;
  loading: boolean;
  add: (label: string, intervalKm: number) => Promise<void>;
  markDone: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextValue | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const { totalKm } = useKm();
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await loadMaintenanceReminders();
      setReminders(data.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (label: string, intervalKm: number) => {
      await addMaintenanceReminder({ label, intervalKm, lastKm: totalKm });
      await refresh();
      scheduleSync();
    },
    [refresh, totalKm]
  );

  const markDone = useCallback(
    async (id: string) => {
      await markMaintenanceDone(id, totalKm);
      await refresh();
      scheduleSync();
    },
    [refresh, totalKm]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteMaintenanceReminder(id);
      await refresh();
      scheduleSync();
    },
    [refresh]
  );

  return (
    <MaintenanceContext.Provider value={{ reminders, totalKm, loading, add, markDone, remove, refresh }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) throw new Error('useMaintenance must be used within MaintenanceProvider');
  return ctx;
}
