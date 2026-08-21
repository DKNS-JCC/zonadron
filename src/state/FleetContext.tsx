import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { droneFromLegacy, emptyDrone, normaliseDrone, type FleetDrone } from '../logic/fleet';
import { useSettings } from './SettingsContext';

const KEY = 'zonadron.flota.v1';

/**
 * Tu flota, guardada en el móvil.
 *
 * Antes había un único modelo y un único número de serie sueltos en los
 * ajustes, como si cada persona volara un solo dron toda su vida. Lo normal es
 * tener varios —el ligero para viajar, el bueno para grabar— y que cada uno
 * tenga su clase, su serie y sus papeles. Aquí viven todos.
 *
 * Uno de ellos es el *activo*: el que se da por supuesto al preparar una
 * solicitud de autorización o al apuntar un vuelo en el diario. Cambiarlo es
 * un gesto, no un formulario.
 *
 * La clase del dron activo se copia a `settings.drone`, que es de donde leen
 * las normas y la tarjeta del tiempo. Se hace en un solo sitio —aquí— para que
 * no haya dos verdades sobre qué dron estás volando.
 */

interface StoredFleet {
  drones: FleetDrone[];
  activeId: string | null;
}

interface FleetContextValue {
  drones: FleetDrone[];
  ready: boolean;
  activeId: string | null;
  activeDrone: FleetDrone | null;
  /** Crea un dron (vacío o con lo que se le pase) y lo devuelve ya guardado. */
  addDrone: (partial?: Partial<FleetDrone>) => FleetDrone;
  updateDrone: (id: string, patch: Partial<FleetDrone>) => void;
  removeDrone: (id: string) => void;
  setActive: (id: string) => void;
  getDrone: (id: string) => FleetDrone | null;
}

const Ctx = createContext<FleetContextValue>({
  drones: [],
  ready: false,
  activeId: null,
  activeDrone: null,
  addDrone: () => emptyDrone(),
  updateDrone: () => {},
  removeDrone: () => {},
  setActive: () => {},
  getDrone: () => null,
});

export function FleetProvider({ children }: { children: React.ReactNode }) {
  const { drone: droneClass, setDrone, operator, setOperator, ready: settingsReady } = useSettings();
  const [fleet, setFleet] = useState<StoredFleet>({ drones: [], activeId: null });
  const [ready, setReady] = useState(false);
  const migrated = useRef(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          const drones = Array.isArray(parsed?.drones)
            ? parsed.drones.map(normaliseDrone).filter((d: FleetDrone | null): d is FleetDrone => d !== null)
            : [];
          const activeId =
            typeof parsed?.activeId === 'string' && drones.some((d: FleetDrone) => d.id === parsed.activeId)
              ? parsed.activeId
              : (drones[0]?.id ?? null);
          setFleet({ drones, activeId });
        } catch {
          /* flota corrupta: se empieza de cero, los ajustes siguen intactos */
        }
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: StoredFleet) => {
    setFleet(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  /**
   * Quien ya tenía puesto su dron en los ajustes se encuentra la ficha hecha:
   * el modelo y la serie de antes pasan a ser el primer dron de la flota, y se
   * borran de donde estaban para que no queden dos copias del mismo dato.
   */
  useEffect(() => {
    if (!ready || !settingsReady || migrated.current) return;
    migrated.current = true;
    if (fleet.drones.length > 0) return;
    const legacy = droneFromLegacy(operator.droneModel, operator.droneSerial, droneClass);
    if (!legacy) return;
    persist({ drones: [legacy], activeId: legacy.id });
    setOperator({ droneModel: '', droneSerial: '' });
  }, [ready, settingsReady, fleet.drones.length, operator, droneClass, persist, setOperator]);

  const addDrone = useCallback(
    (partial?: Partial<FleetDrone>) => {
      const created: FleetDrone = { ...emptyDrone(), ...partial };
      // El primero que se guarda pasa a ser el activo sin preguntar: si sólo
      // hay uno, no hay nada que elegir.
      const activeId = fleet.activeId ?? created.id;
      persist({ drones: [...fleet.drones, created], activeId });
      if (activeId === created.id) setDrone(created.profile);
      return created;
    },
    [fleet, persist, setDrone],
  );

  const updateDrone = useCallback(
    (id: string, patch: Partial<FleetDrone>) => {
      const drones = fleet.drones.map((d) => (d.id === id ? { ...d, ...patch, id: d.id } : d));
      persist({ ...fleet, drones });
      // Si cambias la clase del dron con el que vuelas, cambian las reglas que
      // te enseña la app: eso tiene que verse ya, no al reiniciar.
      if (id === fleet.activeId && patch.profile) setDrone(patch.profile);
    },
    [fleet, persist, setDrone],
  );

  const removeDrone = useCallback(
    (id: string) => {
      const drones = fleet.drones.filter((d) => d.id !== id);
      const activeId = fleet.activeId === id ? (drones[0]?.id ?? null) : fleet.activeId;
      persist({ drones, activeId });
      const next = drones.find((d) => d.id === activeId);
      if (next) setDrone(next.profile);
    },
    [fleet, persist, setDrone],
  );

  const setActive = useCallback(
    (id: string) => {
      const target = fleet.drones.find((d) => d.id === id);
      if (!target) return;
      persist({ ...fleet, activeId: id });
      setDrone(target.profile);
    },
    [fleet, persist, setDrone],
  );

  const activeDrone = useMemo(
    () => fleet.drones.find((d) => d.id === fleet.activeId) ?? null,
    [fleet],
  );

  const value = useMemo<FleetContextValue>(
    () => ({
      drones: fleet.drones,
      ready,
      activeId: fleet.activeId,
      activeDrone,
      addDrone,
      updateDrone,
      removeDrone,
      setActive,
      getDrone: (id: string) => fleet.drones.find((d) => d.id === id) ?? null,
    }),
    [fleet, ready, activeDrone, addDrone, updateDrone, removeDrone, setActive],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFleet() {
  return useContext(Ctx);
}
