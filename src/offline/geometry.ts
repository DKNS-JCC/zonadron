/**
 * Geometría del modo sin cobertura. Sin dependencias de plataforma, para poder
 * comprobarlo con `npm run test:motor`.
 */

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
