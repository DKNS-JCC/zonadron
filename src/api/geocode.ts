/**
 * Buscador de lugares (geocodificación) y búsqueda inversa.
 *
 * Fuente: Nominatim / OpenStreetMap. Gratuito y sin clave.
 * Se respeta su política de uso: User-Agent identificativo, resultados
 * limitados a España y una sola petición por búsqueda (con retardo en la UI).
 * https://operations.osmfoundation.org/policies/nominatim/
 */

import { acceptLanguage, t } from '../i18n';

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
        detail: t('geocode.manualCoords'),
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
    'accept-language': acceptLanguage(),
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

/** Lo que sabemos de un punto por su dirección, no por su altura. */
export interface PlaceDetails {
  /** Nombre corto para las cabeceras: "Mazarambroz, Toledo, Castilla-La Mancha". */
  label: string | null;
  /** Barrio, si el punto está dentro de uno. */
  neighbourhood: string | null;
  /** Municipio. */
  city: string | null;
  /** Comunidad autónoma en ISO 3166-2 (ES-PV, ES-NC…), para saber qué datos hay. */
  regionIso: string | null;
}

const EMPTY_PLACE: PlaceDetails = {
  label: null,
  neighbourhood: null,
  city: null,
  regionIso: null,
};

/**
 * Caché en memoria de la búsqueda inversa.
 *
 * La misma consulta la piden dos sitios —la cabecera quiere el nombre y la
 * tarjeta de entorno urbano quiere el barrio y la comunidad— y cambiar la
 * altura de vuelo relanza la consulta entera. Nominatim pide como mucho una
 * petición por segundo, así que se guarda por celda de ~11 m: sin esto
 * estaríamos pidiendo tres veces lo mismo.
 */
const placeCache = new Map<string, PlaceDetails>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

/** Toda la información de dirección de un punto, cacheada. */
export async function describePlace(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<PlaceDetails> {
  const key = cacheKey(lat, lon);
  const hit = placeCache.get(key);
  if (hit) return hit;

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    zoom: '14',
    addressdetails: '1',
    'accept-language': acceptLanguage(),
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
    if (!res.ok) return EMPTY_PLACE;
    const json = await res.json();
    const display = String(json?.display_name ?? '').trim();
    const a = (json?.address ?? {}) as Record<string, string>;
    const place: PlaceDetails = {
      label: display ? display.split(',').slice(0, 3).join(',').trim() : null,
      neighbourhood: a.neighbourhood ?? a.suburb ?? a.quarter ?? null,
      city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
      regionIso: a['ISO3166-2-lvl4'] ?? null,
    };
    // Sólo se cachea lo que ha respondido de verdad: un fallo de red no debe
    // dejar el punto marcado como "sin nombre" para el resto de la sesión.
    if (place.label || place.regionIso) placeCache.set(key, place);
    return place;
  } catch {
    return EMPTY_PLACE;
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
  return (await describePlace(lat, lon, signal)).label;
}
