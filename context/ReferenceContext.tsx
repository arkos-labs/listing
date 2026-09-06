import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReferenceCourse, ReferenceCourseInput } from '@/types/course';
import { clearReferenceCourses } from '@/lib/storage';
import {
  fetchReferenceCourses,
  importCoursesToSupabase,
  subscribeToRealtimeUpdates,
  invalidateCache,
} from '@/lib/supabaseSync';
import { supabase } from '@/lib/supabase';

interface RealtimeNotif {
  count: number;
  id: number;
}

interface ReferenceContextValue {
  referenceCourses: ReferenceCourse[];
  loading: boolean;
  // filename = nom du fichier importé, fileUri = URI local pour upload Storage
  importFiles: (inputs: ReferenceCourseInput[], filename?: string, fileUri?: string) => Promise<number>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
  realtimeNotif: RealtimeNotif | null;
  clearNotif: () => void;
}

const ReferenceContext = createContext<ReferenceContextValue | undefined>(undefined);

export function ReferenceProvider({ children }: { children: React.ReactNode }) {
  const [referenceCourses, setReferenceCourses] = useState<ReferenceCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeNotif, setRealtimeNotif] = useState<RealtimeNotif | null>(null);
  const notifIdRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchReferenceCourses();
      const courses: ReferenceCourse[] = data.map((r) => ({
        id: r.id,
        lieuEnlevement: r.lieuEnlevement,
        lieuLivraison: r.lieuLivraison,
        qteBon: r.qteBon,
        vehicule: r.vehicule,
        domaine: r.domaine,
      }));
      setReferenceCourses(courses);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeUpdates(({ count }) => {
      // count=0 = signal de vidage de la base par l'admin → juste recharger, pas de popup
      if (count > 0) {
        notifIdRef.current += 1;
        setRealtimeNotif({ count, id: notifIdRef.current });
      }
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const importFiles = useCallback(async (
    inputs: ReferenceCourseInput[],
    filesToUpload?: { name: string, uri: string }[],
  ) => {
    const { inserted } = await importCoursesToSupabase(inputs);

    const { data: { user } } = await supabase.auth.getUser();
    if (user && (inserted > 0 || inputs.length > 0)) {
      let lastUploadedPath: string | null = null;
      let combinedNames: string | null = null;

      // Upload tous les fichiers originaux dans Supabase Storage
      if (filesToUpload && filesToUpload.length > 0) {
        if (filesToUpload.length === 1) {
          combinedNames = filesToUpload[0].name;
        } else {
          combinedNames = `${filesToUpload.length} fichiers (groupés)`;
        }
        
        const timestamp = Date.now(); // Utilise le même timestamp pour grouper les fichiers du même import
        
        for (const file of filesToUpload) {
          try {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            const storagePath = `${user.id}/${timestamp}_${file.name}`;
            const { error: uploadError } = await supabase.storage
              .from('listings')
              .upload(storagePath, blob, { upsert: true, contentType: blob.type || `application/octet-stream` });
              
            if (!uploadError) lastUploadedPath = storagePath;
          } catch (e) {
            console.warn('Upload listing storage failed for', file.name, e);
          }
        }
      }

      await supabase.from('profiles').update({
        last_listing_import_at: new Date().toISOString(),
        ...(combinedNames ? { last_listing_filename: combinedNames } : {}),
        ...(lastUploadedPath ? { last_listing_file_path: lastUploadedPath } : {}),
      }).eq('id', user.id);
    }

    await refresh();
    return inserted;
  }, [refresh]);

  const clearAll = useCallback(async () => {
    await clearReferenceCourses();
    await invalidateCache();
    setReferenceCourses([]);
  }, []);

  const clearNotif = useCallback(() => setRealtimeNotif(null), []);

  return (
    <ReferenceContext.Provider value={{ referenceCourses, loading, importFiles, clearAll, refresh, realtimeNotif, clearNotif }}>
      {children}
    </ReferenceContext.Provider>
  );
}

export function useReference() {
  const ctx = useContext(ReferenceContext);
  if (!ctx) throw new Error('useReference must be used within ReferenceProvider');
  return ctx;
}
