/**
 * Cliente educado de Open-Meteo.
 *
 * La API gratuita corta si le llegan muchas peticiones seguidas (HTTP 429), y
 * las mallas de elevación son justo eso: muchas peticiones seguidas. Aquí se
 * espacian y se reintenta con espera creciente, que es lo que pide su política
 * de uso y lo que evita que el 3D falle a la primera.
 */

const MIN_GAP_MS = 180;
let lastCall = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function paced<T>(fn: () => Promise<T>): Promise<T> {
  const since = Date.now() - lastCall;
  if (since < MIN_GAP_MS) await sleep(MIN_GAP_MS - since);
  lastCall = Date.now();
  return fn();
}

/** GET con reintentos ante 429 y errores de servidor. */
export async function openMeteoJson(
  url: string,
  signal?: AbortSignal,
  attempts = 4,
): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) throw new Error('cancelado');
    try {
      const res = await paced(() => fetch(url, { signal, headers: { Accept: 'application/json' } }));
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      if (signal?.aborted) throw err;
      if (attempt === attempts - 1) break;
      // Espera creciente: 0,6 s, 1,4 s, 2,6 s.
      await sleep(600 * (attempt + 1) + attempt * 200);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Open-Meteo no responde');
}

/** Elevaciones de una lista de puntos, en tandas de 100. */
export async function elevations(
  points: { lat: number; lon: number }[],
  signal?: AbortSignal,
  onProgress?: (pct: number) => void,
): Promise<number[] | null> {
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 100) {
    const chunk = points.slice(i, i + 100);
    const la = chunk.map((p) => p.lat.toFixed(5)).join(',');
    const lo = chunk.map((p) => p.lon.toFixed(5)).join(',');
    try {
      const json = await openMeteoJson(
        `https://api.open-meteo.com/v1/elevation?latitude=${la}&longitude=${lo}`,
        signal,
      );
      if (!Array.isArray(json?.elevation) || json.elevation.length !== chunk.length) return null;
      out.push(...json.elevation.map((v: unknown) => Number(v)));
      onProgress?.(out.length / points.length);
    } catch {
      return null;
    }
  }
  return out;
}
