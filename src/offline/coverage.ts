/**
 * Mapa de "dónde SÍ puedo volar".
 *
 * En vez de responder a un punto, calcula la altura libre de una rejilla entera
 * y la pinta sobre el mapa: verde donde puedes subir al máximo, rojo donde no
 * puedes despegar sin permiso.
 *
 * Se resuelve con el paquete descargado, en el propio móvil y sin una sola
 * petición: hacerlo consultando a ENAIRE serían miles de peticiones.
 */

import { normalizeZone } from '../api/enaire';
import { evaluateVertical } from '../logic/verdict';
import { OPEN_CATEGORY_CEILING_M } from '../logic/verdict';
import type { Zone } from '../types';
import { interpolateElevation, pointInRings, ringsBBox } from './geometry';
import type { BBox } from './geometry';
import { elevationUncertaintyFor, type OfflinePack } from './model';

/** Alturas libres de cada celda. -1 = no se ha podido determinar. */
export interface CoverageGrid {
  bbox: BBox;
  rows: number;
  cols: number;
  /** Fila 0 = borde sur. Valores en metros sobre el terreno. */
  values: number[];
  computedAt: string;
}

interface PreparedZone {
  zone: Zone;
  rings: number[][][];
  bbox: BBox;
}

/** Sólo las zonas que ponen techo: prohibidas o con autorización previa. */
function prepareBlockingZones(pack: OfflinePack): PreparedZone[] {
  const out: PreparedZone[] = [];
  let i = 0;
  for (const packed of pack.zones) {
    const zone = normalizeZone(packed.attributes, packed.layer, i++);
    if (zone.advisory) continue;
    if (zone.type !== 'PROHIBITED' && zone.type !== 'REQ_AUTHORIZATION' && zone.type !== 'UNKNOWN') {
      continue;
    }
    out.push({ zone, rings: packed.rings, bbox: ringsBBox(packed.rings) });
  }
  return out;
}

function inBBox(b: BBox, lat: number, lon: number) {
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;
}

/**
 * Calcula la rejilla de alturas libres para un área.
 *
 * `cells` es el lado de la rejilla: 48 significa 48×48 = 2.304 celdas, que en
 * un móvil tarda décimas de segundo gracias al descarte por caja envolvente.
 */
export function computeCoverageGrid(
  pack: OfflinePack,
  area: BBox,
  cells = 48,
): CoverageGrid {
  const zones = prepareBlockingZones(pack);

  // El área pedida se recorta a la que hay descargada: fuera de ella no se
  // puede afirmar nada, y pintar de verde lo desconocido sería lo peor.
  const bbox: BBox = {
    minLat: Math.max(area.minLat, pack.bbox.minLat),
    maxLat: Math.min(area.maxLat, pack.bbox.maxLat),
    minLon: Math.max(area.minLon, pack.bbox.minLon),
    maxLon: Math.min(area.maxLon, pack.bbox.maxLon),
  };

  const uncertainty = elevationUncertaintyFor(pack.elevationStepKm);
  const rows = cells;
  const cols = cells;
  const dLat = (bbox.maxLat - bbox.minLat) / rows;
  const dLon = (bbox.maxLon - bbox.minLon) / cols;
  const values = new Array<number>(rows * cols).fill(OPEN_CATEGORY_CEILING_M);

  for (let r = 0; r < rows; r++) {
    const lat = bbox.minLat + (r + 0.5) * dLat;
    for (let c = 0; c < cols; c++) {
      const lon = bbox.minLon + (c + 0.5) * dLon;

      const interpolated = pack.elevation
        ? interpolateElevation(pack.elevation, lat, lon)
        : null;
      // Mismo margen conservador que en la evaluación de un punto.
      const terrain = interpolated === null ? null : interpolated + uncertainty;

      let ceiling = OPEN_CATEGORY_CEILING_M;
      for (const prepared of zones) {
        if (!inBBox(prepared.bbox, lat, lon)) continue;
        if (!pointInRings(lat, lon, prepared.rings)) continue;

        const vertical = evaluateVertical(prepared.zone, OPEN_CATEGORY_CEILING_M, terrain);
        if (vertical.upperAgl !== null && vertical.upperAgl < 0) continue;
        if (vertical.lowerAgl === null) {
          ceiling = -1;
          break;
        }
        ceiling = Math.min(ceiling, Math.max(0, vertical.lowerAgl));
        if (ceiling === 0) break;
      }

      values[r * cols + c] = ceiling === -1 ? -1 : Math.floor(ceiling);
    }
  }

  return { bbox, rows, cols, values, computedAt: new Date().toISOString() };
}

/** Color de cada celda. Se usa el mismo lenguaje de color que el veredicto. */
export function coverageColor(metres: number): string {
  if (metres < 0) return '#4A5A70';
  if (metres <= 0) return '#BE2318';
  if (metres < 30) return '#C24400';
  if (metres < 60) return '#A96200';
  if (metres < 120) return '#7A8F00';
  return '#07835A';
}

export const COVERAGE_LEGEND = [
  { color: '#07835A', label: 'Hasta 120 m' },
  { color: '#7A8F00', label: '60 – 119 m' },
  { color: '#A96200', label: '30 – 59 m' },
  { color: '#C24400', label: 'Menos de 30 m' },
  { color: '#BE2318', label: 'Nada sin permiso' },
  { color: '#4A5A70', label: 'Sin determinar' },
];
