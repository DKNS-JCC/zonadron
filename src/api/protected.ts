/**
 * Espacios naturales protegidos y Red Natura 2000.
 *
 * ENAIRE no publica esto: sus zonas geográficas UAS cubren el espacio aéreo
 * (aeropuertos, CTR, infraestructuras), no la protección ambiental del suelo.
 * Son dos regímenes distintos y un punto puede estar limpio en ENAIRE y aun
 * así dentro de un parque nacional donde volar está prohibido.
 *
 * Fuente: IEPNB (Inventario Español del Patrimonio Natural y de la
 * Biodiversidad, MITECO), servidor GeoServer público y sin clave:
 *   https://www.miteco.gob.es/es/cartografia-y-sig/ide/directorio_datos_servicios/biodiversidad/wms_bdn.html
 *
 * Se consulta con GetFeatureInfo y NO con el filtro `bbox` de WFS: `bbox`
 * compara contra la envolvente rectangular del polígono, así que un espacio
 * grande y dentado daba positivo a kilómetros de su borde real (comprobado:
 * la Puerta del Sol salía dentro de las «Vegas del sureste de Madrid»).
 * GetFeatureInfo hace la comprobación geométrica de verdad.
 *
 * `propertyName` es lo que evita descargarse la geometría completa del
 * espacio: sin él la respuesta de un parque grande son cientos de kB.
 *
 * IMPORTANTE: esto NUNCA cambia el veredicto. El vuelo en espacios protegidos
 * lo regula cada espacio con su PRUG o PORN, competencia de cada comunidad
 * autónoma, y va desde prohibido hasta permitido pasando por autorizable. Red
 * Natura 2000 cubre en torno a la cuarta parte de España: contarlo como
 * restricción pintaría de ámbar medio país, que es exactamente el ruido que
 * hace inservible una app así (mismo razonamiento que ADVISORY_LAYERS en
 * src/api/enaire.ts). Se muestra como aviso, con quién lo gestiona.
 */

const GEOSERVER = 'https://geoserver.iepnb.es/geoserver';

/** Campos que se piden. Sin esto vendría la geometría entera del espacio. */
const FIELDS = 'nombre,designacion,nombre_organismo,nb_grupo';

/** Semiancho del recuadro de consulta, en grados (~165 m de lado total). */
const HALF_SPAN_DEG = 0.0015;

export const PROTECTED_SOURCE = 'IEPNB · MITECO';

export interface ProtectedArea {
  name: string;
  /** Figura de protección: "Parque Nacional", "Parque Natural", "ZEC"… */
  designation: string | null;
  /** Quién lo gestiona, y por tanto a quién se le pide permiso. */
  organism: string | null;
  /** De qué capa viene, para no mezclar churras con merinas al agrupar. */
  source: 'enp' | 'rn2000';
}

/**
 * Figuras en las que el vuelo está prohibido o casi siempre exige permiso.
 * Se usa sólo para subir el tono del aviso, nunca para tocar el veredicto.
 */
const STRICT_FIGURES = [
  'parque nacional',
  'parque natural',
  'reserva natural',
  'reserva de la biosfera',
  'parque regional',
];

export function isStrictFigure(designation: string | null): boolean {
  if (!designation) return false;
  const d = designation.toLowerCase();
  return STRICT_FIGURES.some((f) => d.includes(f));
}

/** Convierte la respuesta de GeoServer en la lista de espacios. Puro: ver tests. */
export function parseProtectedAreas(json: unknown, source: ProtectedArea['source']): ProtectedArea[] {
  const features = (json as { features?: unknown[] })?.features;
  if (!Array.isArray(features)) return [];

  const clean = (v: unknown): string | null => {
    const s = String(v ?? '').trim();
    return s === '' || s === 'null' || s === 'undefined' ? null : s;
  };

  const out: ProtectedArea[] = [];
  for (const f of features) {
    const props = (f as { properties?: Record<string, unknown> })?.properties ?? {};
    const name = clean(props.nombre);
    if (!name) continue;
    out.push({
      name,
      designation: clean(props.designacion),
      organism: clean(props.nombre_organismo),
      source,
    });
  }
  return out;
}

async function queryLayer(
  workspace: string,
  layer: string,
  source: ProtectedArea['source'],
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<ProtectedArea[]> {
  // El punto cae justo en el centro del píxel consultado: con 101 píxeles de
  // lado y el recuadro centrado, el píxel 50 es exactamente lat/lon.
  const bbox = [
    lon - HALF_SPAN_DEG,
    lat - HALF_SPAN_DEG,
    lon + HALF_SPAN_DEG,
    lat + HALF_SPAN_DEG,
  ].join(',');

  const params = new URLSearchParams({
    SERVICE: 'WMS',
    // 1.1.1 a propósito: en 1.3.0 el orden de los ejes de EPSG:4326 cambia a
    // lat/lon y es una fuente de errores silenciosos.
    VERSION: '1.1.1',
    REQUEST: 'GetFeatureInfo',
    LAYERS: layer,
    QUERY_LAYERS: layer,
    SRS: 'EPSG:4326',
    BBOX: bbox,
    WIDTH: '101',
    HEIGHT: '101',
    X: '50',
    Y: '50',
    INFO_FORMAT: 'application/json',
    FEATURE_COUNT: '10',
    propertyName: FIELDS,
  });

  const res = await fetch(`${GEOSERVER}/${workspace}/wms?${params}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  // Ante un error el servidor devuelve un XML de excepción, no JSON.
  if (text.trim().startsWith('<')) throw new Error('El servicio del IEPNB ha rechazado la petición');
  return parseProtectedAreas(JSON.parse(text), source);
}

/**
 * Espacios protegidos que cubren un punto. Devuelve null si no se ha podido
 * consultar, y lista vacía si se ha consultado y no hay ninguno: son cosas
 * distintas y la tarjeta las cuenta distinto.
 */
export async function getProtectedAreasAt(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<ProtectedArea[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const [enp, rn2000] = await Promise.all([
      queryLayer('ENP', 'enp', 'enp', lat, lon, controller.signal),
      queryLayer('RN2000', 'rn2000', 'rn2000', lat, lon, controller.signal),
    ]);

    // Un mismo paraje sale a la vez como parque natural y como ZEC/ZEPA con el
    // mismo nombre: interesa la figura más restrictiva, no repetir la entrada.
    const byName = new Map<string, ProtectedArea>();
    for (const area of [...enp, ...rn2000]) {
      const key = area.name.toLowerCase();
      const previous = byName.get(key);
      if (!previous || (!isStrictFigure(previous.designation) && isStrictFigure(area.designation))) {
        byName.set(key, area);
      }
    }
    return [...byName.values()];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
