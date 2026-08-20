/**
 * Un punto compartido desde Maps.
 *
 * Compartes una chincheta desde Google Maps o Apple Maps, eliges Zona Dron y
 * la app comprueba ese punto. Lo que llega por el menú de compartir es texto:
 * a veces unas coordenadas, casi siempre un enlace.
 *
 * Los enlaces cortos (`maps.app.goo.gl`) no llevan coordenadas dentro: hay que
 * seguir la redirección para ver la URL larga. Por eso hay dos funciones: una
 * pura que saca el punto de un texto —comprobable sin red— y otra que además
 * resuelve el enlace corto.
 *
 * De un enlace de Google se prefiere `!3d…!4d…`, que son las coordenadas de la
 * chincheta, antes que `@lat,lon`, que es el centro del mapa cuando se
 * compartió. Suelen estar cerca, pero la chincheta es la que el usuario quiso
 * marcar.
 */

export interface SharedPoint {
  lat: number;
  lon: number;
  /** Nombre del sitio, si el enlace lo trae. */
  label: string | null;
}

const NUM = String.raw`-?\d{1,3}(?:\.\d+)?`;

function valid(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    // 0,0 es el Golfo de Guinea: es lo que devuelven los enlaces cuando no
    // llevan coordenadas de verdad (`geo:0,0?q=…`), no un punto compartido.
    !(lat === 0 && lon === 0)
  );
}

function point(lat: string | number, lon: string | number, label: string | null): SharedPoint | null {
  const la = Number(lat);
  const lo = Number(lon);
  return valid(la, lo) ? { lat: la, lon: lo, label } : null;
}

/** Nombres tipo `Playa+de+la+Malvarrosa` o `Playa%20de%20la%20Malvarrosa`. */
function readableName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    /* la URL viene mal codificada: se usa tal cual */
  }
  name = name.replace(/\+/g, ' ').trim();
  // Google mete la dirección o el place-id detrás del nombre en algunas
  // variantes; y unas coordenadas como nombre no aportan nada.
  if (!name || /^@?-?\d/.test(name) || name.length > 80) return null;
  return name;
}

function paramOf(text: string, name: string): string | null {
  const m = new RegExp(`[?&]${name}=([^&#]+)`, 'i').exec(text);
  return m ? m[1] : null;
}

/** Un `lat,lon` suelto dentro del valor de un parámetro. */
function coordsIn(value: string | null): { lat: string; lon: string } | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    /* se prueba con el original */
  }
  const m = new RegExp(`^\\s*(${NUM})\\s*,\\s*(${NUM})\\s*$`).exec(decoded);
  return m ? { lat: m[1], lon: m[2] } : null;
}

/**
 * El nombre del sitio compartido, si viene. Google lo pone en la ruta del
 * enlace largo y también como primera línea del texto que comparte; Apple lo
 * manda en `q` o en `name`.
 */
export function parseSharedLabel(input: string): string | null {
  const text = (input ?? '').trim();
  if (!text) return null;
  return (
    readableName(/\/maps\/place\/([^/@?]+)/.exec(text)?.[1]) ??
    readableName(paramOf(text, 'name')) ??
    readableName(paramOf(text, 'q')) ??
    readableName(/^([^\n\r]{2,80})[\n\r]+\s*https?:\/\//.exec(text)?.[1]) ??
    null
  );
}

/**
 * Saca el punto de un texto compartido. No toca la red: si el enlace es corto
 * devuelve null y hay que resolverlo antes (ver `resolveSharedPoint`).
 */
export function parseSharedPoint(input: string): SharedPoint | null {
  const text = (input ?? '').trim();
  if (!text) return null;

  const label = parseSharedLabel(text);

  // Google: coordenadas exactas de la chincheta.
  const pin = /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/.exec(text);
  if (pin) return point(pin[1], pin[2], label);

  // Apple Maps y variantes con parámetros.
  for (const name of ['ll', 'coordinate', 'sll', 'daddr', 'saddr', 'center', 'destination', 'query']) {
    const found = coordsIn(paramOf(text, name));
    if (found) return point(found.lat, found.lon, label);
  }

  // `?q=lat,lon` de Google y de los enlaces `geo:`.
  const q = coordsIn(paramOf(text, 'q'));
  if (q) return point(q.lat, q.lon, label);

  // `geo:38.34,-0.48` (menú de compartir de Android).
  const geo = new RegExp(`^geo:(${NUM}),(${NUM})`, 'i').exec(text);
  if (geo) {
    const fromQuery = coordsIn(paramOf(text, 'q'));
    if (fromQuery) return point(fromQuery.lat, fromQuery.lon, label);
    return point(geo[1], geo[2], label);
  }

  // Centro del mapa: `/@38.34,-0.48,17z`.
  const at = new RegExp(`/@(${NUM}),(${NUM})`).exec(text);
  if (at) return point(at[1], at[2], label);

  // Un texto que sólo son coordenadas, pegadas a mano o compartidas por WhatsApp.
  const bare = new RegExp(`^\\s*(${NUM})\\s*[,;\\s]\\s*(${NUM})\\s*$`).exec(text);
  if (bare) return point(bare[1], bare[2], null);

  return null;
}

/** Dominios que acortan y hay que seguir para ver las coordenadas. */
const SHORTENERS = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|maps\.apple\.com\/p\/)/i;

/** El primer enlace que aparezca en el texto compartido. */
export function firstUrl(text: string): string | null {
  return /https?:\/\/[^\s<>"']+/.exec(text ?? '')?.[0] ?? null;
}

const RESOLVE_TIMEOUT_MS = 8000;

/**
 * Sigue un enlace corto hasta la URL larga. Sólo interesa la dirección final,
 * no la página: por eso se pide con HEAD y no se descarga el cuerpo — la ficha
 * de un sitio de Google pasa de 100 KB y aquí no se usa para nada. Si el
 * servidor no admite HEAD, se reintenta con GET.
 */
async function expand(url: string, signal?: AbortSignal): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (!res.ok) {
      res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    }
    const finalUrl = res.url || null;
    if (!finalUrl) return null;
    // Google intercala a veces su pantalla de consentimiento; la URL buena
    // viaja dentro como `continue=`.
    const cont = paramOf(finalUrl, 'continue');
    if (cont) {
      try {
        return decodeURIComponent(cont);
      } catch {
        return finalUrl;
      }
    }
    return finalUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * El punto que se ha compartido, resolviendo el enlace corto si hace falta.
 * Devuelve null cuando el texto no lleva ningún sitio reconocible.
 */
export async function resolveSharedPoint(
  text: string,
  signal?: AbortSignal,
): Promise<SharedPoint | null> {
  const direct = parseSharedPoint(text);
  if (direct) return direct;

  const url = firstUrl(text);
  if (!url || !SHORTENERS.test(url)) return null;

  const expanded = await expand(url, signal);
  if (!expanded) return null;

  // El nombre del sitio suele ir en el texto compartido, no en la URL larga.
  const resolved = parseSharedPoint(expanded);
  if (!resolved) return null;
  return { ...resolved, label: resolved.label ?? parseSharedLabel(text) };
}
