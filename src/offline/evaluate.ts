/**
 * Evaluación sin cobertura.
 *
 * Con el paquete descargado, la comprobación se hace entera en el móvil:
 * punto-en-polígono contra las zonas guardadas y elevación interpolada de la
 * rejilla.
 *
 * Dos honestidades importantes:
 *  - La elevación es interpolada, no exacta: se aplica un margen hacia el lado
 *    restrictivo, porque entre dos nodos de la rejilla puede haber un cerro.
 *  - Los NOTAM no se guardan: cambian a diario y un NOTAM viejo es peor que no
 *    tener ninguno. En modo sin cobertura se dice claramente que faltan.
 */

import { dedupeZones, normalizeZone } from '../api/enaire';
import { buildVerdict, evaluateZones } from '../logic/verdict';
import type { Coords, QueryResult, Zone } from '../types';
import { ELEVATION_UNCERTAINTY_M, loadPack, type OfflinePack } from './pack';
import { bboxContains, interpolateElevation, pointInRings } from './geometry';

export function packCovers(pack: OfflinePack, coords: Coords): boolean {
  return bboxContains(pack.bbox, coords.lat, coords.lon);
}

/**
 * Resuelve un punto con el paquete descargado. Devuelve null si no hay paquete
 * o si el punto cae fuera del área descargada.
 */
export async function checkPointOffline(
  coords: Coords,
  flightHeightAgl: number,
): Promise<QueryResult | null> {
  const pack = await loadPack();
  if (!pack || !packCovers(pack, coords)) return null;

  const zones: Zone[] = [];
  let index = 0;
  for (const packed of pack.zones) {
    if (pointInRings(coords.lat, coords.lon, packed.rings)) {
      zones.push(normalizeZone(packed.attributes, packed.layer, index++));
    }
  }

  const interpolated = pack.elevation
    ? interpolateElevation(pack.elevation, coords.lat, coords.lon)
    : null;

  // Margen hacia el lado restrictivo: si el terreno real fuera más alto de lo
  // interpolado, las zonas referidas al nivel del mar empezarían más abajo.
  const terrain = interpolated === null ? null : interpolated + ELEVATION_UNCERTAINTY_M;

  const evaluated = evaluateZones(dedupeZones(zones), flightHeightAgl, terrain);
  const verdict = buildVerdict(evaluated, flightHeightAgl, []);

  return {
    coords,
    terrainElevation: interpolated,
    terrainSource: 'Rejilla descargada (Copernicus DEM vía Open-Meteo)',
    flightHeightAgl,
    zones: evaluated,
    verdict,
    queriedAt: new Date().toISOString(),
    failedLayers: [],
    offline: true,
    offlinePackDate: pack.createdAt,
    elevationUncertaintyM: ELEVATION_UNCERTAINTY_M,
  };
}
