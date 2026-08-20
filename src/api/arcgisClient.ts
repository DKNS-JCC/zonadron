/**
 * Cliente HTTP compartido para el servicio ArcGIS de Zonas Geográficas UAS de
 * ENAIRE (SRV_UAS_ZG_data_V2).
 *
 * Tres sitios distintos golpean el mismo endpoint `/query` — la consulta de un
 * punto (enaire.ts), el paquete sin cobertura (offline/pack.ts) y la búsqueda
 * de la zona más cercana (proximity.ts) — y los tres tienen que lidiar con las
 * mismas rarezas del servicio: HTML en vez de JSON cuando rechaza una petición
 * por carga, un `error` embebido dentro de una respuesta 200 válida, y 429/5xx
 * que merece la pena reintentar. Antes cada uno lo resolvía por su cuenta, con
 * ligeras diferencias — sólo la consulta de un punto reintentaba, las otras dos
 * fallaban a la primera. Ahora los tres pasan por aquí.
 */

import { t } from '../i18n';

export const ENAIRE_SERVICE =
  'https://servais.enaire.es/insigniads/rest/services/NSF_SRV/SRV_UAS_ZG_data_V2/MapServer';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Error que merece la pena reintentar (red, timeout, 5xx, rechazo por carga). */
class TransientError extends Error {}

async function fetchJsonOnce(url: string, signal: AbortSignal | undefined, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      // 5xx y 429 son transitorios; un 4xx distinto no va a mejorar reintentando.
      if (res.status >= 500 || res.status === 429) throw new TransientError(`HTTP ${res.status}`);
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    // Cuando el servicio rechaza una petición devuelve una página HTML, no JSON.
    // Suele pasar por peticiones simultáneas, así que se considera transitorio.
    if (text.trim().startsWith('<')) {
      throw new TransientError(t('error.enaireRejected'));
    }
    const json = JSON.parse(text);
    if (json?.error) {
      throw new Error(json.error?.message ?? t('error.enaire'));
    }
    return json;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Reintento corto y acotado. Sólo se reintentan errores transitorios, y nunca
 * se duerme después del último intento: una consulta interactiva debe fallar
 * rápido si va a fallar, porque hay alguien esperando de pie en el campo. Las
 * descargas de fondo (pack.ts) le pasan un `timeoutMs` mayor, no más reintentos.
 */
export async function fetchArcgisJson(url: string, signal?: AbortSignal, timeoutMs = 9000): Promise<any> {
  let lastError: unknown;
  const attempts = 4;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) throw new Error(t('error.cancelled'));
    try {
      return await fetchJsonOnce(url, signal, timeoutMs);
    } catch (err) {
      lastError = err;
      if (signal?.aborted) throw err;
      const transient =
        err instanceof TransientError ||
        (err instanceof Error && /abort|network|timeout|fetch/i.test(err.message));
      if (!transient || attempt === attempts - 1) break;
      await sleep(300 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(t('error.enaire'));
}
