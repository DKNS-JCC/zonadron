/**
 * "Quiero fotografiar esto: ¿desde dónde puedo volar?"
 *
 * Marcas el objetivo y esto busca el punto más cercano donde se puede volar sin
 * pedirle permiso a nadie. Se resuelve con el paquete descargado, en el móvil:
 * la búsqueda mira miles de puntos y eso no se le puede preguntar a ENAIRE uno
 * a uno.
 */

import { computeCoverageGrid } from './coverage';
import { bearingLabel, metresPerDegree, type BBox } from './geometry';
import type { OfflinePack } from './model';
import type { Coords } from '../types';

export interface FlyableSpot {
  coords: Coords;
  /** Distancia desde el objetivo, en metros. */
  distanceM: number;
  /** Rumbo desde el objetivo hacia el punto ("al norte"…). */
  bearing: string;
  /** Hasta qué altura se puede subir ahí sin autorización. */
  freeHeightM: number;
}

export interface NearestFlyableResult {
  /** El objetivo ya es volable: no hace falta moverse. */
  targetIsFlyable: boolean;
  /** Punto más cercano donde se alcanza la altura que querías. */
  best: FlyableSpot | null;
  /** Punto más cercano donde se puede volar algo, aunque sea menos alto. */
  anyHeight: FlyableSpot | null;
  /** Radio realmente explorado. */
  searchedKm: number;
}

function box(lat: number, lon: number, radiusKm: number): BBox {
  const dLat = radiusKm / 111.32;
  const dLon = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLon: lon - dLon, maxLon: lon + dLon };
}

/**
 * Busca alrededor del objetivo. Con 64 celdas sobre 12 km de lado, cada celda
 * son unos 190 m: suficiente para llegar andando a lo que salga.
 */
export function findNearestFlyable(
  pack: OfflinePack,
  target: Coords,
  desiredHeightM: number,
  searchRadiusKm = 6,
  cells = 64,
): NearestFlyableResult {
  const area = box(target.lat, target.lon, searchRadiusKm);
  const grid = computeCoverageGrid(pack, area, cells);

  const scale = metresPerDegree(target.lat);
  const dLat = (grid.bbox.maxLat - grid.bbox.minLat) / grid.rows;
  const dLon = (grid.bbox.maxLon - grid.bbox.minLon) / grid.cols;

  let best: FlyableSpot | null = null;
  let anyHeight: FlyableSpot | null = null;
  let targetIsFlyable = false;

  for (let r = 0; r < grid.rows; r++) {
    const lat = grid.bbox.minLat + (r + 0.5) * dLat;
    for (let c = 0; c < grid.cols; c++) {
      const value = grid.values[r * grid.cols + c];
      if (value <= 0) continue; // 0 = nada sin permiso, -1 = no determinable

      const lon = grid.bbox.minLon + (c + 0.5) * dLon;
      const dx = (lon - target.lon) * scale.x;
      const dy = (lat - target.lat) * scale.y;
      const distanceM = Math.hypot(dx, dy);

      // La celda que contiene al propio objetivo.
      const cellDiagonal = Math.hypot(dLat * scale.y, dLon * scale.x) / 2;
      if (distanceM <= cellDiagonal) targetIsFlyable = true;

      const spot: FlyableSpot = {
        coords: { lat, lon },
        distanceM,
        bearing: bearingLabel(dx, dy),
        freeHeightM: value,
      };

      if (!anyHeight || distanceM < anyHeight.distanceM) anyHeight = spot;
      if (value >= desiredHeightM && (!best || distanceM < best.distanceM)) best = spot;
    }
  }

  return { targetIsFlyable, best, anyHeight, searchedKm: searchRadiusKm };
}
