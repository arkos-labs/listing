/**
 * ListingNotificationsContext.tsx
 *
 * Notifications "un listing a été ajouté", visibles par TOUS les
 * utilisateurs (pas seulement celles/ceux connectés au moment de l'import),
 * avec un suivi individuel de lecture : une notification reste visible pour
 * un utilisateur tant qu'il ne l'a pas explicitement vue (pas d'expiration
 * automatique après 24h — au contraire, elle reste au-delà si non vue).
 *
 * La création de la notification (après un import réussi) se fait dans
 * ReferenceContext.importFiles ; ce contexte-ci ne fait que lire l'état
 * "vu / pas vu" pour l'utilisateur courant et l'exposer à l'UI.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface ListingNotification {
  id: string;
  createdAt: string;
  courseCount: number;
  createdBy: string | null;
}

interface ListingNotificationsContextValue {
  /** Notifications pas encore vues par l'utilisateur courant, plus récentes en premier. */
  unseenNotifications: ListingNotification[];
  /** Somme des courses ajoutées sur toutes les notifications pas encore vues. */
  totalUnseenCourseCount: number;
  /** Marque toutes les notifications actuellement non vues comme vues. */
  markAllSeen: () => Promise<void>;
}

const ListingNotificationsContext = createContext<ListingNotificationsContextValue | undefined>(undefined);

// On ne recharge que les notifications récentes : au-delà, si un utilisateur
// n'a pas ouvert l'app depuis des semaines, on ne fait pas remonter tout
// l'historique — seulement un import ancien resterait signalé indéfiniment
// s'il n'a jamais été vu, ce qui reste voulu, mais borné à une fenêtre large.
const LOOKBACK_DAYS = 30;

export function ListingNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ListingNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user) { setNotifications([]); setReadIds(new Set()); return; }
    // TEMP DEV BYPASS — DO NOT COMMIT: fixture instead of real Supabase calls
    setNotifications([
      { id: 'n1', createdAt: new Date().toISOString(), courseCount: 42, createdBy: 'someone-else' },
      { id: 'n2', createdAt: new Date().toISOString(), courseCount: 8, createdBy: 'someone-else' },
    ]);
    setReadIds(new Set());
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime : dès qu'un import a lieu ailleurs, l'annonce apparaît sans
  // attendre un rechargement manuel.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('listing_notifications_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'listing_notifications' },
        (payload) => {
          const r = payload.new as { id: string; created_at: string; course_count: number; created_by: string | null };
          setNotifications((prev) => [{ id: r.id, createdAt: r.created_at, courseCount: r.course_count, createdBy: r.created_by }, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unseenNotifications = notifications.filter((n) => !readIds.has(n.id));
  const totalUnseenCourseCount = unseenNotifications.reduce((s, n) => s + n.courseCount, 0);

  const markAllSeen = useCallback(async () => {
    if (!user || unseenNotifications.length === 0) return;
    const ids = unseenNotifications.map((n) => n.id);
    setReadIds((prev) => new Set([...prev, ...ids]));
    // TEMP DEV BYPASS — DO NOT COMMIT: skip real Supabase write
  }, [user, unseenNotifications]);

  return (
    <ListingNotificationsContext.Provider value={{ unseenNotifications, totalUnseenCourseCount, markAllSeen }}>
      {children}
    </ListingNotificationsContext.Provider>
  );
}

export function useListingNotifications() {
  const ctx = useContext(ListingNotificationsContext);
  if (!ctx) throw new Error('useListingNotifications must be used within ListingNotificationsProvider');
  return ctx;
}
