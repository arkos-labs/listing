import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  loadSyncConfig,
  saveSyncConfig,
  clearSyncConfig,
  checkConnection,
  pushBackup,
  fetchBackup,
  applyBackup,
  loadLastSyncResult,
  onSyncResult,
  type SyncConfig,
  type SyncResult,
} from '@/lib/sync';
import { useCourses } from '@/context/CoursesContext';
import { useReference } from '@/context/ReferenceContext';
import { useFuel } from '@/context/FuelContext';
import { useMoto } from '@/context/MotoContext';
import { useClosures } from '@/context/ClosuresContext';

interface SyncContextValue {
  config: SyncConfig | null;
  lastResult: SyncResult | null;
  syncing: boolean;
  saveConfig: (config: SyncConfig) => Promise<void>;
  removeConfig: () => Promise<void>;
  testConnection: (config: SyncConfig) => Promise<boolean>;
  syncNow: () => Promise<SyncResult>;
  restoreFromPi: () => Promise<{ ok: boolean; error?: string }>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);

  const courses = useCourses();
  const reference = useReference();
  const fuel = useFuel();
  const moto = useMoto();
  const closures = useClosures();

  useEffect(() => {
    loadSyncConfig().then(setConfig);
    loadLastSyncResult().then(setLastResult);
    return onSyncResult((result) => setLastResult(result));
  }, []);

  const saveConfig = useCallback(async (c: SyncConfig) => {
    await saveSyncConfig(c);
    setConfig(c);
  }, []);

  const removeConfig = useCallback(async () => {
    await clearSyncConfig();
    setConfig(null);
  }, []);

  const testConnection = useCallback(async (c: SyncConfig) => {
    return checkConnection(c);
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await pushBackup();
      setLastResult(result);
      return result;
    } finally {
      setSyncing(false);
    }
  }, []);

  const restoreFromPi = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetchBackup();
      if (!res.ok || !res.data) {
        return { ok: false, error: res.error || 'Aucune donnée reçue.' };
      }
      await applyBackup(res.data);
      await Promise.all([
        courses.refresh(),
        reference.refresh(),
        fuel.refresh(),
        moto.refresh(),
        closures.refresh(),
      ]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Échec de la restauration.' };
    } finally {
      setSyncing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, reference, fuel, moto, closures]);

  return (
    <SyncContext.Provider
      value={{ config, lastResult, syncing, saveConfig, removeConfig, testConnection, syncNow, restoreFromPi }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
