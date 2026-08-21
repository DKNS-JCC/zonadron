/**
 * Un punto compartido desde Maps.
 *
 * Compartes una chincheta desde Google Maps o Apple Maps, eliges Zona Dron y
 * la app comprueba ese punto. Lo que llega por el menú de compartir es texto:
 * a veces unas coordenadas, casi siempre un enlace.
 *
 * Los enlaces cortos (`maps.app.goo.gl`, `share.google`) no llevan coordenadas
 * dentro: hay que seguir la redirección para ver la URL larga. Por eso hay dos
 * funciones: una pura que saca el punto de un texto —comprobable sin red— y
 * otra que además resuelve el enlace.
 *
 * De un enlace de Google se prefiere `!3d…!4d…`, que son las coordenadas de la
 * chincheta, antes que `@lat,lon`, que es el centro del mapa cuando se
 * compartió. Suelen estar cerca, pero la chincheta es la que el usuario quiso
 * marcar.
 *
 * Google no tiene un solo formato, tiene cinco, y cambia cuál te da según de
 * dónde salga el enlace: una ficha de sitio, una chincheta suelta, un
 * resultado de búsqueda, la app de Android o la web. Aquí están todos los que
 * hemos visto de verdad, y cuando la URL final no trae ninguno se mira la
 * página que devuelve —que sí lleva el sitio dentro— en vez de rendirse.
 */

import { searchPlaces } from '../api/geocode';

export interface SharedPoint {
  lat: number;
  lon: number;
  /** Nombre del sitio, si el enlace lo trae. */
  label: string | null;
  /**
   * true cuando el punto no venía en el enlace y se ha sacado buscando el
   * nombre del sitio: está donde diga el buscador, que puede no ser el local
   * exacto. Quien lo reciba tiene que avisar, no callárselo.
   */
  approximate?: boolean;
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

/**
 * El texto con los `%2C` y compañía ya deshechos. Una URL de Google puede
 * llegar codificada una vez, dos, o a medias según por dónde haya pasado, y
 * `38.3%2C-0.4` no lo caza ningún patrón que busque una coma.
 */
function decodeUrl(text: string): string {
  let out = text;
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9a-f]{2}/i.test(out)) break;
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch {
      // Codificada a medias (un `%` suelto): se deshace lo que se pueda.
      out = out.replace(/%2C/gi, ',').replace(/%2F/gi, '/').replace(/%3A/gi, ':');
      break;
    }
  }
  return out;
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
  // «Google Maps» es el título de la página cuando NO hay ficha de sitio: es
  // justo la señal de que no sabemos dónde estamos, no un nombre.
  if (/^(google )?(maps|mapas)$/i.test(name)) return null;
  // Identificadores internos de Google (`place_id:ChIJ…`, `0x…:0x…`). Parecen
  // un nombre porque van donde va el nombre, pero no se pueden ni enseñar ni
  // buscar en un geocodificador.
  if (/^(place_id|ftid|cid)\s*[:=]/i.test(name) || /^0x[0-9a-f]+:/i.test(name)) return null;
  return name;
}

function paramOf(text: string, name: string): string | null {
  const m = new RegExp(`[?&]${name}=([^&#]+)`, 'i').exec(text);
  return m ? m[1] : null;
}

/** Un `lat,lon` suelto dentro del valor de un parámetro. */
function coordsIn(value: string | null): { lat: string; lon: string } | null {
  if (!value) return null;
  const decoded = decodeUrl(value);
  const m = new RegExp(`^\\s*(${NUM})\\s*,\\s*\\+?\\s*(${NUM})\\s*$`).exec(decoded);
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
  const decoded = decodeUrl(text);

  // Google: coordenadas exactas de la chincheta.
  const pin = new RegExp(`!3d(${NUM})!4d(${NUM})`).exec(decoded);
  if (pin) return point(pin[1], pin[2], label);

  // Apple Maps y variantes con parámetros.
  for (const name of ['ll', 'coordinate', 'sll', 'daddr', 'saddr', 'center', 'destination', 'query']) {
    const found = coordsIn(paramOf(text, name));
    if (found) return point(found.lat, found.lon, label);
  }

  // `?q=lat,lon` de Google y de los enlaces `geo:`.
  const q = coordsIn(paramOf(text, 'q'));
  if (q) return point(q.lat, q.lon, label);

  // Coordenadas dentro de la propia ruta: `/maps/search/38.34,+-0.48`, que es
  // lo que da compartir una chincheta suelta —sin ficha de sitio—, y también
  // `/maps/place/38.34,-0.48`. El `+` es el espacio codificado de la URL.
  const inPath = new RegExp(
    `/maps/(?:search|place|dir|preview)/(?:[^/?#]*/)*?(${NUM}),\\+?\\s*(${NUM})`,
  ).exec(decoded);
  if (inPath) return point(inPath[1], inPath[2], label);

  // `geo:38.34,-0.48` (menú de compartir de Android).
  const geo = new RegExp(`^geo:(${NUM}),(${NUM})`, 'i').exec(text);
  if (geo) {
    const fromQuery = coordsIn(paramOf(text, 'q'));
    if (fromQuery) return point(fromQuery.lat, fromQuery.lon, label);
    return point(geo[1], geo[2], label);
  }

  // Centro del mapa: `/@38.34,-0.48,17z`.
  const at = new RegExp(`/@(${NUM}),(${NUM})`).exec(decoded);
  if (at) return point(at[1], at[2], label);

  // Un texto que sólo son coordenadas, pegadas a mano o compartidas por WhatsApp.
  const bare = new RegExp(`^\\s*(${NUM})\\s*[,;\\s]\\s*(${NUM})\\s*$`).exec(text);
  if (bare) return point(bare[1], bare[2], null);

  return null;
}

/* ------------------------------------------------------------------ */
/* Cuando la URL final no lleva coordenadas: mirar la página            */
/* ------------------------------------------------------------------ */

/**
 * El punto que va dentro de la página de Google Maps.
 *
 * Hay enlaces —fichas de local compartidas desde el móvil, `?ftid=`, `?cid=`—
 * cuya URL larga no lleva ni `!3d!4d` ni `@`: sólo el identificador del sitio.
 * La página que devuelve el servidor sí trae coordenadas, pero hay que
 * distinguir dos cosas que se parecen mucho y no valen lo mismo:
 *
 *  - **La chincheta** (`!3d…!4d…`, y la miniatura del mapa cuando la página es
 *    la ficha de un sitio): es el sitio, con metros de precisión.
 *  - **El encuadre** (el estado inicial de la aplicación, `/@`, y la miniatura
 *    de un mapa que no es de ningún sitio en concreto): es por dónde anda la
 *    vista, y puede quedarse a un kilómetro. Para decidir si se puede volar, un
 *    kilómetro es la diferencia entre un parque y un aeropuerto, así que eso
 *    sale marcado como aproximado y el usuario se entera.
 *
 * El estado inicial trae la longitud ANTES que la latitud; se comprueba, y si
 * no cuadra se prueba al revés antes que devolver un punto en otro continente.
 */
export function parsePointFromHtml(html: string): SharedPoint | null {
  if (!html) return null;
  const label = parseLabelFromHtml(html);

  const pin = new RegExp(`!3d(${NUM})!4d(${NUM})`).exec(html);
  if (pin) {
    const found = point(pin[1], pin[2], label);
    if (found) return found;
  }

  const center = new RegExp(`[?&]center=(${NUM})(?:,|%2C)(${NUM})`, 'i').exec(html);
  // La miniatura apunta al sitio cuando la página ES la de un sitio. Sin
  // nombre no hay ficha, y entonces es el mapa genérico centrado en cualquier
  // cosa: vale como aproximación, no como punto.
  if (center && label) {
    const found = point(center[1], center[2], label);
    if (found) return found;
  }

  // String.raw: en una plantilla normal `\s` se queda en «s» y el patrón deja
  // de encontrar nada, sin avisar de nada.
  const state = new RegExp(
    String.raw`APP_INITIALIZATION_STATE\s*=\s*\[\[\[[\d.]+,` + `(${NUM}),(${NUM})`,
  ).exec(html);
  const at = new RegExp(`/@(${NUM}),(${NUM})`).exec(html);

  // El encuadre, en el orden en que lo escribe cada cual: la miniatura y `@`
  // ponen la latitud primero; el estado inicial, al revés.
  const views: [string, string][] = [];
  if (center) views.push([center[1], center[2]]);
  if (state) views.push([state[2], state[1]]);
  if (at) views.push([at[1], at[2]]);
  for (const [lat, lon] of views) {
    const found = point(lat, lon, label) ?? point(lon, lat, label);
    if (found) return { ...found, approximate: true };
  }

  return null;
}

/** El nombre del sitio según la propia página, para cuando el texto no lo trae. */
export function parseLabelFromHtml(html: string): string | null {
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html);
  const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  const raw = og?.[1] ?? title?.[1] ?? null;
  if (!raw) return null;
  // «Playa de la Malvarrosa - Google Maps» → «Playa de la Malvarrosa».
  const clean = raw.replace(/\s*[-–]\s*Google (Maps|Mapas)\s*$/i, '').trim();
  return readableName(clean);
}

/* ------------------------------------------------------------------ */
/* Resolver el enlace                                                   */
/* ------------------------------------------------------------------ */

/**
 * Enlaces que hay que seguir para ver dónde caen. Además de los acortadores
 * están las fichas largas de Google y de Apple: muchas no llevan coordenadas
 * en la URL y sólo se sabe el sitio pidiendo la página.
 */
const RESOLVABLE =
  /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|share\.google|maps\.apple(\.com)?\/|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i;

/** El primer enlace que aparezca en el texto compartido. */
export function firstUrl(text: string): string | null {
  return /https?:\/\/[^\s<>"']+/.exec(text ?? '')?.[0] ?? null;
}

const RESOLVE_TIMEOUT_MS = 8000;

/** Lo que devuelve seguir un enlace: dónde acaba y, si se pidió, qué contesta. */
interface Followed {
  url: string;
  html: string | null;
}

/**
 * Sigue un enlace hasta su destino.
 *
 * Primero con HEAD, que sólo trae la dirección final y es lo que basta en la
 * mayoría de los casos. Cuando esa dirección no lleva coordenadas se repite
 * con GET y se lee la página: cuesta unos cientos de kilobytes, pero es la
 * diferencia entre resolver el sitio y decirle al usuario que no se ha podido.
 */
async function follow(url: string, wantHtml: boolean, signal?: AbortSignal): Promise<Followed | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, {
      method: wantHtml ? 'GET' : 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      // Sin esto Google contesta con la página de móvil recortada, que no
      // siempre trae el estado inicial con las coordenadas dentro.
      headers: { 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' },
    });
    const finalUrl = unwrapConsent(res.url || url);
    const html = wantHtml && res.ok ? await res.text() : null;
    return { url: finalUrl, html };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Google intercala a veces su pantalla de consentimiento; la URL buena viaja
 * dentro, en `continue=`.
 */
function unwrapConsent(url: string): string {
  const cont = paramOf(url, 'continue');
  if (!cont) return url;
  try {
    return decodeURIComponent(cont);
  } catch {
    return url;
  }
}

/**
 * El punto que se ha compartido, resolviendo el enlace si hace falta.
 *
 * Tres intentos, del más barato al más desesperado: la dirección final del
 * enlace, la página que hay detrás, y —si ahí tampoco hay coordenadas— buscar
 * el nombre del sitio en el geocodificador. Ese último sale marcado como
 * aproximado, porque «Bar Manolo» hay más de uno.
 *
 * Devuelve null cuando el texto no lleva ningún sitio reconocible.
 */
export async function resolveSharedPoint(
  text: string,
  signal?: AbortSignal,
): Promise<SharedPoint | null> {
  const direct = parseSharedPoint(text);
  if (direct) return direct;

  const url = firstUrl(text);
  if (!url || !RESOLVABLE.test(url)) return null;

  const sharedLabel = parseSharedLabel(text);
  const named = (found: SharedPoint | null) =>
    found ? { ...found, label: found.label ?? sharedLabel } : null;

  // 1. Barato: seguir la redirección y mirar la dirección final.
  const head = await follow(url, false, signal);
  if (head) {
    const found = named(parseSharedPoint(head.url));
    if (found) return found;
  }

  // 2. Caro: pedir la página entera y buscar el sitio dentro.
  const full = await follow(head?.url ?? url, true, signal);
  const finalUrl = full?.url ?? head?.url ?? null;

  let approximate: SharedPoint | null = null;
  if (full) {
    const fromUrl = named(parseSharedPoint(full.url));
    if (fromUrl) return fromUrl;
    if (full.html) {
      const fromHtml = named(parsePointFromHtml(full.html));
      // Lo exacto se devuelve ya; el encuadre se guarda por si no hay nada
      // mejor, que es peor que un nombre bien buscado.
      if (fromHtml && !fromHtml.approximate) return fromHtml;
      approximate = fromHtml;
    }
  }

  // 3. Último recurso: el nombre. Hay fichas —sobre todo de locales— que sólo
  // llevan el identificador del sitio y nada más; antes de decirle al usuario
  // que no se ha podido, se busca cómo se llama.
  const name =
    sharedLabel ??
    (full?.html ? parseLabelFromHtml(full.html) : null) ??
    (finalUrl ? parseSharedLabel(finalUrl) : null);
  if (name) {
    try {
      const places = await searchPlaces(name, signal);
      const first = places[0];
      if (first) return { lat: first.lat, lon: first.lon, label: name, approximate: true };
    } catch {
      /* sin buscador queda el encuadre, si lo hay */
    }
  }

  return approximate;
}
