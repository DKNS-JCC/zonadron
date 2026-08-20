/**
 * Geometría del modo sin cobertura. Sin dependencias de plataforma, para poder
 * comprobarlo con `npm run test:motor`.
 */

import { t } from '../i18n';

export interface ElevationGrid {
  lat0: number;
  lon0: number;
  dLat: number;
  dLon: number;
  rows: number;
  cols: number;
  /** Elevaciones en metros, fila a fila desde lat0 hacia el norte. */
  values: number[];
}

export interface BBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export function boxAround(lat: number, lon: number, radiusKm: number): BBox {
  const dLat = radiusKm / 111.32;
  const dLon = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLon: lon - dLon, maxLon: lon + dLon };
}

export function bboxContains(bbox: BBox, lat: number, lon: number): boolean {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon;
}

/** Regla par-impar sobre todos los anillos (los huecos vuelven a alternar). */
export function pointInRings(lat: number, lon: number, rings: number[][][]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/** Elevación interpolada bilinealmente en la rejilla. */
export function interpolateElevation(
  grid: ElevationGrid,
  lat: number,
  lon: number,
): number | null {
  const fRow = (lat - grid.lat0) / grid.dLat;
  const fCol = (lon - grid.lon0) / grid.dLon;
  if (fRow < 0 || fCol < 0 || fRow > grid.rows - 1 || fCol > grid.cols - 1) return null;

  const r0 = Math.floor(fRow);
  const c0 = Math.floor(fCol);
  const r1 = Math.min(r0 + 1, grid.rows - 1);
  const c1 = Math.min(c0 + 1, grid.cols - 1);
  const tr = fRow - r0;
  const tc = fCol - c0;

  const at = (r: number, c: number) => grid.values[r * grid.cols + c];
  const v00 = at(r0, c0);
  const v01 = at(r0, c1);
  const v10 = at(r1, c0);
  const v11 = at(r1, c1);
  if ([v00, v01, v10, v11].some((v) => !Number.isFinite(v))) return null;

  return (v00 * (1 - tc) + v01 * tc) * (1 - tr) + (v10 * (1 - tc) + v11 * tc) * tr;
}

const EARTH_R = 6371000;

/** Metros por grado de longitud y latitud, en la latitud dada. */
export function metresPerDegree(lat: number) {
  const latRad = (lat * Math.PI) / 180;
  return { x: (Math.PI / 180) * EARTH_R * Math.cos(latRad), y: (Math.PI / 180) * EARTH_R };
}

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

/** Rumbo legible a partir de un desplazamiento en metros (este, norte). */
export function bearingLabel(dx: number, dy: number): string {
  const points = t('bearing.points').split(',');
  const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
  return points[Math.round(((angle + 360) % 360) / 45) % 8];
}

/**
 * Distancia mínima del punto al borde del polígono, en metros, junto con el
 * desplazamiento hacia el punto más cercano (para poder dar el rumbo).
 */
export function distanceToRings(
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
      const r = pointToSegment(
        0, 0,
        (a[0] - lon) * scale.x, (a[1] - lat) * scale.y,
        (b[0] - lon) * scale.x, (b[1] - lat) * scale.y,
      );
      if (!best || r.dist < best.dist) best = { dist: r.dist, dx: r.x, dy: r.y };
    }
  }
  return best;
}

/** Caja envolvente de unos anillos, para descartar rápido. */
export function ringsBBox(rings: number[][][]): BBox {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
  }
  return { minLat, maxLat, minLon, maxLon };
}
