/**
 * Mapa de "hasta dónde puedo subir aquí".
 *
 * En vez de responder a un punto, calcula la altura libre de una rejilla entera
 * y la pinta sobre el mapa como un degradado: verde donde puedes subir al
 * máximo, rojo donde no puedes despegar sin permiso, y todos los pasos
 * intermedios.
 *
 * Se resuelve con el paquete descargado, en el propio móvil y sin una sola
 * petición: hacerlo consultando a ENAIRE serían miles de peticiones.
 *
 * Sobre la resolución: la celda por defecto son 10 m de lado. Conviene saber de
 * dónde sale la nitidez de lo que se ve, porque no es la misma en las dos
 * dimensiones del problema:
 *
 *  - El BORDE de una zona es exacto. Es la geometría del polígono que publica
 *    ENAIRE, y a 10 m se ve con precisión de metros dónde empieza.
 *  - La variación de altura DENTRO de una zona la marca el terreno, y el
 *    terreno se interpola de la rejilla del paquete (~1 km entre nodos). Ahí el
 *    degradado es real pero suave: describe la orografía a escala de colina, no
 *    de parcela.
 *
 * Es decir: líneas nítidas donde manda la ley, degradado suave donde manda el
 * relieve. Y siempre con el margen pesimista de `elevationUncertaintyFor`.
 */

import { t } from '../i18n';
import { normalizeZone } from '../api/enaire';
import { OPEN_CATEGORY_CEILING_M, bandDependsOnTerrain, zoneBandAgl } from '../logic/verdict';
import type { Zone } from '../types';
import { interpolateElevation, metresPerDegree, ringsBBox } from './geometry';
import type { BBox } from './geometry';
import { elevationUncertaintyFor, type OfflinePack } from './model';

/** Valor de celda cuando la franja de alguna zona no se ha podido determinar. */
export const COVERAGE_UNKNOWN = -1;

/** Alturas libres de cada celda. -1 = no se ha podido determinar. */
export interface CoverageGrid {
  bbox: BBox;
  rows: number;
  cols: number;
  /** Fila 0 = borde sur. Valores en metros sobre el terreno. */
  values: number[];
  /** Lado real de la celda sobre el suelo, en metros. */
  cellMetres: number;
  computedAt: string;
}

export interface CoverageOptions {
  /** Lado fijo de la rejilla, en celdas. Lo usa la búsqueda de punto volable. */
  side?: number;
  /** Lado de celda deseado, en metros. Se respeta salvo que dispare `maxSide`. */
  cellMetres?: number;
  /**
   * Tope de celdas por lado. Existe porque la celda se pide en metros: sin tope,
   * alejar el mapa a media provincia pediría millones de celdas. Al llegar aquí
   * la celda crece y se avisa de su tamaño real en la leyenda.
   */
  maxSide?: number;
}

/** Lado de celda por defecto, en metros. */
export const DEFAULT_CELL_METRES = 10;

/**
 * Tope de celdas por lado. 320×320 son ~102.000 celdas: más fino que los
 * píxeles de la pantalla de un móvil, así que afinar más no se vería.
 */
export const DEFAULT_MAX_SIDE = 320;

interface PreparedZone {
  zone: Zone;
  rings: number[][][];
  bbox: BBox;
  /** true si su franja se mueve con el terreno; si no, se resuelve una vez. */
  terrainDependent: boolean;
}

/** Sólo las zonas que ponen techo: prohibidas o con autorización previa. */
function prepareBlockingZones(pack: OfflinePack): PreparedZone[] {
  const out: PreparedZone[] = [];
  let i = 0;
  for (const packed of pack.zones) {
    const zone = normalizeZone(packed.attributes, packed.layer, i++);
    if (zone.advisory) continue;
    if (zone.type !== 'PROHIBITED' && zone.type !== 'REQ_AUTHORIZATION' && zone.type !== 'UNKNOWN') {
      continue;
    }
    out.push({
      zone,
      rings: packed.rings,
      bbox: ringsBBox(packed.rings),
      terrainDependent: bandDependsOnTerrain(zone),
    });
  }
  return out;
}

/**
 * Los polígonos FIR del paquete: el contorno de España según el propio ENAIRE.
 *
 * Un paquete es un rectángulo, y un rectángulo descargado en Badajoz o en la
 * Cerdaña se lleva dentro trozos de Portugal o de Francia. Sin esto la rejilla
 * los pintaba del verde de «120 m libres», que es la misma mentira que daba el
 * veredicto de un punto. Ver `src/logic/airspace.ts`.
 *
 * Sale barato: el FIR de Madrid entero, con la generalización que aplica la
 * descarga, son ~1.000 vértices, y se recorre por filas como todo lo demás.
 */
function spanishAirspaceRings(pack: OfflinePack): number[][][] {
  const rings: number[][][] = [];
  let i = 0;
  for (const packed of pack.zones) {
    const zone = normalizeZone(packed.attributes, packed.layer, i++);
    if (zone.advisory) rings.push(...packed.rings);
  }
  return rings;
}

/**
 * Cortes de los anillos con una latitud, en longitud y ya ordenados.
 *
 * Es el mismo criterio de par/impar que `pointInRings`, resuelto una vez por
 * fila en vez de una vez por celda: es lo que hace viable una rejilla de 10 m.
 * Un punto está dentro cuando cae en [xs[2k], xs[2k+1]).
 */
function crossingsAtLat(rings: number[][][], lat: number, out: number[]): number[] {
  out.length = 0;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (yi > lat !== yj > lat) {
        out.push(((xj - xi) * (lat - yi)) / (yj - yi) + xi);
      }
    }
  }
  out.sort((a, b) => a - b);
  return out;
}

/**
 * Calcula la rejilla de alturas libres para un área.
 *
 * El tercer argumento admite un número (lado fijo en celdas, como lo usa la
 * búsqueda del punto volable más cercano) o las opciones en metros.
 */
export function computeCoverageGrid(
  pack: OfflinePack,
  area: BBox,
  options: number | CoverageOptions = {},
): CoverageGrid {
  const opts: CoverageOptions = typeof options === 'number' ? { side: options } : options;
  const zones = prepareBlockingZones(pack);

  // El área pedida se recorta a la que hay descargada: fuera de ella no se
  // puede afirmar nada, y pintar de verde lo desconocido sería lo peor.
  const bbox: BBox = {
    minLat: Math.max(area.minLat, pack.bbox.minLat),
    maxLat: Math.min(area.maxLat, pack.bbox.maxLat),
    minLon: Math.max(area.minLon, pack.bbox.minLon),
    maxLon: Math.min(area.maxLon, pack.bbox.maxLon),
  };

  const spanLat = bbox.maxLat - bbox.minLat;
  const spanLon = bbox.maxLon - bbox.minLon;
  const scale = metresPerDegree((bbox.minLat + bbox.maxLat) / 2);

  // Tamaño de la rejilla: o el lado fijo que pidan, o el que salga de la celda
  // en metros. Se usa el lado mayor del área para que la celda salga cuadrada.
  let rows: number;
  let cols: number;
  if (opts.side && opts.side > 0) {
    rows = opts.side;
    cols = opts.side;
  } else {
    const cell = Math.max(1, opts.cellMetres ?? DEFAULT_CELL_METRES);
    const maxSide = Math.max(1, opts.maxSide ?? DEFAULT_MAX_SIDE);
    rows = Math.min(maxSide, Math.max(1, Math.round((spanLat * scale.y) / cell)));
    cols = Math.min(maxSide, Math.max(1, Math.round((spanLon * scale.x) / cell)));
  }

  const dLat = spanLat / rows;
  const dLon = spanLon / cols;
  const cellMetres = Math.max(dLat * scale.y, dLon * scale.x);

  const values = new Array<number>(rows * cols).fill(OPEN_CATEGORY_CEILING_M);
  if (spanLat <= 0 || spanLon <= 0) {
    return { bbox, rows, cols, values, cellMetres, computedAt: new Date().toISOString() };
  }

  // Fuera de España no hay altura libre que calcular: esas celdas se marcan
  // como no determinables y se pintan del gris de «aquí no se sabe», nunca de
  // verde. Si el paquete no trajera ningún FIR (no debería pasar) no se
  // enmascara nada: es preferible el mapa de siempre a un mapa entero en gris.
  const airspace = spanishAirspaceRings(pack);
  if (airspace.length > 0) {
    const outsideRow: number[] = [];
    for (let r = 0; r < rows; r++) {
      const lat = bbox.minLat + (r + 0.5) * dLat;
      const xs = crossingsAtLat(airspace, lat, outsideRow);
      const inside = new Uint8Array(cols);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const startCol = Math.max(0, Math.ceil((xs[k] - bbox.minLon) / dLon - 0.5));
        const endCol = Math.min(cols - 1, Math.ceil((xs[k + 1] - bbox.minLon) / dLon - 0.5) - 1);
        for (let c = startCol; c <= endCol; c++) inside[c] = 1;
      }
      for (let c = 0; c < cols; c++) {
        if (!inside[c]) values[r * cols + c] = COVERAGE_UNKNOWN;
      }
    }
  }

  // Terreno de cada celda, con el mismo margen conservador que la evaluación de
  // un punto. Se precalcula porque cada zona que solape la celda lo volvería a
  // pedir, y la interpolación bilineal no es gratis.
  const uncertainty = elevationUncertaintyFor(pack.elevationStepKm);
  const terrain = new Array<number | null>(rows * cols).fill(null);
  if (pack.elevation) {
    for (let r = 0; r < rows; r++) {
      const lat = bbox.minLat + (r + 0.5) * dLat;
      for (let c = 0; c < cols; c++) {
        const lon = bbox.minLon + (c + 0.5) * dLon;
        const raw = interpolateElevation(pack.elevation, lat, lon);
        terrain[r * cols + c] = raw === null ? null : raw + uncertainty;
      }
    }
  }

  const crossings: number[] = [];

  for (const prepared of zones) {
    const zb = prepared.bbox;
    if (zb.maxLat < bbox.minLat || zb.minLat > bbox.maxLat) continue;
    if (zb.maxLon < bbox.minLon || zb.minLon > bbox.maxLon) continue;

    // Filas que puede tocar esta zona, en índices de la rejilla.
    const firstRow = Math.max(0, Math.floor((zb.minLat - bbox.minLat) / dLat - 0.5));
    const lastRow = Math.min(rows - 1, Math.ceil((zb.maxLat - bbox.minLat) / dLat - 0.5));

    // Zona de franja fija: se resuelve una sola vez para toda su superficie.
    let fixedFloor = 0;
    let fixedSkip = false;
    let fixedUnknown = false;
    if (!prepared.terrainDependent) {
      const band = zoneBandAgl(prepared.zone, null);
      fixedUnknown = band.lowerAgl === null;
      fixedSkip = band.upperAgl !== null && band.upperAgl < 0;
      fixedFloor = Math.max(0, band.lowerAgl ?? 0);
      if (fixedSkip) continue;
    }

    for (let r = firstRow; r <= lastRow; r++) {
      const lat = bbox.minLat + (r + 0.5) * dLat;
      const xs = crossingsAtLat(prepared.rings, lat, crossings);

      for (let k = 0; k + 1 < xs.length; k += 2) {
        const startCol = Math.max(0, Math.ceil((xs[k] - bbox.minLon) / dLon - 0.5));
        const endCol = Math.min(cols - 1, Math.ceil((xs[k + 1] - bbox.minLon) / dLon - 0.5) - 1);

        for (let c = startCol; c <= endCol; c++) {
          const i = r * cols + c;
          if (values[i] === COVERAGE_UNKNOWN) continue; // ya es lo peor posible

          if (!prepared.terrainDependent) {
            if (fixedUnknown) {
              values[i] = COVERAGE_UNKNOWN;
            } else if (fixedFloor < values[i]) {
              values[i] = fixedFloor;
            }
            continue;
          }

          const band = zoneBandAgl(prepared.zone, terrain[i]);
          // Zona cuyo techo queda bajo tierra: no aplica.
          if (band.upperAgl !== null && band.upperAgl < 0) continue;
          if (band.lowerAgl === null) {
            values[i] = COVERAGE_UNKNOWN;
            continue;
          }
          const floor = Math.max(0, band.lowerAgl);
          if (floor < values[i]) values[i] = floor;
        }
      }
    }
  }

  for (let i = 0; i < values.length; i++) {
    if (values[i] !== COVERAGE_UNKNOWN) values[i] = Math.floor(values[i]);
  }

  return { bbox, rows, cols, values, cellMetres, computedAt: new Date().toISOString() };
}

/* ------------------------------------------------------------------ */
/* Color                                                                */
/* ------------------------------------------------------------------ */

/**
 * Paradas de la rampa de color, en metros de altura libre.
 *
 * Se interpola entre ellas para que el mapa sea un degradado y no cinco
 * escalones: entre 20 m y 70 m de margen hay una diferencia que importa, y con
 * escalones se pintaban del mismo color.
 */
export const COVERAGE_STOPS: [number, string][] = [
  [0, '#BE2318'],
  [15, '#D14E0B'],
  [30, '#DA7B00'],
  [50, '#C79A00'],
  [70, '#A3A800'],
  [95, '#5C9A22'],
  [OPEN_CATEGORY_CEILING_M, '#07835A'],
];

/** Celda cuya franja no se ha podido determinar. */
export const COVERAGE_UNKNOWN_COLOR = '#4A5A70';

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const v = (1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b);
  return `#${v.toString(16).slice(1)}`;
}

/** Color de una altura libre, interpolado dentro de la rampa. */
export function coverageColor(metres: number): string {
  if (metres < 0) return COVERAGE_UNKNOWN_COLOR;
  const stops = COVERAGE_STOPS;
  if (metres <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (metres >= last[0]) return last[1];

  for (let i = 1; i < stops.length; i++) {
    if (metres > stops[i][0]) continue;
    const [m0, c0] = stops[i - 1];
    const [m1, c1] = stops[i];
    const tt = (metres - m0) / (m1 - m0);
    const a = hex(c0);
    const b = hex(c1);
    return toHex(a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt, a[2] + (b[2] - a[2]) * tt);
  }
  return last[1];
}

/** Marcas numéricas de la barra de degradado de la leyenda. */
export function coverageTicks(): { metres: number; label: string }[] {
  return [0, 30, 60, 90, OPEN_CATEGORY_CEILING_M].map((m) => ({
    metres: m,
    label: m === 0 ? '0' : String(m),
  }));
}

export function coverageLegend(): { color: string; label: string }[] {
  return [
    { color: coverageColor(OPEN_CATEGORY_CEILING_M), label: t('coverage.legend.max') },
    { color: coverageColor(0), label: t('coverage.legend.none') },
    { color: COVERAGE_UNKNOWN_COLOR, label: t('coverage.legend.unknown') },
  ];
}

/* ------------------------------------------------------------------ */
/* Transporte al mapa                                                   */
/* ------------------------------------------------------------------ */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Marca de celda sin determinar dentro del byte transportado. */
export const COVERAGE_UNKNOWN_BYTE = 255;

/**
 * Empaqueta las alturas en base64, un byte por celda.
 *
 * A 10 m de celda una vista puede tener cien mil celdas: mandarlas al mapa como
 * cien mil cadenas de color en JSON serían varios megas por cada movimiento del
 * mapa. Un byte por celda (0-120 m, o 255 si no se sabe) son ~140 KB, y el
 * color lo pone el propio mapa con la rampa que va en el mismo mensaje.
 */
export function encodeCoverage(values: number[]): string {
  const n = values.length;
  const byteAt = (i: number) => {
    const v = values[i];
    if (v < 0) return COVERAGE_UNKNOWN_BYTE;
    return v > OPEN_CATEGORY_CEILING_M ? OPEN_CATEGORY_CEILING_M : v;
  };

  let out = '';
  let i = 0;
  for (; i + 2 < n; i += 3) {
    const a = byteAt(i);
    const b = byteAt(i + 1);
    const c = byteAt(i + 2);
    out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)] + B64[((b & 15) << 2) | (c >> 6)] + B64[c & 63];
  }
  if (i < n) {
    const a = byteAt(i);
    const b = i + 1 < n ? byteAt(i + 1) : 0;
    out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < n ? B64[(b & 15) << 2] : '=';
    out += '=';
  }
  return out;
}
