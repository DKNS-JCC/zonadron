import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { QueryResult, VerdictLevel } from '../types';

const KEY = 'zonadron.history.v1';
const MAX = 8;

export interface HistoryEntry {
  id: string;
  lat: number;
  lon: number;
  label: string | null;
  level: VerdictLevel;
  height: number;
  /** ISO. */
  at: string;
  zoneCount: number;
}

interface HistoryContextValue {
  entries: HistoryEntry[];
  ready: boolean;
  remember: (result: QueryResult, label: string | null) => void;
  clear: () => void;
}

const Ctx = createContext<HistoryContextValue>({
  entries: [],
  ready: false,
  remember: () => {},
  clear: () => {},
});

/** Dos consultas del mismo sitio no deben ocupar dos filas. ~100 m de tolerancia. */
function keyFor(lat: number, lon: number) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setEntries(parsed.slice(0, MAX));
        } catch {
          /* historial corrupto: se empieza de cero */
        }
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: HistoryEntry[]) => {
    setEntries(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const remember = useCallback(
    (result: QueryResult, label: string | null) => {
      // Un resultado no concluyente no se guarda: no aporta y podría releerse
      // más tarde como si fuera una respuesta.
      if (result.verdict.incomplete) return;
      const entry: HistoryEntry = {
        id: keyFor(result.coords.lat, result.coords.lon),
        lat: result.coords.lat,
        lon: result.coords.lon,
        label,
        level: result.verdict.level,
        height: result.flightHeightAgl,
        at: result.queriedAt,
        zoneCount: result.verdict.affecting.length,
      };
      setEntries((prev) => {
        const next = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, MAX);
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo<HistoryContextValue>(
    () => ({ entries, ready, remember, clear }),
    [entries, ready, remember, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHistory() {
  return useContext(Ctx);
}

/** "hace 3 min", "hace 2 h", "ayer"… en lenguaje llano. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 'ahora';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
