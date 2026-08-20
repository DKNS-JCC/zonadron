/**
 * Motor solar.
 *
 * Todo se calcula en el móvil con SunCalc (algoritmos de Meeus): no hace falta
 * conexión ni ninguna clave, y funciona igual en mitad del campo.
 *
 * Convenio de SunCalc v2: ángulos en GRADOS, azimut desde el norte y en sentido
 * horario (0 = N, 90 = E, 180 = S, 270 = O), altura ya corregida de refracción.
 * Verificado: el mediodía solar da azimut 180,0 exacto.
 */

import * as SunCalc from 'suncalc';

import { dateLocale, t } from '../i18n';

/** Umbrales fotográficos, en grados de altura solar. */
export const GOLDEN_HOUR_TOP = 6;
export const HORIZON = 0;
export const BLUE_HOUR_TOP = -4;
export const BLUE_HOUR_BOTTOM = -6;

// SunCalc permite añadir instantes propios por ángulo del sol.
SunCalc.addTime(BLUE_HOUR_TOP, 'blueEndMorning', 'blueStartEvening');

export interface SunPosition {
  /** Grados desde el norte, en sentido horario. */
  azimuth: number;
  /** Grados sobre el horizonte. Negativo = bajo el horizonte. */
  altitude: number;
}

export interface SunMoment {
  key: string;
  label: string;
  time: Date | null;
}

export interface SunDay {
  dawn: Date | null;
  blueMorning: [Date | null, Date | null];
  sunrise: Date | null;
  goldenMorningEnd: Date | null;
  solarNoon: Date | null;
  maxAltitude: number;
  goldenEveningStart: Date | null;
  sunset: Date | null;
  blueEvening: [Date | null, Date | null];
  dusk: Date | null;
  /** Azimut por el que sale y se pone el sol, para dibujarlos en el mapa. */
  sunriseAzimuth: number | null;
  sunsetAzimuth: number | null;
}

function valid(d: unknown): Date | null {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
}

export function sunPosition(date: Date, lat: number, lon: number): SunPosition {
  const p = SunCalc.getPosition(date, lat, lon);
  return { azimuth: p.azimuth, altitude: p.altitude };
}

export function sunDay(date: Date, lat: number, lon: number): SunDay {
  const t = SunCalc.getTimes(date, lat, lon) as Record<string, Date>;
  const noon = valid(t.solarNoon);
  const sunrise = valid(t.sunrise);
  const sunset = valid(t.sunset);

  return {
    dawn: valid(t.dawn),
    // Hora azul de la mañana: el sol sube de -6° a -4°.
    blueMorning: [valid(t.dawn), valid(t.blueEndMorning)],
    sunrise,
    goldenMorningEnd: valid(t.goldenHourEnd),
    solarNoon: noon,
    maxAltitude: noon ? sunPosition(noon, lat, lon).altitude : 0,
    goldenEveningStart: valid(t.goldenHour),
    sunset,
    // Hora azul de la tarde: el sol baja de -4° a -6°.
    blueEvening: [valid(t.blueStartEvening), valid(t.dusk)],
    dusk: valid(t.dusk),
    sunriseAzimuth: sunrise ? sunPosition(sunrise, lat, lon).azimuth : null,
    sunsetAzimuth: sunset ? sunPosition(sunset, lat, lon).azimuth : null,
  };
}

/**
 * Cuánto mide la sombra de un objeto, en veces su altura.
 * Con el sol muy bajo la sombra se dispara, así que se acota.
 */
export function shadowRatio(altitudeDeg: number): number | null {
  if (altitudeDeg <= 0.5) return null;
  const ratio = 1 / Math.tan((altitudeDeg * Math.PI) / 180);
  return Math.min(ratio, 200);
}

/** Dirección hacia la que cae la sombra: la contraria al sol. */
export function shadowAzimuth(sunAzimuth: number): number {
  return (sunAzimuth + 180) % 360;
}

export interface PathPoint {
  time: Date;
  azimuth: number;
  altitude: number;
}

/** Recorrido del sol a lo largo del día, para dibujarlo. */
export function sunPath(date: Date, lat: number, lon: number, stepMinutes = 15): PathPoint[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const points: PathPoint[] = [];
  const steps = Math.floor((24 * 60) / stepMinutes);
  for (let i = 0; i <= steps; i++) {
    const time = new Date(start.getTime() + i * stepMinutes * 60000);
    const { azimuth, altitude } = sunPosition(time, lat, lon);
    points.push({ time, azimuth, altitude });
  }
  return points;
}

/**
 * Rumbo en texto, para leerlo sin pensar. Las siglas cambian de idioma: en
 * español el oeste es O y en inglés W.
 */
export function compass(azimuth: number): string {
  const points = t('sun.compass').split(',');
  return points[Math.round(((azimuth % 360) + 360) % 360 / 22.5) % 16];
}

export function formatTime(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
}

/** Qué tipo de luz hay a una altura solar dada. */
export type LightKind = 'noche' | 'azul' | 'dorada' | 'dia';

export function lightKind(altitude: number): LightKind {
  if (altitude < BLUE_HOUR_BOTTOM) return 'noche';
  if (altitude < HORIZON) return 'azul';
  if (altitude <= GOLDEN_HOUR_TOP) return 'dorada';
  return 'dia';
}

export function lightLabel(kind: LightKind): string {
  switch (kind) {
    case 'noche':
      return t('sun.light.noche');
    case 'azul':
      return t('sun.light.azul');
    case 'dorada':
      return t('sun.light.dorada');
    default:
      return t('sun.light.dia');
  }
}

export const LIGHT_COLOR: Record<LightKind, string> = {
  noche: '#2B3A55',
  azul: '#3D6BC4',
  dorada: '#D98A1F',
  dia: '#3FA9E0',
};
