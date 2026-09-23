import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'driver' | null;

interface AuthContextValue {
  isAuthenticated: boolean | null;
  user: User | null;
  role: UserRole; // rôle principal (pour compatibilité)
  roles: UserRole[]; // tous les rôles de l'utilisateur
  prenom: string;
  isAdmin: boolean;
  isDriver: boolean;
  lastListingImportAt: string | null;
  refreshLastListingImportAt: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, prenom: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<UserRole>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [lastListingImportAt, setLastListingImportAt] = useState<string | null>(null);
  const segments = useSegments();
  const router = useRouter();
  const loadingRef = useRef(false);

  const loadProfile = async (userId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, roles, prenom, last_listing_import_at')
        .eq('id', userId)
        .single();

      if (data) {
        // Supporter les deux formats: colonne 'role' (ancien) ou 'roles' (nouveau)
        let userRoles: UserRole[] = [];

        // Essayer de charger 'roles' (JSON array)
        if (Array.isArray(data.roles)) {
          userRoles = data.roles as UserRole[];
        } else if (typeof data.roles === 'string') {
          // Si c'est une string JSON, la parser
          try {
            userRoles = JSON.parse(data.roles) as UserRole[];
          } catch {
            userRoles = [];
          }
        }

        // Si 'roles' n'existe pas, fallback sur 'role'
        if (userRoles.length === 0 && data.role) {
          userRoles = [data.role as UserRole];
        }

        const filteredRoles = userRoles.filter(r => r !== null);
        setRoles(filteredRoles);
        // Rôle principal = 'driver' si présent, sinon le premier rôle
        const mainRole = filteredRoles.includes('driver') ? 'driver' : (filteredRoles[0] as UserRole);
        setRole(mainRole);
        setPrenom(data.prenom ?? '');
        setLastListingImportAt(data.last_listing_import_at ?? null);
        console.log('[AuthContext] Profil chargé:', { email: data.email, rolesRaw: data.roles, roles: filteredRoles, role: mainRole });
      } else {
        console.warn('[AuthContext] Profil introuvable pour', userId, error?.message);
        setRole(null);
        setRoles([]);
        setLastListingImportAt(null);
      }
    } catch (e) {
      console.error('[AuthContext] Erreur loadProfile:', e);
      setRole(null);
      setRoles([]);
      setLastListingImportAt(null);
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
        setRoles([]);
        setPrenom('');
        setLastListingImportAt(null);
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
    const inLogin = segments[0] === 'login' || segments[0] === 'signup'
      || segments[0] === 'forgot-password' || segments[0] === 'reset-password';

    console.log('[AuthContext] Routing check:', { isAuthenticated, roles, inAdminGroup, inTabsGroup, segment: segments[0] });

    if (segments[0] === 'reset-password') return; // Ne jamais rediriger depuis reset-password

    if (!isAuthenticated && !inLogin) {
      router.replace('/login');
    } else if (isAuthenticated && roles.length === 0) {
      // Profil chargé mais pas de rôles → retour login
      router.replace('/login');
    } else if (isAuthenticated && roles.includes('driver')) {
      // Si driver est dans les rôles, TOUJOURS afficher (tabs), peu importe où on est
      if (!inTabsGroup) {
        console.log('[AuthContext] Redirection vers /(tabs) car driver détecté');
        router.replace('/(tabs)');
      }
    } else if (isAuthenticated && roles.includes('admin')) {
      // Si SEULEMENT admin (pas driver), afficher (admin)
      if (!inAdminGroup) {
        console.log('[AuthContext] Redirection vers /(admin)');
        router.replace('/(admin)');
      }
    }
  }, [session, roles, profileLoaded, segments]);

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
        { id: data.user.id, email, prenom, role: 'driver', roles: ['driver'] },
        { onConflict: 'id' }
      );
    }
    return {};
  };

  const refreshLastListingImportAt = async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('last_listing_import_at')
      .eq('id', session.user.id)
      .single();
    setLastListingImportAt(data?.last_listing_import_at ?? null);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[AuthContext] Erreur déconnexion:', e);
    } finally {
      setSession(null);
      setRole(null);
      setRoles([]);
      setPrenom('');
      setLastListingImportAt(null);
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
      roles,
      isAdmin: roles.includes('admin'),
      isDriver: roles.includes('driver'),
      lastListingImportAt,
      refreshLastListingImportAt,
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
