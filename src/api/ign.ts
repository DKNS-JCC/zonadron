/**
 * Elevación del terreno del Instituto Geográfico Nacional.
 *
 * Es la fuente preferente sobre Open-Meteo por tres motivos, medidos contra el
 * servicio real:
 *
 *  - No tiene cuota por minuto. Open-Meteo corta a las 600 coordenadas por
 *    minuto y a las 5.000 por hora, y una sola zona descargada se comía media
 *    cuota horaria: a partir de ahí la app se quedaba sin elevación y daba todo
 *    por restringido.
 *  - Trae la rejilla entera en una petición. Los 50×50 km de una zona son
 *    331×250 = 82.750 cotas en 0,4 s, frente a 2.652 cotas en 5 minutos.
 *  - Tiene más resolución: 5 m para un punto y 200 m para una zona, frente a
 *    los ~90 m del Copernicus DEM.
 *
 * Formato: WCS 2.0.1 con salida `application/asc`, o sea una rejilla ASCII de
 * toda la vida. Texto plano y sin dependencias, que es justo lo que se quiere
 * en un móvil.
 *
 * LÍMITE IMPORTANTE: sólo cubre España. Que la app sólo sirva en España no lo
 * vuelve inofensivo, porque fuera de su cobertura devuelve 0.000 en silencio,
 * sin marca de "sin dato" — y un terreno de 0 m es el error PELIGROSO: hace
 * parecer que las zonas referidas al nivel del mar empiezan más arriba de lo
 * que empiezan, o sea del lado permisivo. Comprobado: una petición sobre Oporto
 * devuelve una rejilla entera de ceros con aspecto de dato bueno.
 *
 * Por eso el cero se trata SIEMPRE como "sin dato" y quien llama necesita otra
 * vía. El precio es que una playa a 0 m exactos se resuelva por la otra fuente,
 * que es barato comparado con dar por volable lo que no lo es.
 */

import type { BBox, ElevationGrid } from '../offline/geometry';

const WCS = 'https://servicios.idee.es/wcs-inspire/mdt';

export const IGN_ELEVATION_SOURCE = 'MDT del IGN (España)';

/** Resoluciones publicadas por el servicio, en metros. */
const RESOLUTIONS = [5, 25, 200, 500, 1000] as const;
export type IgnResolution = (typeof RESOLUTIONS)[number];

/**
 * Resolución para cubrir un lado de `sideKm` sin pedir una rejilla enorme.
 *
 * Se apunta a unos 320 nodos por lado: por debajo la rejilla no aporta y por
 * encima la respuesta se dispara (y el paquete guardado con ella).
 */
export function resolutionForSide(sideKm: number, targetNodes = 320): IgnResolution {
  const stepM = (sideKm * 1000) / targetNodes;
  for (const r of RESOLUTIONS) {
    if (r >= stepM) return r;
  }
  return 1000;
}

/**
 * Las coberturas finas sólo existen en ETRS89 (EPSG:4258). Para España la
 * diferencia con WGS-84 es de centímetros, muy por debajo del error del propio
 * modelo, así que se piden con las coordenadas tal cual.
 */
function coverageId(resolution: IgnResolution): string {
  return `Elevacion4258_${resolution}`;
}

interface AsciiGrid {
  ncols: number;
  nrows: number;
  xll: number;
  yll: number;
  dx: number;
  dy: number;
  /** Fila 0 = borde SUR, ya volteada. NaN donde no hay dato. */
  values: number[];
}

/**
 * Parsea una rejilla ASCII.
 *
 * Dos detalles que, mal hechos, corrompen el resultado en silencio:
 *  - La respuesta viene en multipart, así que hay que saltarse las cabeceras.
 *  - En una rejilla ASCII la PRIMERA fila es la del NORTE. Comprobado contra el
 *    servicio: en una tira de Guadarrama el punto sur daba 1.111 m y coincidía
 *    con la última fila, y el norte 1.639 m con la primera. Aquí se voltea,
 *    porque `ElevationGrid` numera desde el sur.
 */
export function parseAsciiGrid(text: string): AsciiGrid | null {
  const num = (key: string): number | null => {
    const m = new RegExp(`^\\s*${key}\\s+(-?[\\d.]+)`, 'mi').exec(text);
    return m ? Number(m[1]) : null;
  };

  const ncols = num('ncols');
  const nrows = num('nrows');
  const xll = num('xllcorner');
  const yll = num('yllcorner');
  if (!ncols || !nrows || xll === null || yll === null) return null;

  const cell = num('cellsize');
  const dx = num('dx') ?? cell;
  const dy = num('dy') ?? cell;
  if (!dx || !dy) return null;

  const nodata = num('NODATA_value');

  // Las filas de datos son las que empiezan por número. Las cabeceras del
  // multipart y las del propio ASCII se descartan solas por eso.
  const rows: number[][] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || !/^[-\d]/.test(line)) continue;
    const parts = line.split(/\s+/);
    if (parts.length !== ncols) continue;
    const parsed = parts.map((v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return NaN;
      // El 0 exacto es la firma de "fuera de España" y no se distingue de un
      // dato real, así que no se usa nunca. Ver la cabecera del fichero.
      if (n === 0 || (nodata !== null && n === nodata)) return NaN;
      return n;
    });
    rows.push(parsed);
  }
  if (rows.length !== nrows) return null;

  // Voltear: la primera fila del fichero es la del norte.
  const values: number[] = [];
  for (let r = nrows - 1; r >= 0; r--) values.push(...rows[r]);

  return { ncols, nrows, xll, yll, dx, dy, values };
}

/**
 * Rejilla de elevaciones de un área, en una sola petición.
 *
 * Devuelve null si el servicio falla o si el área no tiene datos utilizables
 * (fuera de España). Nunca lanza: quien llama tiene otra fuente.
 */
export async function ignElevationGrid(
  bbox: BBox,
  resolution: IgnResolution,
  signal?: AbortSignal,
  timeoutMs = 30000,
): Promise<ElevationGrid | null> {
  const params = new URLSearchParams({
    service: 'WCS',
    version: '2.0.1',
    request: 'GetCoverage',
    coverageId: coverageId(resolution),
    format: 'application/asc',
  });
  const url =
    `${WCS}?${params}` +
    `&subset=lat(${bbox.minLat},${bbox.maxLat})` +
    `&subset=long(${bbox.minLon},${bbox.maxLon})`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const text = await res.text();
    // Ante un error el servicio contesta 200 con un ExceptionReport en XML.
    if (text.trimStart().startsWith('<')) return null;

    const grid = parseAsciiGrid(text);
    if (!grid) return null;

    const usable = grid.values.reduce((n, v) => (Number.isFinite(v) ? n + 1 : n), 0);
    // Área sin datos: no se devuelve una rejilla de nadas que luego haya que
    // distinguir de una buena.
    if (usable < grid.values.length / 2) return null;

    return {
      lat0: grid.yll,
      lon0: grid.xll,
      dLat: grid.dy,
      dLon: grid.dx,
      rows: grid.nrows,
      cols: grid.ncols,
      // A metro redondo: el modelo no da para más y el paquete se guarda en
      // JSON, donde tres decimales por cota multiplican el tamaño para nada.
      values: grid.values.map((v) => (Number.isFinite(v) ? Math.round(v) : NaN)),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Elevación de un punto suelto, a 5 m.
 *
 * Se pide un recuadro diminuto porque el servicio es de coberturas, no de
 * puntos; salen unas pocas celdas y se toma la del centro.
 */
export async function ignPointElevation(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<number | null> {
  const d = 0.0002; // ~20 m, unas cuantas celdas de 5 m
  const grid = await ignElevationGrid(
    { minLat: lat - d, maxLat: lat + d, minLon: lon - d, maxLon: lon + d },
    5,
    signal,
    12000,
  );
  if (!grid) return null;

  const r = Math.min(grid.rows - 1, Math.max(0, Math.floor(grid.rows / 2)));
  const c = Math.min(grid.cols - 1, Math.max(0, Math.floor(grid.cols / 2)));
  const v = grid.values[r * grid.cols + c];
  if (Number.isFinite(v)) return v;

  // El centro puede caer en un hueco; vale cualquier celda con dato.
  const any = grid.values.find((x) => Number.isFinite(x));
  return any === undefined ? null : any;
}
