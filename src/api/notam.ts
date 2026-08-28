/**
 * NOTAM (Notice to Air Missions) que afectan a drones.
 *
 * Un NOTAM es un aviso temporal a los que vuelan: hoy hay ejercicios militares
 * aquí, esta semana hay un espectáculo aéreo allá, este fin de semana está
 * activa una zona restringida para paracaidismo. Son restricciones que NO
 * aparecen en el mapa de zonas geográficas porque no son permanentes, y son
 * justo las que te pillan por sorpresa.
 *
 * ENAIRE los publica en un servicio propio para UAS, público y sin clave:
 * DINAMIC/UAS_NOTAM_SRV_DATA_V1
 *
 * Hay dos formas de preguntar, y las dos hacen falta:
 *  - `getNotamsAt`: los que caen sobre un punto. Es lo que alimenta al
 *    veredicto y a la tarjeta de avisos.
 *  - `getNotamsIn`: los de un rectángulo, CON su polígono, para pintarlos en
 *    el mapa. Saber que hay un NOTAM justo al lado, y no sólo bajo la cruz, es
 *    la diferencia entre esquivarlo y encontrártelo.
 *
 * Sobre el horario (item D): viene como texto libre («MON-FRI 0600-1400»,
 * «SEP 03-05 16-18 0600-2200»…). NO se interpreta: se muestra tal cual y se
 * avisa de que hay que leerlo. Fingir que se entiende sería justo el tipo de
 * error que esta app no se puede permitir.
 */

export const NOTAM_SERVICE =
  'https://servais.enaire.es/insigniads/rest/services/DINAMIC/UAS_NOTAM_SRV_DATA_V1/MapServer/1';

const FT_TO_M = 0.3048;

const OUT_FIELDS =
  'notamId,itemB,itemC,itemBstr,itemCstr,itemD,itemE,FLYING_LEVELS_DESC,LOWER_VAL,UPPER_VAL,qcode';

export interface Notam {
  id: string;
  /** Inicio de validez (epoch ms). */
  from: number | null;
  to: number | null;
  fromLabel: string;
  toLabel: string;
  /** Horario en texto libre, tal y como lo publica ENAIRE. */
  schedule: string;
  /** Texto del aviso (item E), en inglés aeronáutico. */
  text: string;
  /** Franja de alturas en texto ("GND / 00120M AGL"). */
  levels: string;
  lowerM: number | null;
  upperM: number | null;
  qcode: string;
  /** true si está dentro de su periodo de validez ahora mismo. */
  activeNow: boolean;
}

/** Un NOTAM con el polígono al que afecta, listo para pintar. */
export interface NotamArea extends Notam {
  /**
   * Anillos del polígono en [lat, lon] — el orden que quiere Leaflet, no el
   * [lon, lat] que devuelve ArcGIS. La conversión se hace aquí para que el
   * mapa no tenga que saber de qué servicio vienen los puntos.
   */
  rings: [number, number][][];
}

function clean(v: unknown): string {
  const s = String(v ?? '').trim();
  return s === 'null' || s === 'undefined' ? '' : s;
}

function toMs(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ftToM(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * FT_TO_M) : null;
}

function toNotam(attributes: any, now: number): Notam {
  const a = attributes ?? {};
  const from = toMs(a.itemB);
  const to = toMs(a.itemC);
  return {
    id: clean(a.notamId) || '—',
    from,
    to,
    fromLabel: clean(a.itemBstr),
    toLabel: clean(a.itemCstr),
    schedule: clean(a.itemD),
    text: clean(a.itemE).replace(/\s+/g, ' '),
    levels: clean(a.FLYING_LEVELS_DESC),
    lowerM: ftToM(a.LOWER_VAL),
    upperM: ftToM(a.UPPER_VAL),
    qcode: clean(a.qcode),
    activeNow: (from === null || from <= now) && (to === null || to >= now),
  };
}

/** Los caducados no interesan; los futuros sí, para que no te pillen. */
function pending(notams: Notam[], now: number): Notam[] {
  return notams
    .filter((n) => n.to === null || n.to >= now)
    .sort((a, b) => Number(b.activeNow) - Number(a.activeNow) || (a.from ?? 0) - (b.from ?? 0));
}

/** Petición al servicio, con su presupuesto de tiempo y sus errores traducidos. */
async function queryNotamService(
  params: URLSearchParams,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<any[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(`${NOTAM_SERVICE}/query?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.trim().startsWith('<')) throw new Error('El servicio de NOTAM ha rechazado la petición');
    const json = JSON.parse(text);
    if (json?.error) throw new Error(json.error?.message ?? 'Error del servicio de NOTAM');
    return json.features ?? [];
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function getNotamsAt(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  now: number = Date.now(),
): Promise<Notam[]> {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: OUT_FIELDS,
    returnGeometry: 'false',
    f: 'json',
  });

  const features = await queryNotamService(params, 10000, signal);
  return pending(
    features.map((f: any) => toNotam(f.attributes, now)),
    now,
  );
}

export interface NotamBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Máximo de NOTAM que se traen de una tacada. En toda España hay del orden de
 * 900, así que este tope sólo se toca si alguien se aleja muchísimo — y a esa
 * altura los polígonos ya no se distinguen unos de otros.
 */
const MAX_AREAS = 300;

/**
 * Los NOTAM de un rectángulo, con su polígono.
 *
 * `simplifyDeg` es la tolerancia con la que el servidor simplifica los
 * contornos (maxAllowableOffset): se le pasa lo que mide un píxel a ese zoom,
 * porque devolver vértices más finos que un píxel es gastar red en algo que no
 * se puede ver. Los polígonos se transmiten ya simplificados, no se recortan
 * aquí.
 */
export async function getNotamsIn(
  bounds: NotamBounds,
  simplifyDeg: number,
  signal?: AbortSignal,
  now: number = Date.now(),
): Promise<NotamArea[]> {
  const params = new URLSearchParams({
    geometry: `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: OUT_FIELDS,
    returnGeometry: 'true',
    // Cinco decimales son ~1 m: más que de sobra para un contorno de kilómetros.
    geometryPrecision: '5',
    maxAllowableOffset: String(simplifyDeg),
    resultRecordCount: String(MAX_AREAS),
    f: 'json',
  });

  const features = await queryNotamService(params, 12000, signal);

  const areas: NotamArea[] = [];
  for (const f of features) {
    const rings = (f?.geometry?.rings ?? [])
      .map((ring: [number, number][]) =>
        ring.map(([lon, lat]) => [lat, lon] as [number, number]),
      )
      // Con menos de tres puntos no hay polígono que pintar.
      .filter((ring: [number, number][]) => ring.length >= 3);
    if (rings.length === 0) continue;
    areas.push({ ...toNotam(f.attributes, now), rings });
  }

  return pending(areas, now) as NotamArea[];
}
