/**
 * Elevación del terreno.
 *
 * Es imprescindible para ser rigurosos: ENAIRE publica muchos límites verticales
 * referidos a AMSL (nivel del mar). Si vuelas a 100 m sobre el suelo en un punto
 * cuyo terreno está a 660 m, tu dron está a ~760 m AMSL. Sin la elevación del
 * terreno no se puede saber si una zona te afecta o no.
 *
 * Fuente: Open-Meteo Elevation API (modelo digital del terreno Copernicus DEM
 * GLO-90). Gratuita, sin clave y sin registro.
 * https://open-meteo.com/en/docs/elevation-api
 */

const ENDPOINT = 'https://api.open-meteo.com/v1/elevation';

export const ELEVATION_SOURCE = 'Copernicus DEM GLO-90 (Open-Meteo)';

const cache = new Map<string, number>();

function cacheKey(lat: number, lon: number) {
  // ~11 m de resolución: suficiente para reutilizar consultas cercanas.
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export async function getTerrainElevation(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<number | null> {
  const key = cacheKey(lat, lon);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(`${ENDPOINT}?latitude=${lat}&longitude=${lon}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const value = Array.isArray(json?.elevation) ? Number(json.elevation[0]) : NaN;
    if (!Number.isFinite(value)) return null;
    cache.set(key, value);
    return value;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
