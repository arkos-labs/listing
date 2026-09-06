import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loadMonthlyGoal, saveMonthlyGoal as persistGoal, DEFAULT_MONTHLY_GOAL, loadPrixBon, savePrixBon as persistPrixBon, DEFAULT_PRIX_BON } from '@/lib/goal';

interface GoalContextValue {
  monthlyGoal: number;
  prixBon: number;
  loading: boolean;
  setMonthlyGoal: (n: number) => Promise<void>;
  setPrixBon: (n: number) => Promise<void>;
}

const GoalContext = createContext<GoalContextValue | undefined>(undefined);

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [monthlyGoal, setGoalState] = useState(DEFAULT_MONTHLY_GOAL);
  const [prixBon, setPrixBonState] = useState(DEFAULT_PRIX_BON);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadMonthlyGoal(), loadPrixBon()]).then(([g, p]) => {
      setGoalState(g);
      setPrixBonState(p);
      setLoading(false);
    });
  }, []);

  const setMonthlyGoal = useCallback(async (n: number) => {
    await persistGoal(n);
    setGoalState(n);
  }, []);

  const setPrixBon = useCallback(async (n: number) => {
    await persistPrixBon(n);
    setPrixBonState(n);
  }, []);

  return (
    <GoalContext.Provider value={{ monthlyGoal, prixBon, loading, setMonthlyGoal, setPrixBon }}>
      {children}
    </GoalContext.Provider>
  );
}

export function useGoal() {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error('useGoal must be used within GoalProvider');
  return ctx;
}
