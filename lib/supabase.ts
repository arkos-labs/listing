import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://wtrlmjyzklxljiulbzca.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cmxtanl6a2x4bGppdWxiemNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzEwMDQsImV4cCI6MjEwMTAwNzAwNH0.q4ZZFDcCdvffEdbUkwa8Xc1WzMPcKUpjaA7qcayxv1k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type ReferenceCourseRow = {
  id: string;
  lieu_enlevement: string;
  lieu_livraison: string;
  qte_bon: number;
  vehicule: string | null;
  domaine: 'medical' | 'courseCourse' | null;
  hash: string;
  created_at: string;
};
