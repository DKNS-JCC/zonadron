/**
 * Cliente del servicio oficial de Zonas Geográficas UAS de ENAIRE.
 *
 * Servicio  : SRV_UAS_ZG_data_V2 (ArcGIS REST, datos en formato ED-318)
 * Publicado : https://aip.enaire.es/AIP/UAS-es.html
 * Doc. API  : https://aip.enaire.es/recursos/descargas/ZGUAS/servAIS_APIDOC.pdf
 *
 * Todo se consulta directamente desde el móvil: la app no tiene servidor propio
 * ni intermediarios, así que el dato que ves es exactamente el que publica ENAIRE.
 */

import type { LayerKey, RawZoneAttributes, VerticalRef, Zone, ZoneType } from '../types';
import { htmlToText } from '../logic/html';
import { parseReferenceElevation } from '../logic/reference';
import { layerLabel } from '../logic/labels';
import { ENAIRE_SERVICE, fetchArcgisJson } from './arcgisClient';

export { ENAIRE_SERVICE };

export const ENAIRE_DRONES_URL = 'https://drones.enaire.es/';
export const ENAIRE_AIP_UAS_URL = 'https://aip.enaire.es/AIP/UAS-es.html';

/** Nombres de capa publicados por ENAIRE, y su id por defecto (fallback). */
const LAYER_DEFS: Record<LayerKey, { name: string; fallbackId: number }> = {
  infraestructuras: { name: 'ZGUAS_Infraestructuras', fallbackId: 0 },
  aero: { name: 'ZGUAS_Aero', fallbackId: 2 },
  urbano: { name: 'ZGUAS_Urbano', fallbackId: 3 },
};

export const LAYER_KEYS: LayerKey[] = ['aero', 'urbano', 'infraestructuras'];

/**
 * Capas que ENAIRE publica como AVISO GENERAL y no como restricción localizada.
 *
 * La capa `ZGUAS_Urbano` contiene sólo 4 polígonos (NPDRID, NPLONA, NPRIAS,
 * NPILLA) que cubren España entera. Sus propios metadatos oficiales lo explican:
 *
 *   «Los datos de estas zonas geográficas UAS generales han sido obtenidos a
 *    través de los espacios aéreos FIR cargados en la base de datos INSIGNIA.»
 *   — ZGUAS_Urbano_Metadata.txt (ENAIRE)
 *
 * Es decir: son las cuatro FIR españolas, no los cascos urbanos. Su texto no
 * dice «estás en zona urbana», dice «antes de volar COMPRUEBE si la zona de
 * vuelo se encuentra en entorno urbano» y explica qué hacer si lo está.
 *
 * Por eso se tratan como aviso permanente y no cuentan para el veredicto: si
 * contaran, cualquier punto de España saldría como «necesitas autorización»,
 * que es justamente el ruido que hace inservible una app de este tipo. El aviso
 * se muestra siempre, íntegro, en su propia tarjeta.
 */
export const ADVISORY_LAYERS: LayerKey[] = ['urbano'];

/**
 * Identificadores concretos de esos cuatro polígonos FIR. Se comprueba también
 * el identificador, y no sólo la capa, para que si algún día ENAIRE añade zonas
 * urbanas localizadas de verdad a esta capa entren al veredicto por defecto en
 * vez de quedar silenciosamente clasificadas como aviso.
 */
export const ADVISORY_IDS = new Set(['NPDRID', 'NPLONA', 'NPRIAS', 'NPILLA']);

function isAdvisory(layer: LayerKey, identifier: string): boolean {
  return ADVISORY_LAYERS.includes(layer) && ADVISORY_IDS.has(identifier.toUpperCase());
}

/**
 * Se piden todos los campos (`*`) a propósito: las tres capas de ENAIRE no
 * tienen exactamente el mismo esquema (p. ej. `limitedApplicability` sólo
 * existe en la capa aeronáutica) y pedir una lista fija hacía fallar las otras
 * dos capas en silencio. Con `*` la consulta es válida en las tres y sigue
 * funcionando si ENAIRE añade campos nuevos.
 */
const OUT_FIELDS = '*';

/* ------------------------------------------------------------------ */
/* Resolución de ids de capa (con caché en memoria y fallback seguro)   */
/* ------------------------------------------------------------------ */

let layerIdCache: Record<LayerKey, number> | null = null;
let layerIdPromise: Promise<Record<LayerKey, number>> | null = null;

/**
 * El catálogo es un recurso compartido: la promesa se cachea para todos los
 * llamantes, así que NO se le pasa el `signal` de ninguno en concreto. Si se
 * pasara, el primero que cancelase dejaría a los demás con los ids de reserva
 * sin que nadie se enterase.
 */
async function resolveLayerIds(): Promise<Record<LayerKey, number>> {
  if (layerIdCache) return layerIdCache;
  if (layerIdPromise) return layerIdPromise;

  layerIdPromise = (async () => {
    const fallback = {
      aero: LAYER_DEFS.aero.fallbackId,
      urbano: LAYER_DEFS.urbano.fallbackId,
      infraestructuras: LAYER_DEFS.infraestructuras.fallbackId,
    };
    try {
      const res = await fetchArcgisJson(`${ENAIRE_SERVICE}?f=json`, undefined, 9000);
      const layers: Array<{ id: number; name: string }> = res?.layers ?? [];
      const resolved = { ...fallback };
      for (const key of LAYER_KEYS) {
        const match = layers.find((l) => l.name === LAYER_DEFS[key].name);
        if (match) resolved[key] = match.id;
      }
      layerIdCache = resolved;
      return resolved;
    } catch {
      // Si el catálogo no responde seguimos con los ids conocidos.
      return fallback;
    } finally {
      layerIdPromise = null;
    }
  })();

  return layerIdPromise;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tiempo máximo que se le concede a una consulta completa antes de rendirse. */
export const QUERY_BUDGET_MS = 25000;

/* ------------------------------------------------------------------ */
/* Normalización de atributos                                           */
/* ------------------------------------------------------------------ */

const VALID_TYPES: ZoneType[] = [
  'PROHIBITED', 'REQ_AUTHORIZATION', 'CONDITIONAL', 'NO_RESTRICTION',
];

function normalizeType(value: unknown): ZoneType {
  const v = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return (VALID_TYPES as string[]).includes(v) ? (v as ZoneType) : 'UNKNOWN';
}

function normalizeRef(value: unknown): VerticalRef {
  const v = String(value ?? '').trim().toUpperCase();
  if (v === 'AGL' || v === 'SFC' || v === 'GND') return 'AGL';
  if (v === 'AMSL' || v === 'MSL') return 'AMSL';
  if (v === 'W84' || v === 'WGS84' || v === 'WGS-84') return 'W84';
  return 'UNKNOWN';
}

const FT_TO_M = 0.3048;

function toMetres(value: unknown, uom: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return uom === 'FT' ? n * FT_TO_M : n;
}

function clean(value: unknown): string {
  const s = String(value ?? '').trim();
  return s === 'None' || s === 'null' || s === 'undefined' ? '' : s;
}

function splitReasons(value: unknown): string[] {
  const s = clean(value);
  if (!s) return [];
  return s
    .split(/[,;|]/)
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);
}

function buildTitle(attrs: RawZoneAttributes, layer: LayerKey): string {
  if (ADVISORY_LAYERS.includes(layer)) return 'Entorno urbano: compruébalo antes de volar';
  const name = clean(attrs.name);
  if (name) return name;
  const ext = clean(attrs.extendedProperties);
  const id = clean(attrs.identifier);
  if (ext && id) return `${ext} · ${id}`;
  if (ext) return ext;
  if (id) return `${layerLabel[layer]} ${id}`;
  return `Zona ${layerLabel[layer].toLowerCase()}`;
}

export function normalizeZone(attrs: RawZoneAttributes, layer: LayerKey, index: number): Zone {
  const uomRaw = clean(attrs.uom).toUpperCase();
  const uom: Zone['uom'] = uomRaw === 'FT' ? 'FT' : uomRaw === 'M' ? 'M' : 'UNKNOWN';
  // Si no sabemos la unidad, tampoco sabemos la franja: se marca la referencia
  // como desconocida para que el motor considere que la zona te afecta.
  const trustLimits = uom !== 'UNKNOWN';
  // Algunas capas rellenan `message` y otras sólo `description`; se usa el que haya.
  const html = clean(attrs.message) || clean(attrs.description);
  const officialText = htmlToText(html);
  const reference = parseReferenceElevation(officialText);

  return {
    key: `${layer}:${clean(attrs.identifier) || 'sin-id'}:${attrs.OBJECTID ?? index}`,
    layer,
    identifier: clean(attrs.identifier) || '—',
    title: buildTitle(attrs, layer),
    type: normalizeType(attrs.type),
    reasons: splitReasons(attrs.reasons),
    officialHtml: html,
    officialText,
    referenceElevation: reference.metres,
    referenceElevationMissing: reference.missing,
    advisory: isAdvisory(layer, clean(attrs.identifier)),
    lower: toMetres(attrs.lower, uom),
    lowerRef: trustLimits ? normalizeRef(attrs.lowerReference) : 'UNKNOWN',
    upper: toMetres(attrs.upper, uom),
    upperRef: trustLimits ? normalizeRef(attrs.upperReference) : 'UNKNOWN',
    uom,
    contact: {
      name: clean(attrs.contactName) || undefined,
      email: clean(attrs.email) || undefined,
      phone: clean(attrs.phone) || undefined,
      url: clean(attrs.siteURL) || undefined,
    },
    applicability: {
      startDateTime: clean(attrs.startDateTime) || undefined,
      endDateTime: clean(attrs.endDateTime) || undefined,
      day: clean(attrs.day) || undefined,
      startTime: clean(attrs.startTime) || undefined,
      endTime: clean(attrs.endTime) || undefined,
      limited: clean(attrs.limitedApplicability) || undefined,
    },
    updatedAt: clean(attrs.updateDateTime) || undefined,
    raw: attrs,
  };
}

/**
 * ENAIRE trocea algunas zonas en varios polígonos contiguos; al consultar un
 * punto pueden salir duplicados idénticos. Se agrupan por contenido real.
 */
export function dedupeZones(zones: Zone[]): Zone[] {
  const seen = new Map<string, Zone>();
  for (const z of zones) {
    const fingerprint = [
      z.layer, z.identifier, z.type, z.lower, z.lowerRef, z.upper, z.upperRef,
      z.officialText.slice(0, 400), z.title,
    ].join('¦');
    if (!seen.has(fingerprint)) seen.set(fingerprint, z);
  }
  return [...seen.values()];
}

/* ------------------------------------------------------------------ */
/* Consulta principal                                                   */
/* ------------------------------------------------------------------ */

export interface LayerQueryOutcome {
  layer: LayerKey;
  zones: Zone[];
  error?: string;
}

async function queryLayer(
  layerKey: LayerKey,
  layerId: number,
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<LayerQueryOutcome> {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: OUT_FIELDS,
    returnGeometry: 'false',
    outSR: '4326',
    f: 'json',
  });

  try {
    const json = await fetchArcgisJson(`${ENAIRE_SERVICE}/${layerId}/query?${params}`, signal);
    const features: Array<{ attributes: RawZoneAttributes }> = json?.features ?? [];
    const zones = features.map((f, i) => normalizeZone(f.attributes ?? {}, layerKey, i));
    return { layer: layerKey, zones: dedupeZones(zones) };
  } catch (err) {
    return {
      layer: layerKey,
      zones: [],
      error: err instanceof Error ? err.message : 'Error desconocido',
    };
  }
}

/** Consulta las tres capas de ENAIRE para un punto (lat/lon en WGS-84). */
export async function queryZonesAt(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<{ zones: Zone[]; failedLayers: LayerKey[]; errors: string[] }> {
  const ids = await resolveLayerIds();

  // IMPORTANTE: las capas se consultan una detrás de otra, no en paralelo.
  // El servicio de ENAIRE rechaza las peticiones simultáneas desde un mismo
  // cliente devolviendo una página HTML en lugar de JSON, lo que provocaba
  // resultados incompletos sin que se notara. En secuencia tarda ~1 segundo.
  const outcomes: LayerQueryOutcome[] = [];
  for (const key of LAYER_KEYS) {
    if (outcomes.length > 0) await sleep(200); // respiro entre capas: el servicio limita el ritmo
    outcomes.push(await queryLayer(key, ids[key], lat, lon, signal));
  }

  const zones = outcomes.flatMap((o) => o.zones);
  const failedLayers = outcomes.filter((o) => o.error).map((o) => o.layer);
  const errors = outcomes.filter((o) => o.error).map((o) => `${o.layer}: ${o.error}`);

  if (failedLayers.length === LAYER_KEYS.length) {
    throw new Error(
      'No se ha podido contactar con el servicio de ENAIRE. Comprueba tu conexión a internet.',
    );
  }

  return { zones: dedupeZones(zones), failedLayers, errors };
}

/** URL de teselas del visor oficial, para pintar las zonas sobre el mapa. */
export function enaireTileUrlTemplate(layerIds: number[]): string {
  const layers = `show:${layerIds.join(',')}`;
  return (
    `${ENAIRE_SERVICE}/export?bbox={bbox}&bboxSR=3857&imageSR=3857` +
    `&size=256,256&dpi=96&format=png32&transparent=true&layers=${encodeURIComponent(layers)}&f=image`
  );
}

export async function getLayerIds(): Promise<Record<LayerKey, number>> {
  return resolveLayerIds();
}
