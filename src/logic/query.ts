import { t } from '../i18n';
import { QUERY_BUDGET_MS, queryZonesAt } from '../api/enaire';
import { ELEVATION_SOURCE, getTerrainElevation } from '../api/elevation';
import { getNotamsAt } from '../api/notam';
import type { Coords, QueryResult } from '../types';
import { buildVerdict, evaluateZones } from './verdict';
import { checkPointOffline } from '../offline/evaluate';

/**
 * Consulta completa de un punto: zonas de ENAIRE + elevación del terreno,
 * y a partir de ahí el veredicto. Todo se ejecuta en el móvil.
 *
 * La consulta tiene un presupuesto de tiempo global: si la red va mal, es mejor
 * decir "no se ha podido comprobar" en 25 segundos que dejar al usuario mirando
 * un indicador de carga durante minutos.
 */
export async function checkPoint(
  coords: Coords,
  flightHeightAgl: number,
  signal?: AbortSignal,
): Promise<QueryResult> {
  const budget = new AbortController();
  const timer = setTimeout(() => budget.abort(), QUERY_BUDGET_MS);
  const onAbort = () => budget.abort();
  signal?.addEventListener('abort', onAbort);

  // Aparte del Promise.all: un NOTAM caído no puede tirar la comprobación de
  // zonas (son servicios independientes), así que se falla en silencio a null
  // en vez de dejar que su rechazo aborte todo lo demás.
  const notamsPromise = getNotamsAt(coords.lat, coords.lon, budget.signal).catch(() => null);

  try {
    const [zonesResult, terrainElevation] = await Promise.all([
      queryZonesAt(coords.lat, coords.lon, budget.signal),
      getTerrainElevation(coords.lat, coords.lon, budget.signal),
    ]);

    const evaluated = evaluateZones(zonesResult.zones, flightHeightAgl, terrainElevation);
    const verdict = buildVerdict(evaluated, flightHeightAgl, zonesResult.failedLayers);

    return {
      coords,
      terrainElevation,
      terrainSource: terrainElevation === null ? null : ELEVATION_SOURCE,
      flightHeightAgl,
      zones: evaluated,
      verdict,
      queriedAt: new Date().toISOString(),
      failedLayers: zonesResult.failedLayers,
      notams: await notamsPromise,
    };
  } catch (err) {
    if (signal?.aborted) throw err;

    // Sin conexión: si hay paquete descargado que cubra el punto, se resuelve
    // con él. Es la razón de ser del modo sin cobertura.
    const offline = await checkPointOffline(coords, flightHeightAgl).catch(() => null);
    if (offline) return offline;

    // Si el que ha abortado es nuestro presupuesto (y no el usuario), el mensaje
    // debe explicar qué ha pasado en vez de decir "cancelado".
    if (budget.signal.aborted) {
      throw new Error(t('query.timeout'));
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
