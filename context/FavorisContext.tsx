import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'listing_favoris_v1';
const MAX_FAVORIS = 8;

export interface FavoriCourse {
  id: string;
  lieuEnlevement: string;
  lieuLivraison: string;
  vehicule?: string;
  qteBon: number;
  label?: string; // surnom optionnel (ex: "Clim → Larib")
  pinnedAt: string; // ISO
}

interface FavorisContextValue {
  favoris: FavoriCourse[];
  add: (f: Omit<FavoriCourse, 'id' | 'pinnedAt'>) => void;
  remove: (id: string) => void;
  isFavori: (lieuEnlevement: string, lieuLivraison: string, vehicule?: string) => boolean;
  toggle: (f: Omit<FavoriCourse, 'id' | 'pinnedAt'>) => void;
}

const FavorisContext = createContext<FavorisContextValue | undefined>(undefined);

export function FavorisProvider({ children }: { children: React.ReactNode }) {
  const [favoris, setFavoris] = useState<FavoriCourse[]>([]);

  // Charger depuis AsyncStorage au démarrage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setFavoris(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const save = useCallback((list: FavoriCourse[]) => {
    setFavoris(list);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const isFavori = useCallback(
    (lieuEnlevement: string, lieuLivraison: string, vehicule?: string) =>
      favoris.some(
        (f) =>
          f.lieuEnlevement === lieuEnlevement &&
          f.lieuLivraison === lieuLivraison &&
          (f.vehicule ?? '') === (vehicule ?? '')
      ),
    [favoris]
  );

  const add = useCallback(
    (f: Omit<FavoriCourse, 'id' | 'pinnedAt'>) => {
      // Pas de doublon
      if (isFavori(f.lieuEnlevement, f.lieuLivraison, f.vehicule)) return;
      const newFav: FavoriCourse = {
        ...f,
        id: `fav_${Date.now()}`,
        pinnedAt: new Date().toISOString(),
      };
      // Limité à MAX_FAVORIS, le plus récent en premier
      save([newFav, ...favoris].slice(0, MAX_FAVORIS));
    },
    [favoris, isFavori, save]
  );

  const remove = useCallback(
    (id: string) => save(favoris.filter((f) => f.id !== id)),
    [favoris, save]
  );

  const toggle = useCallback(
    (f: Omit<FavoriCourse, 'id' | 'pinnedAt'>) => {
      const existing = favoris.find(
        (fav) =>
          fav.lieuEnlevement === f.lieuEnlevement &&
          fav.lieuLivraison === f.lieuLivraison &&
          (fav.vehicule ?? '') === (f.vehicule ?? '')
      );
      if (existing) remove(existing.id);
      else add(f);
    },
    [favoris, add, remove]
  );

  return (
    <FavorisContext.Provider value={{ favoris, add, remove, isFavori, toggle }}>
      {children}
    </FavorisContext.Provider>
  );
}

export function useFavoris() {
  const ctx = useContext(FavorisContext);
  if (!ctx) throw new Error('useFavoris must be used within FavorisProvider');
  return ctx;
}
