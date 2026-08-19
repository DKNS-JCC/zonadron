import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { QueryResult, VerdictLevel } from '../types';

const KEY = 'zonadron.favoritos.v1';

export interface FavoriteEntry {
  id: string;
  lat: number;
  lon: number;
  label: string;
  /** ISO. */
  savedAt: string;
  /** Veredicto la última vez que se comprobó — de ahí sale el aviso de cambio. */
  lastLevel: VerdictLevel;
  lastCheckedAt: string;
}

interface FavoritesContextValue {
  favorites: FavoriteEntry[];
  ready: boolean;
  isFavorite: (lat: number, lon: number) => boolean;
  toggleFavorite: (result: QueryResult, label: string | null) => void;
  removeFavorite: (id: string) => void;
  /**
   * Compara el veredicto de una consulta fresca con el que había guardado para
   * ese mismo sitio, y deja actualizado el guardado. Devuelve el nivel
   * anterior sólo si ha cambiado — así la pantalla que llama sabe si merece la
   * pena avisar, sin tener que llevar ella la cuenta de "ya lo avisé".
   */
  checkForChange: (result: QueryResult) => VerdictLevel | null;
}

const Ctx = createContext<FavoritesContextValue>({
  favorites: [],
  ready: false,
  isFavorite: () => false,
  toggleFavorite: () => {},
  removeFavorite: () => {},
  checkForChange: () => null,
});

/** Mismo criterio que el historial: ~100 m de tolerancia para "el mismo sitio". */
function keyFor(lat: number, lon: number) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setFavorites(parsed);
        } catch {
          /* favoritos corruptos: se empieza de cero */
        }
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: FavoriteEntry[]) => {
    setFavorites(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const isFavorite = useCallback(
    (lat: number, lon: number) => favorites.some((f) => f.id === keyFor(lat, lon)),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (result: QueryResult, label: string | null) => {
      const id = keyFor(result.coords.lat, result.coords.lon);
      setFavorites((prev) => {
        const exists = prev.some((f) => f.id === id);
        const next = exists
          ? prev.filter((f) => f.id !== id)
          : [
              {
                id,
                lat: result.coords.lat,
                lon: result.coords.lon,
                label: label ?? `${result.coords.lat.toFixed(4)}, ${result.coords.lon.toFixed(4)}`,
                savedAt: result.queriedAt,
                lastLevel: result.verdict.level,
                lastCheckedAt: result.queriedAt,
              },
              ...prev,
            ];
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const removeFavorite = useCallback(
    (id: string) => {
      persist(favorites.filter((f) => f.id !== id));
    },
    [favorites, persist],
  );

  const checkForChange = useCallback(
    (result: QueryResult): VerdictLevel | null => {
      const id = keyFor(result.coords.lat, result.coords.lon);
      const fav = favorites.find((f) => f.id === id);
      if (!fav) return null;

      const changed = fav.lastLevel !== result.verdict.level;
      const next = favorites.map((f) =>
        f.id === id ? { ...f, lastLevel: result.verdict.level, lastCheckedAt: result.queriedAt } : f,
      );
      persist(next);
      return changed ? fav.lastLevel : null;
    },
    [favorites, persist],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, ready, isFavorite, toggleFavorite, removeFavorite, checkForChange }),
    [favorites, ready, isFavorite, toggleFavorite, removeFavorite, checkForChange],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  return useContext(Ctx);
}
