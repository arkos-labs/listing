import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'driver' | null;

interface AuthContextValue {
  isAuthenticated: boolean | null;
  user: User | null;
  role: UserRole;
  prenom: string;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, prenom: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<UserRole>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [prenom, setPrenom] = useState('');
  const segments = useSegments();
  const router = useRouter();
  const loadingRef = useRef(false);

  const loadProfile = async (userId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, prenom')
        .eq('id', userId)
        .single();

      if (data) {
        setRole(data.role as UserRole);
        setPrenom(data.prenom ?? '');
      } else {
        console.warn('[AuthContext] Profil introuvable pour', userId, error?.message);
        setRole(null);
      }
    } catch (e) {
      console.error('[AuthContext] Erreur loadProfile:', e);
      setRole(null);
    } finally {
      setProfileLoaded(true);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfileLoaded(true); // pas de session → pas besoin de charger le profil
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadingRef.current = false; // reset pour permettre le rechargement
        loadProfile(session.user.id);
      } else {
        setRole(null);
        setPrenom('');
        setProfileLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Attendre que la session ET le profil soient chargés
    if (session === undefined || !profileLoaded) return;

    const isAuthenticated = !!session;
    const inAdminGroup = segments[0] === '(admin)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inLogin = segments[0] === 'login' || segments[0] === 'signup';

    if (!isAuthenticated && !inLogin) {
      router.replace('/login');
    } else if (isAuthenticated && role === 'admin' && !inAdminGroup) {
      router.replace('/(admin)');
    } else if (isAuthenticated && role === 'driver' && !inTabsGroup) {
      router.replace('/(tabs)');
    } else if (isAuthenticated && role === null) {
      // Profil chargé mais rôle inconnu → retour login
      router.replace('/login');
    }
  }, [session, role, profileLoaded, segments]);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    setProfileLoaded(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setProfileLoaded(true);
      return { error: 'Email ou mot de passe incorrect.' };
    }
    return {};
  };

  const signup = async (email: string, password: string, prenom: string): Promise<{ error?: string }> => {
    setProfileLoaded(false);
    // On passe le prénom dans les métadonnées → le trigger l'utilise directement
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { prenom } },
    });
    if (error) {
      setProfileLoaded(true);
      return { error: error.message };
    }
    // Le trigger handle_new_user() crée automatiquement le profil avec le prénom
    // Si besoin, on force un upsert pour s'assurer que le prénom est bien là
    if (data.user) {
      await supabase.from('profiles').upsert(
        { id: data.user.id, email, prenom, role: 'driver' },
        { onConflict: 'id' }
      );
    }
    return {};
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[AuthContext] Erreur déconnexion:', e);
    } finally {
      setSession(null);
      setRole(null);
      setPrenom('');
      setProfileLoaded(true);
      router.replace('/login');
    }
  };

  const isAuthenticated = session === undefined ? null : !!session;

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user: session?.user ?? null,
      role,
      prenom,
      login,
      signup,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
