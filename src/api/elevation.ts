/**
 * Elevación del terreno.
 *
 * Es imprescindible para ser rigurosos: ENAIRE publica muchos límites verticales
 * referidos a AMSL (nivel del mar). Si vuelas a 100 m sobre el suelo en un punto
 * cuyo terreno está a 660 m, tu dron está a ~760 m AMSL. Sin la elevación del
 * terreno no se puede saber si una zona te afecta o no.
 *
 * Y "no se puede saber" no es neutral: el motor se pone en lo peor y da por
 * afectada toda zona con techo sobre el nivel del mar, o sea casi todas. Que
 * esto falle en silencio deja la app diciendo que no puedes volar en ninguna
 * parte, sin explicar por qué. Por eso aquí se reintenta de verdad y por eso
 * hay dos fuentes independientes.
 *
 * Fuentes, por orden:
 *  1. MDT del IGN (5 m, sin cuota). Ver `./ign.ts`.
 *  2. Open-Meteo / Copernicus DEM GLO-90 (~90 m, con cuota).
 *
 * El orden no es casual: con Open-Meteo sola, descargar una zona se comía media
 * cuota horaria y dejaba a la app sin elevación durante un rato — o sea, dando
 * todo por restringido.
 *
 * Y la segunda fuente NO está por cubrir otros países: esta app sólo sirve en
 * España. Está por disponibilidad, que es un motivo más fuerte. Se usa cuando
 * el IGN no contesta, cuando el punto da 0 m exactos (que su servicio no
 * distingue de "sin dato", ver ign.ts) y en la franja fronteriza donde su
 * cobertura se acaba. Quitarla deja a la app sin terreno en cuanto el IGN
 * tenga un mal rato, y sin terreno el motor da todo por prohibido.
 */

import { openMeteoJson } from './openMeteo';
import { IGN_ELEVATION_SOURCE, ignPointElevation } from './ign';

export const ELEVATION_SOURCE = 'Copernicus DEM GLO-90 (Open-Meteo)';

export interface TerrainElevation {
  metres: number;
  source: string;
}

const cache = new Map<string, TerrainElevation>();

function cacheKey(lat: number, lon: number) {
  // ~11 m de resolución: suficiente para reutilizar consultas cercanas.
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export async function getTerrainElevation(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<TerrainElevation | null> {
  const key = cacheKey(lat, lon);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  // Primero el IGN: más resolución (5 m frente a ~90 m) y sin cuota.
  // Open-Meteo queda de respaldo por si no contesta.
  const ign = await ignPointElevation(lat, lon, signal);
  if (ign !== null) {
    const value = { metres: ign, source: IGN_ELEVATION_SOURCE };
    cache.set(key, value);
    return value;
  }

  try {
    const json = await openMeteoJson(
      `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`,
      {
        signal,
        weight: 1,
        attempts: 3,
        // Cero espera a propósito: si el minuto está agotado —normalmente
        // porque hay una descarga de zona en marcha— más vale resolverlo con
        // la rejilla descargada al instante que tener al usuario mirando el
        // mapa parado un minuto. Las consultas de un punto tienen además su
        // propia reserva de presupuesto, así que rara vez llegan aquí.
        maxWaitMs: 0,
      },
    );
    const metres = Array.isArray(json?.elevation) ? Number(json.elevation[0]) : NaN;
    if (!Number.isFinite(metres)) return null;
    const value = { metres, source: ELEVATION_SOURCE };
    cache.set(key, value);
    return value;
  } catch {
    return null;
  }
}
