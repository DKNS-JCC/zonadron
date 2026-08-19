/**
 * Horizonte real del terreno.
 *
 * El ocaso "oficial" es el momento en que el sol cruza el horizonte teórico, el
 * de un mundo plano y despejado. En un valle el sol se esconde tras el monte
 * mucho antes, y esa diferencia es justo la que te hace llegar tarde a una toma.
 *
 * Aquí se muestrea la elevación del terreno a lo largo de los azimuts por los
 * que va a caer el sol, se calcula el ángulo del obstáculo más alto en cada
 * dirección y se busca a qué hora la altura del sol baja por debajo de él.
 *
 * Elevación: Open-Meteo (Copernicus DEM GLO-90), gratis y sin clave. Admite
 * hasta 100 puntos por petición.
 */

import { sunPosition } from '../logic/sun';
import { elevations } from './openMeteo';

/** Radio de tierra corregido por refracción atmosférica estándar (k = 1/7). */
const EFFECTIVE_EARTH_R = 6371000 * 1.13;

export interface HorizonProfile {
  /** Ángulo del obstáculo más alto, en grados, por azimut. */
  byAzimuth: { azimuth: number; angle: number; distanceKm: number }[];
  /** Elevación del punto de observación. */
  originElevation: number;
  maxDistanceKm: number;
}

export interface TerrainSunTimes {
  /** Hora a la que el sol desaparece tras el terreno. */
  sunsetBehindTerrain: Date | null;
  /** Hora a la que el sol asoma por encima del terreno. */
  sunriseOverTerrain: Date | null;
  /** Grados que se "come" el terreno en el ocaso. */
  sunsetHorizonAngle: number | null;
  sunriseHorizonAngle: number | null;
}

/** Punto a `distanceKm` en la dirección `azimuth` desde (lat, lon). */
function destination(lat: number, lon: number, azimuth: number, distanceKm: number) {
  const dLat = (distanceKm / 111.32) * Math.cos((azimuth * Math.PI) / 180);
  const dLon =
    (distanceKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin((azimuth * Math.PI) / 180);
  return { lat: lat + dLat, lon: lon + dLon };
}

/**
 * Distancias de muestreo: densas cerca (donde un cerro pequeño tapa mucho) y
 * espaciadas lejos (donde sólo cuentan las montañas grandes).
 */
function sampleDistances(maxKm: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    out.push(Number((maxKm * t * t).toFixed(3)));
  }
  return out;
}

/**
 * Perfil del horizonte para un abanico de azimuts.
 * `samplesPerRay` × `azimuths.length` puntos, en peticiones de 100.
 */
export async function horizonProfile(
  lat: number,
  lon: number,
  azimuths: number[],
  maxDistanceKm = 20,
  samplesPerRay = 14,
  signal?: AbortSignal,
): Promise<HorizonProfile | null> {
  const distances = sampleDistances(maxDistanceKm, samplesPerRay);

  const points: { lat: number; lon: number }[] = [{ lat, lon }];
  for (const az of azimuths) {
    for (const d of distances) points.push(destination(lat, lon, az, d));
  }

  const heights = await elevations(points, signal);
  if (!heights) return null;

  const originElevation = heights[0];
  const byAzimuth: HorizonProfile['byAzimuth'] = [];

  let index = 1;
  for (const az of azimuths) {
    let best = { angle: -90, distanceKm: 0 };
    for (const d of distances) {
      const h = heights[index++];
      if (!Number.isFinite(h)) continue;
      const metres = d * 1000;
      // La curvatura terrestre baja el obstáculo a medida que se aleja.
      const drop = (metres * metres) / (2 * EFFECTIVE_EARTH_R);
      const angle = (Math.atan2(h - originElevation - drop, metres) * 180) / Math.PI;
      if (angle > best.angle) best = { angle, distanceKm: d };
    }
    // Nunca por debajo del horizonte teórico: el mar no adelanta el ocaso.
    byAzimuth.push({ azimuth: az, angle: Math.max(0, best.angle), distanceKm: best.distanceKm });
  }

  return { byAzimuth, originElevation, maxDistanceKm };
}

/** Separación angular entre dos azimuts, de 0 a 180 grados. */
function angularDistance(a: number, b: number): number {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

/**
 * Ángulo del horizonte interpolado para un azimut cualquiera.
 *
 * Se toman los dos azimuts medidos más cercanos y se ponderan al revés de su
 * distancia: el más próximo pesa más.
 */
export function horizonAt(profile: HorizonProfile, azimuth: number): number {
  const list = profile.byAzimuth;
  if (list.length === 0) return 0;

  const ranked = list
    .map((entry) => ({ entry, distance: angularDistance(entry.azimuth, azimuth) }))
    .sort((a, b) => a.distance - b.distance);

  const nearest = ranked[0];
  const next = ranked[1];
  if (!next || nearest.distance === 0) return nearest.entry.angle;

  const total = nearest.distance + next.distance;
  if (total === 0) return nearest.entry.angle;
  return (nearest.entry.angle * next.distance + next.entry.angle * nearest.distance) / total;
}

/**
 * Azimuts por los que pasa el sol mientras baja (o sube) entre 25° y el
 * horizonte: es donde hace falta conocer el terreno.
 */
export function relevantAzimuths(
  date: Date,
  lat: number,
  lon: number,
  phase: 'ocaso' | 'amanecer',
  count = 7,
): number[] {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const found: number[] = [];
  const step = 5 * 60000;
  for (let t = 0; t < 24 * 3600000; t += step) {
    const time = new Date(day.getTime() + t);
    const { altitude, azimuth } = sunPosition(time, lat, lon);
    if (altitude > 25 || altitude < -2) continue;
    const previous = sunPosition(new Date(time.getTime() - step), lat, lon).altitude;
    const descending = altitude < previous;
    if ((phase === 'ocaso') === descending) found.push(azimuth);
  }
  if (found.length === 0) return [];
  // Se reparten `count` azimuts a lo largo del tramo.
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(found[Math.round((i * (found.length - 1)) / (count - 1))]);
  }
  return [...new Set(out.map((a) => Number(a.toFixed(2))))];
}

/** A qué hora se esconde el sol tras el terreno, y a qué hora asoma. */
export function terrainSunTimes(
  date: Date,
  lat: number,
  lon: number,
  sunsetProfile: HorizonProfile | null,
  sunriseProfile: HorizonProfile | null,
): TerrainSunTimes {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const step = 60000;

  let sunsetBehindTerrain: Date | null = null;
  let sunriseOverTerrain: Date | null = null;
  let sunsetHorizonAngle: number | null = null;
  let sunriseHorizonAngle: number | null = null;

  let previousAltitude: number | null = null;
  let wasAbove: boolean | null = null;

  for (let t = 0; t < 24 * 3600000; t += step) {
    const time = new Date(day.getTime() + t);
    const { altitude, azimuth } = sunPosition(time, lat, lon);
    const descending = previousAltitude !== null && altitude < previousAltitude;
    const profile = descending ? sunsetProfile : sunriseProfile;
    const horizon = profile ? horizonAt(profile, azimuth) : 0;
    const above = altitude > horizon;

    if (wasAbove === true && !above && descending && sunsetBehindTerrain === null) {
      sunsetBehindTerrain = time;
      sunsetHorizonAngle = horizon;
    }
    if (wasAbove === false && above && !descending && sunriseOverTerrain === null) {
      sunriseOverTerrain = time;
      sunriseHorizonAngle = horizon;
    }

    previousAltitude = altitude;
    wasAbove = above;
  }

  return { sunsetBehindTerrain, sunriseOverTerrain, sunsetHorizonAngle, sunriseHorizonAngle };
}
