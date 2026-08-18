/**
 * ¿A qué distancia tienes la zona restringida más cercana?
 *
 * Saber que estás fuera no basta: si el borde de una CTR pasa a 80 m, una
 * ráfaga o un despiste te mete dentro. Esto responde a "cuánto margen tengo".
 *
 * Se consulta al mismo servicio de ENAIRE con un radio de búsqueda, pidiendo la
 * geometría ya simplificada (`maxAllowableOffset`) para no descargar polígonos
 * enormes, y la distancia se calcula en el móvil.
 */

import { ENAIRE_SERVICE, getLayerIds } from './enaire';
import type { LayerKey } from '../types';

/** Radio de búsqueda. Más allá de 2 km el dato deja de ser accionable. */
export const PROXIMITY_RADIUS_M = 2000;

export interface NearbyZone {
  identifier: string;
  title: string;
  type: string;
  layer: LayerKey;
  /** Distancia en metros desde el punto consultado hasta el borde de la zona. */
  distanceM: number;
  /** Rumbo aproximado hacia la zona, en texto ("al norte", "al sureste"…). */
  bearing: string;
}

const EARTH_R = 6371000;

/** Metros por grado, en la latitud dada. */
function metresPerDegree(lat: number) {
  const latRad = (lat * Math.PI) / 180;
  return {
    x: (Math.PI / 180) * EARTH_R * Math.cos(latRad),
    y: (Math.PI / 180) * EARTH_R,
  };
}

/** Distancia de un punto a un segmento, en un plano local en metros. */
function pointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { dist: Math.hypot(px - ax, py - ay), x: ax, y: ay };
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return { dist: Math.hypot(px - cx, py - cy), x: cx, y: cy };
}

const COMPASS = [
  'al norte', 'al noreste', 'al este', 'al sureste',
  'al sur', 'al suroeste', 'al oeste', 'al noroeste',
];

function bearingLabel(dx: number, dy: number): string {
  // dx hacia el este, dy hacia el norte, ambos en metros.
  const angle = (Math.atan2(dx, dy) * 180) / Math.PI; // 0 = norte
  const normalized = (angle + 360) % 360;
  return COMPASS[Math.round(normalized / 45) % 8];
}

interface RawFeature {
  attributes: Record<string, unknown>;
  geometry?: { rings?: number[][][] };
}

/**
 * Distancia mínima del punto al borde de un polígono. Devuelve también el punto
 * más cercano, para poder dar el rumbo.
 */
function distanceToRings(
  lat: number,
  lon: number,
  rings: number[][][],
): { dist: number; dx: number; dy: number } | null {
  const scale = metresPerDegree(lat);
  let best: { dist: number; dx: number; dy: number } | null = null;

  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i];
      const b = ring[i + 1];
      if (!a || !b) continue;
      const ax = (a[0] - lon) * scale.x;
      const ay = (a[1] - lat) * scale.y;
      const bx = (b[0] - lon) * scale.x;
      const by = (b[1] - lat) * scale.y;
      const r = pointToSegment(0, 0, ax, ay, bx, by);
      if (!best || r.dist < best.dist) best = { dist: r.dist, dx: r.x, dy: r.y };
    }
  }
  return best;
}

/** true si el punto cae dentro del polígono (regla par-impar). */
function pointInRings(lat: number, lon: number, rings: number[][][]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersects) inside = !inside;
    }
  }
  return inside;
}

const BLOCKING = new Set(['PROHIBITED', 'REQ_AUTHORIZATION']);

async function queryLayerNearby(
  layer: LayerKey,
  layerId: number,
  lat: number,
  lon: number,
  radiusM: number,
  signal?: AbortSignal,
): Promise<NearbyZone[]> {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    distance: String(radiusM),
    units: 'esriSRUnit_Meter',
    outFields: 'identifier,name,type,extendedProperties',
    returnGeometry: 'true',
    // ~11 m de tolerancia: suficiente para una distancia orientativa y reduce
    // muchísimo el tamaño de la respuesta.
    maxAllowableOffset: '0.0001',
    f: 'json',
  });

  const res = await fetch(`${ENAIRE_SERVICE}/${layerId}/query?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text.trim().startsWith('<')) throw new Error('El servicio de ENAIRE ha rechazado la petición');
  const json = JSON.parse(text);
  if (json?.error) throw new Error(json.error?.message ?? 'Error del servicio');

  const out: NearbyZone[] = [];
  for (const f of (json.features ?? []) as RawFeature[]) {
    const type = String(f.attributes?.type ?? '').toUpperCase();
    if (!BLOCKING.has(type)) continue;
    const rings = f.geometry?.rings;
    if (!rings || rings.length === 0) continue;

    // Si el punto ya está dentro, no es "la más cercana": ya te afecta.
    if (pointInRings(lat, lon, rings)) continue;

    const d = distanceToRings(lat, lon, rings);
    if (!d) continue;

    const name = String(f.attributes?.name ?? '').trim();
    const ext = String(f.attributes?.extendedProperties ?? '').trim();
    const identifier = String(f.attributes?.identifier ?? '—').trim();

    out.push({
      identifier,
      title: name || ext || identifier,
      type,
      layer,
      distanceM: d.dist,
      bearing: bearingLabel(d.dx, d.dy),
    });
  }
  return out;
}

/**
 * Zona restringida más cercana que NO te afecta todavía. Se consultan las capas
 * aeronáutica y de infraestructuras; la urbana es un aviso general y no tiene
 * bordes reales.
 */
export async function findNearestBlockingZone(
  lat: number,
  lon: number,
  radiusM: number = PROXIMITY_RADIUS_M,
  signal?: AbortSignal,
): Promise<NearbyZone | null> {
  const ids = await getLayerIds();
  const layers: LayerKey[] = ['aero', 'infraestructuras'];

  const found: NearbyZone[] = [];
  for (const layer of layers) {
    try {
      found.push(...(await queryLayerNearby(layer, ids[layer], lat, lon, radiusM, signal)));
    } catch {
      // La proximidad es información añadida: si una capa falla, se sigue.
    }
  }

  if (found.length === 0) return null;
  return found.reduce((a, b) => (b.distanceM < a.distanceM ? b : a));
}
