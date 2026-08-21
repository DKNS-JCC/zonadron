import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { resolveLocale, setLocale, t, type LanguageId, type Locale } from '../i18n';
import type { DroneProfileId } from '../logic/drone';

const KEY = 'zonadron.settings.v1';

const VALID_DRONES: DroneProfileId[] = ['sub250', 'c1', 'c2', 'c3c4', 'otro'];

export type BasemapId = 'mapa' | 'topo' | 'satelite';

export const BASEMAPS: { id: BasemapId; icon: string }[] = [
  { id: 'mapa', icon: 'map-outline' },
  { id: 'topo', icon: 'trail-sign-outline' },
  { id: 'satelite', icon: 'globe-outline' },
];

export function basemapLabel(id: BasemapId): string {
  return id === 'topo' ? t('basemap.topo') : id === 'satelite' ? t('basemap.satelite') : t('basemap.mapa');
}

export function basemapNote(id: BasemapId): string {
  return id === 'topo'
    ? t('basemap.note.topo')
    : id === 'satelite'
      ? t('basemap.note.satelite')
      : t('basemap.note.mapa');
}

const VALID_BASEMAPS: BasemapId[] = ['mapa', 'topo', 'satelite'];

/** Claro, oscuro, o lo que diga el móvil. */
export type AppearanceId = 'sistema' | 'claro' | 'oscuro';

export const APPEARANCES: { id: AppearanceId; icon: string }[] = [
  { id: 'sistema', icon: 'phone-portrait-outline' },
  { id: 'claro', icon: 'sunny-outline' },
  { id: 'oscuro', icon: 'moon-outline' },
];

export function appearanceLabel(id: AppearanceId): string {
  return id === 'claro'
    ? t('settings.appearance.claro')
    : id === 'oscuro'
      ? t('settings.appearance.oscuro')
      : t('settings.appearance.sistema');
}

const VALID_APPEARANCES: AppearanceId[] = ['sistema', 'claro', 'oscuro'];

/**
 * Idioma de la interfaz. Los textos oficiales de ENAIRE, los NOTAM y los
 * espacios protegidos siguen llegando en español: son la norma, no la app.
 */
export const LANGUAGES: { id: LanguageId; icon: string }[] = [
  { id: 'sistema', icon: 'phone-portrait-outline' },
  { id: 'es', icon: 'chatbox-outline' },
  { id: 'en', icon: 'chatbox-outline' },
];

/** El nombre de cada idioma va en su propio idioma; sólo «automático» se traduce. */
export function languageLabel(id: LanguageId): string {
  if (id === 'es') return 'Español';
  if (id === 'en') return 'English';
  return t('settings.language.system');
}

const VALID_LANGUAGES: LanguageId[] = ['sistema', 'es', 'en'];

/** Idioma del móvil, tal y como lo declara el sistema. */
function deviceLanguageTag(): string | null {
  try {
    return getLocales()[0]?.languageCode ?? null;
  } catch {
    return null;
  }
}

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
 *
 * La aeronave ya no vive aquí: cada dron tiene su ficha en la flota
 * (`src/state/FleetContext.tsx`), porque casi nadie vuela uno solo. Los dos
 * campos de abajo se conservan vacíos para poder migrar lo que hubiera
 * guardado la versión anterior, y no se enseñan en ninguna pantalla.
 */
export interface OperatorProfile {
  name: string;
  /** Número de operador UAS de AESA. */
  uasNumber: string;
  email: string;
  phone: string;
  /** @deprecated Migrado a la flota; se lee una vez y se vacía. */
  droneModel: string;
  /** @deprecated Migrado a la flota; se lee una vez y se vacía. */
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
  /** Qué dron vuelas: sólo cambia qué reglas se te enseñan, nunca el veredicto. */
  drone: DroneProfileId;
  operator: OperatorProfile;
  /** Pinta sobre el mapa la altura libre de cada celda (necesita paquete descargado). */
  showCoverage: boolean;
  /** Mapa base: callejero, topográfico del IGN o satélite (PNOA). */
  basemap: BasemapId;
  /** Aspecto de la app: automático (el del móvil), claro u oscuro. */
  appearance: AppearanceId;
  /** Idioma de la interfaz: el del móvil, español o inglés. */
  language: LanguageId;
}

interface SettingsContextValue extends Settings {
  ready: boolean;
  /** Idioma ya resuelto: 'sistema' convertido a uno real. */
  locale: Locale;
  setFlightHeight: (h: number) => void;
  setDrone: (d: DroneProfileId) => void;
  setOperator: (patch: Partial<OperatorProfile>) => void;
  setShowCoverage: (v: boolean) => void;
  setBasemap: (b: BasemapId) => void;
  setAppearance: (a: AppearanceId) => void;
  setLanguage: (l: LanguageId) => void;
}

const defaults: Settings = {
  flightHeight: DEFAULT_HEIGHT,
  // La mayoría de la gente vuela un dron de menos de 250 g, así que es el punto
  // de partida más útil. Se cambia en la pestaña Normas.
  drone: 'sub250',
  operator: EMPTY_OPERATOR,
  showCoverage: false,
  basemap: 'mapa',
  appearance: 'sistema',
  language: 'sistema',
};

const Ctx = createContext<SettingsContextValue>({
  ...defaults,
  ready: false,
  locale: resolveLocale(defaults.language, deviceLanguageTag()),
  setFlightHeight: () => {},
  setDrone: () => {},
  setOperator: () => {},
  setShowCoverage: () => {},
  setBasemap: () => {},
  setAppearance: () => {},
  setLanguage: () => {},
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
              drone: VALID_DRONES.includes(parsed?.drone) ? parsed.drone : defaults.drone,
              operator: { ...EMPTY_OPERATOR, ...(parsed?.operator ?? {}) },
              showCoverage: Boolean(parsed?.showCoverage),
              basemap: VALID_BASEMAPS.includes(parsed?.basemap) ? parsed.basemap : 'mapa',
              appearance: VALID_APPEARANCES.includes(parsed?.appearance)
                ? parsed.appearance
                : 'sistema',
              language: VALID_LANGUAGES.includes(parsed?.language) ? parsed.language : 'sistema',
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

  // El idioma se fija antes de pintar nada, no en un efecto: el motor de
  // decisión y las utilidades puras leen `t()` directamente y tienen que ver
  // el idioma bueno ya en el primer render.
  const locale = resolveLocale(settings.language, deviceLanguageTag());
  setLocale(locale);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      ready,
      locale,
      setFlightHeight: (h) => persist({ ...settings, flightHeight: Math.max(1, Math.min(900, Math.round(h))) }),
      setDrone: (d) => persist({ ...settings, drone: d }),
      setOperator: (patch) => persist({ ...settings, operator: { ...settings.operator, ...patch } }),
      setShowCoverage: (v) => persist({ ...settings, showCoverage: v }),
      setBasemap: (b) => persist({ ...settings, basemap: b }),
      setAppearance: (a) => persist({ ...settings, appearance: a }),
      setLanguage: (l) => persist({ ...settings, language: l }),
    }),
    [settings, ready, locale, persist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
