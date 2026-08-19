import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { QueryResult, VerdictLevel } from '../types';

const KEY = 'zonadron.diario.v1';

export interface FlightLogEntry {
  id: string;
  lat: number;
  lon: number;
  label: string | null;
  /** ISO: cuándo se marcó como volado, no cuándo se consultó. */
  loggedAt: string;
  verdictLevel: VerdictLevel;
  verdictHeadline: string;
  heightAgl: number;
  droneLabel: string;
}

interface FlightLogContextValue {
  entries: FlightLogEntry[];
  ready: boolean;
  logFlight: (result: QueryResult, place: string | null, droneLabel: string) => void;
  removeEntry: (id: string) => void;
  clear: () => void;
}

const Ctx = createContext<FlightLogContextValue>({
  entries: [],
  ready: false,
  logFlight: () => {},
  removeEntry: () => {},
  clear: () => {},
});

/**
 * Diario de vuelos.
 *
 * AESA exige llevar un registro de las operaciones (UAS-OPS-DT01). La app ya
 * sabe casi todo lo que hace falta anotar en el momento de la consulta —
 * dónde, a qué altura, qué veredicto había y con qué dron—, así que "marcar
 * como volado" sólo añade la fecha real del vuelo a lo que ya se tenía.
 *
 * A diferencia de favoritos, aquí cada entrada es un suceso: volar dos veces
 * en el mismo sitio son dos líneas, no una que se pisa.
 */
export function FlightLogProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<FlightLogEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setEntries(parsed);
        } catch {
          /* diario corrupto: se empieza de cero */
        }
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: FlightLogEntry[]) => {
    setEntries(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const logFlight = useCallback(
    (result: QueryResult, place: string | null, droneLabel: string) => {
      const entry: FlightLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        lat: result.coords.lat,
        lon: result.coords.lon,
        label: place,
        loggedAt: new Date().toISOString(),
        verdictLevel: result.verdict.level,
        verdictHeadline: result.verdict.headline,
        heightAgl: result.flightHeightAgl,
        droneLabel,
      };
      setEntries((prev) => {
        const next = [entry, ...prev];
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const removeEntry = useCallback(
    (id: string) => {
      persist(entries.filter((e) => e.id !== id));
    },
    [entries, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo<FlightLogContextValue>(
    () => ({ entries, ready, logFlight, removeEntry, clear }),
    [entries, ready, logFlight, removeEntry, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFlightLog() {
  return useContext(Ctx);
}
