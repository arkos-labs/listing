import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Course, CourseInput, DashboardKpi } from '@/types/course';
import { computeKpi } from '@/lib/kpi';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const toYearMonth = (iso: string) => iso.slice(0, 7); // "2026-07"

interface CoursesContextValue {
  courses: Course[];
  kpi: DashboardKpi;
  loading: boolean;
  error: string | null;
  add: (input: CourseInput) => Promise<void>;
  importMany: (inputs: CourseInput[]) => Promise<number>;
  remove: (id: string) => Promise<void>;
  update: (id: string, updates: Partial<Course>) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CoursesContext = createContext<CoursesContextValue | undefined>(undefined);

export function CoursesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error: err } = await supabase
        .from('courses')
        .select('*')
        .eq('driver_id', user.id)
        .order('date_saisie', { ascending: false });

      if (err) throw err;

      const mapped: Course[] = (data ?? []).map((r) => ({
        id: r.id,
        dateSaisie: r.date_saisie,
        lieuEnlevement: r.lieu_enlevement,
        lieuLivraison: r.lieu_livraison,
        qteBon: r.qte_bon,
        montantAchat: r.montant_achat,
        vehicule: r.vehicule ?? undefined,
        domaine: r.domaine ?? undefined,
        optimise: r.optimise ?? false,
      }));

      setCourses(mapped);
      setError(null);
    } catch (e) {
      setError('Impossible de charger les courses.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (input: CourseInput) => {
    if (!user) return;
    const now = new Date().toISOString();
    const row = {
      driver_id: user.id,
      date_saisie: now,
      lieu_enlevement: input.lieuEnlevement,
      lieu_livraison: input.lieuLivraison,
      qte_bon: input.qteBon,
      montant_achat: input.montantAchat,
      vehicule: input.vehicule ?? null,
      domaine: input.domaine ?? null,
      optimise: input.optimise ?? false,
      month_year: toYearMonth(now),
      is_locked: false,
    };
    const { data, error: err } = await supabase.from('courses').insert(row).select('id').single();
    if (err) throw err;
    // Optimistic: ajouter localement sans re-fetch
    const newCourse: Course = {
      id: data.id,
      dateSaisie: now,
      lieuEnlevement: input.lieuEnlevement,
      lieuLivraison: input.lieuLivraison,
      qteBon: input.qteBon,
      montantAchat: input.montantAchat,
      vehicule: input.vehicule,
      domaine: input.domaine,
      optimise: input.optimise ?? false,
    };
    setCourses((prev) => [newCourse, ...prev]);
  }, [user]);

  const importMany = useCallback(async (inputs: CourseInput[]) => {
    if (!user || inputs.length === 0) return 0;
    const now = new Date().toISOString();
    const month_year = toYearMonth(now);
    const rows = inputs.map((input) => ({
      driver_id: user.id,
      date_saisie: now,
      lieu_enlevement: input.lieuEnlevement,
      lieu_livraison: input.lieuLivraison,
      qte_bon: input.qteBon,
      montant_achat: input.montantAchat,
      vehicule: input.vehicule ?? null,
      domaine: input.domaine ?? null,
      month_year,
      is_locked: false,
    }));
    const { data, error: err } = await supabase.from('courses').insert(rows).select('id');
    if (err) throw err;
    // Optimistic: ajouter localement sans re-fetch
    const newCourses: Course[] = inputs.map((input, i) => ({
      id: data![i].id,
      dateSaisie: now,
      lieuEnlevement: input.lieuEnlevement,
      lieuLivraison: input.lieuLivraison,
      qteBon: input.qteBon,
      montantAchat: input.montantAchat,
      vehicule: input.vehicule,
      domaine: input.domaine,
      optimise: false,
    }));
    setCourses((prev) => [...newCourses, ...prev]);
    return data?.length ?? 0;
  }, [user]);

  const remove = useCallback(async (id: string) => {
    if (!user) return;
    // Optimistic: supprimer localement immédiatement
    setCourses((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('courses').delete().eq('id', id).eq('driver_id', user.id);
  }, [user]);

  const update = useCallback(async (id: string, updates: Partial<Course>) => {
    if (!user) return;
    // Optimistic: mettre à jour localement immédiatement
    setCourses((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
    const patch: Record<string, unknown> = {};
    if (updates.lieuEnlevement !== undefined) patch.lieu_enlevement = updates.lieuEnlevement;
    if (updates.lieuLivraison !== undefined) patch.lieu_livraison = updates.lieuLivraison;
    if (updates.qteBon !== undefined) patch.qte_bon = updates.qteBon;
    if (updates.montantAchat !== undefined) patch.montant_achat = updates.montantAchat;
    if (updates.vehicule !== undefined) patch.vehicule = updates.vehicule;
    if (updates.domaine !== undefined) patch.domaine = updates.domaine;
    await supabase.from('courses').update(patch).eq('id', id).eq('driver_id', user.id);
  }, [user]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase.from('courses').delete().eq('driver_id', user.id).eq('is_locked', false);
    // Après clearAll, on fait un vrai refresh car on ne sait pas quelles courses sont locked
    await refresh();
  }, [user, refresh]);

  const kpi = useMemo(() => computeKpi(courses), [courses]);

  return (
    <CoursesContext.Provider value={{ courses, kpi, loading, error, add, importMany, remove, update, clearAll, refresh }}>
      {children}
    </CoursesContext.Provider>
  );
}

export function useCourses() {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error('useCourses must be used within CoursesProvider');
  return ctx;
}
