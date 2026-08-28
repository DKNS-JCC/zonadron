import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { QueryResult, VerdictLevel } from '../types';

const KEY = 'zonadron.favoritos.v1';

export interface FavoriteEntry {
  id: string;
  lat: number;
  lon: number;
  /** Nombre que vino de la búsqueda inversa al guardarlo. No se toca nunca. */
  label: string;
  /**
   * Nombre puesto por ti. Manda sobre `label`: "Presa del Atazar — orilla este"
   * dice muchísimo más que "Cervera de Buitrago, Madrid".
   */
  name?: string;
  /**
   * Lo que hay que recordar de este sitio y no está en ningún dato oficial:
   * dónde se aparca, por dónde se accede, que hay un tendido al norte, que el
   * guarda pasa a las ocho. Es la mitad del valor de guardar un punto.
   */
  note?: string;
  /**
   * Altura a la que sueles volar AQUÍ. Al abrir el sitio se comprueba con ella
   * en vez de con la altura general: en el pantano vuelas a 100 m y en el
   * parque de al lado de casa a 30, y volver a ponerlo cada vez es justo la
   * clase de fricción que hace que no se use.
   */
  heightM?: number;
  /** ISO. */
  savedAt: string;
  /** Veredicto la última vez que se comprobó — de ahí sale el aviso de cambio. */
  lastLevel: VerdictLevel;
  lastCheckedAt: string;
}

/** Lo que se puede cambiar de un sitio guardado desde su ficha. */
export type FavoritePatch = Pick<FavoriteEntry, 'name' | 'note' | 'heightM'>;

interface FavoritesContextValue {
  favorites: FavoriteEntry[];
  ready: boolean;
  isFavorite: (lat: number, lon: number) => boolean;
  /** El sitio guardado que cae en este punto, si lo hay (~100 m de tolerancia). */
  favoriteAt: (lat: number, lon: number) => FavoriteEntry | null;
  getFavorite: (id: string | undefined) => FavoriteEntry | null;
  toggleFavorite: (result: QueryResult, label: string | null) => void;
  /** Cambia nombre, notas o altura. Se guarda según se escribe, como los ajustes. */
  updateFavorite: (id: string, patch: Partial<FavoritePatch>) => void;
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
  favoriteAt: () => null,
  getFavorite: () => null,
  toggleFavorite: () => {},
  updateFavorite: () => {},
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

  const favoriteAt = useCallback(
    (lat: number, lon: number) => favorites.find((f) => f.id === keyFor(lat, lon)) ?? null,
    [favorites],
  );

  const getFavorite = useCallback(
    (id: string | undefined) => (id ? (favorites.find((f) => f.id === id) ?? null) : null),
    [favorites],
  );

  const updateFavorite = useCallback((id: string, patch: Partial<FavoritePatch>) => {
    // Se escribe sobre el estado anterior y no sobre `favorites` capturado: la
    // ficha guarda letra a letra y dos pulsaciones seguidas se pisarían.
    setFavorites((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

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
      // La escritura va sobre el estado anterior y no sobre `favorites`: si
      // acabas de escribir una nota, este refresco no puede deshacerla.
      setFavorites((prev) => {
        const next = prev.map((f) =>
          f.id === id
            ? { ...f, lastLevel: result.verdict.level, lastCheckedAt: result.queriedAt }
            : f,
        );
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      return changed ? fav.lastLevel : null;
    },
    [favorites],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      ready,
      isFavorite,
      favoriteAt,
      getFavorite,
      toggleFavorite,
      updateFavorite,
      removeFavorite,
      checkForChange,
    }),
    [
      favorites,
      ready,
      isFavorite,
      favoriteAt,
      getFavorite,
      toggleFavorite,
      updateFavorite,
      removeFavorite,
      checkForChange,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  return useContext(Ctx);
}
