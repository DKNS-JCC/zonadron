import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { DroneProfileId } from '../logic/drone';

const KEY = 'zonadron.settings.v1';

const VALID_DRONES: DroneProfileId[] = ['sub250', 'c1', 'c2', 'c3c4', 'otro'];

/**
 * Altura de vuelo prevista, en metros sobre el terreno (AGL).
 * 120 m es el límite general de la categoría abierta en el Reglamento (UE)
 * 2019/947, así que es el valor por defecto más razonable.
 */
export const DEFAULT_HEIGHT = 120;

export const HEIGHT_PRESETS = [30, 60, 120] as const;

/**
 * Datos del operador. Se guardan SÓLO en el móvil (AsyncStorage) y se usan
 * únicamente para rellenar las solicitudes de autorización que tú mismo envías
 * desde tu app de correo. No se envían a ningún sitio.
 */
export interface OperatorProfile {
  name: string;
  /** Número de operador UAS de AESA. */
  uasNumber: string;
  email: string;
  phone: string;
  droneModel: string;
  /** Número de serie del dron (lo piden en muchas solicitudes). */
  droneSerial: string;
}

export const EMPTY_OPERATOR: OperatorProfile = {
  name: '',
  uasNumber: '',
  email: '',
  phone: '',
  droneModel: '',
  droneSerial: '',
};

interface Settings {
  flightHeight: number;
  showNotAffecting: boolean;
  /** Qué dron vuelas: sólo cambia qué reglas se te enseñan, nunca el veredicto. */
  drone: DroneProfileId;
  operator: OperatorProfile;
}

interface SettingsContextValue extends Settings {
  ready: boolean;
  setFlightHeight: (h: number) => void;
  setShowNotAffecting: (v: boolean) => void;
  setDrone: (d: DroneProfileId) => void;
  setOperator: (patch: Partial<OperatorProfile>) => void;
}

const defaults: Settings = {
  flightHeight: DEFAULT_HEIGHT,
  showNotAffecting: false,
  // La mayoría de la gente vuela un dron de menos de 250 g, así que es el punto
  // de partida más útil. Se cambia en la pestaña Normas.
  drone: 'sub250',
  operator: EMPTY_OPERATOR,
};

const Ctx = createContext<SettingsContextValue>({
  ...defaults,
  ready: false,
  setFlightHeight: () => {},
  setShowNotAffecting: () => {},
  setDrone: () => {},
  setOperator: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setSettings({
              flightHeight:
                Number.isFinite(parsed?.flightHeight) && parsed.flightHeight > 0
                  ? Math.min(900, Number(parsed.flightHeight))
                  : DEFAULT_HEIGHT,
              showNotAffecting: Boolean(parsed?.showNotAffecting),
              drone: VALID_DRONES.includes(parsed?.drone) ? parsed.drone : defaults.drone,
              operator: { ...EMPTY_OPERATOR, ...(parsed?.operator ?? {}) },
            });
          } catch {
            /* valores por defecto */
          }
        }
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      ready,
      setFlightHeight: (h) => persist({ ...settings, flightHeight: Math.max(1, Math.min(900, Math.round(h))) }),
      setShowNotAffecting: (v) => persist({ ...settings, showNotAffecting: v }),
      setDrone: (d) => persist({ ...settings, drone: d }),
      setOperator: (patch) => persist({ ...settings, operator: { ...settings.operator, ...patch } }),
    }),
    [settings, ready, persist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
