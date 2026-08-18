/**
 * Buscador de lugares (geocodificación) y búsqueda inversa.
 *
 * Fuente: Nominatim / OpenStreetMap. Gratuito y sin clave.
 * Se respeta su política de uso: User-Agent identificativo, resultados
 * limitados a España y una sola petición por búsqueda (con retardo en la UI).
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const BASE = 'https://nominatim.openstreetmap.org';
/**
 * OJO: sólo ASCII. Las cabeceras HTTP no admiten caracteres no ASCII y Android
 * (OkHttp) lanza una excepción ANTES de enviar la petición si los encuentra.
 * Esta cabecera llevaba una tilde y hacía que el buscador fallara siempre en el
 * móvil con un "no se ha podido buscar", pareciendo un problema de conexión.
 */
const UA = 'ZonaDron/1.0 (Spain UAS geographical zones checker)';

/** Comprueba que no se cuela ningún carácter no ASCII en una cabecera. */
function asciiOnly(value: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(value) ? value : value.replace(/[^\x00-\x7F]/g, '');
}

export interface Place {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lon: number;
}

function splitName(displayName: string): { name: string; detail: string } {
  const parts = displayName.split(',').map((p) => p.trim());
  return { name: parts[0] ?? displayName, detail: parts.slice(1).join(', ') };
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  // Permite pegar coordenadas directamente: "40.4168, -3.7038"
  const coordMatch = q.match(/^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/);
  if (coordMatch) {
    const lat = Number(coordMatch[1].replace(',', '.'));
    const lon = Number(coordMatch[2].replace(',', '.'));
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return [{
        id: `coord:${lat},${lon}`,
        name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        detail: 'Coordenadas introducidas manualmente',
        lat,
        lon,
      }];
    }
  }

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '8',
    countrycodes: 'es',
    'accept-language': 'es',
    addressdetails: '0',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  const request = async (withUserAgent: boolean) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (withUserAgent) headers['User-Agent'] = asciiOnly(UA);
    const res = await fetch(`${BASE}/search?${params}`, { signal: controller.signal, headers });
    if (!res.ok) throw new Error(`El buscador ha respondido HTTP ${res.status}`);
    return res.json();
  };

  try {
    let json: unknown;
    try {
      json = await request(true);
    } catch (err) {
      // Si la cabecera de identificación da problemas en algún dispositivo,
      // se reintenta sin ella antes de rendirse.
      if (controller.signal.aborted) throw err;
      json = await request(false);
    }

    if (!Array.isArray(json)) return [];
    const seen = new Set<string>();
    return json
      .map((r: any) => {
        const { name, detail } = splitName(String(r.display_name ?? ''));
        return {
          id: String(r.place_id ?? `${r.lat},${r.lon}`),
          name: r.name ? String(r.name) : name,
          detail,
          lat: Number(r.lat),
          lon: Number(r.lon),
        } as Place;
      })
      .filter((p: Place) => {
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;
        // Nominatim devuelve a veces el mismo sitio varias veces (municipio,
        // núcleo, relación administrativa). ~100 m de tolerancia.
        const key = `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Nombre aproximado de un punto, para dar contexto al resultado. */
export async function describePoint(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    zoom: '14',
    'accept-language': 'es',
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(`${BASE}/reverse?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': asciiOnly(UA) },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const display = String(json?.display_name ?? '').trim();
    if (!display) return null;
    return display.split(',').slice(0, 3).join(',').trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
