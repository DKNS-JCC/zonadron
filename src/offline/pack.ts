/**
 * Paquete para volar sin cobertura.
 *
 * En el campo no hay datos móviles, que es justo donde se vuela. Este módulo
 * descarga por wifi las zonas de ENAIRE de un área concreta (con su geometría)
 * más una rejilla de elevaciones del terreno, y lo guarda en el móvil. A partir
 * de ahí la comprobación se hace entera en el aparato.
 *
 * Sigue siendo el dato oficial de ENAIRE, sólo que con fecha de descarga: por
 * eso la app enseña siempre cuándo se bajó y avisa cuando se está quedando viejo.
 */

import { Directory, File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '../i18n';
import { getLayerIds, LAYER_KEYS } from '../api/enaire';
import { ENAIRE_SERVICE, fetchArcgisJson } from '../api/arcgisClient';
import { elevations, type ElevationFailure } from '../api/openMeteo';
import { IGN_ELEVATION_SOURCE, ignElevationGrid, resolutionForSide } from '../api/ign';
import { ELEVATION_SOURCE } from '../api/elevation';
import type { LayerKey, RawZoneAttributes } from '../types';
import { boxAround, type BBox, type ElevationGrid } from './geometry';

export { boxAround, bboxContains, interpolateElevation, pointInRings } from './geometry';
export type { BBox, ElevationGrid } from './geometry';
export {
  DEFAULT_RADIUS_KM,
  ELEVATION_UNCERTAINTY_M,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  PACK_VERSION,
  elevationStepKm,
  elevationUncertaintyFor,
} from './model';
export type { OfflinePack, PackedZone, PackMeta } from './model';

import {
  DEFAULT_RADIUS_KM,
  PACK_VERSION,
  elevationNodesPerSide,
  elevationStepKm,
  type OfflinePack,
  type PackMeta,
  type PackedZone,
} from './model';


/** El paquete vive en el almacenamiento de la app, no en la caché: no se borra solo. */
function packFile(): File {
  const dir = new Directory(Paths.document, 'zonadron');
  if (!dir.exists) dir.create({ intermediates: true });
  return new File(dir, `pack-v${PACK_VERSION}.json`);
}

const META_KEY = 'zonadron.pack.meta.v1';

/* ------------------------------------------------------------------ */
/* Descarga                                                            */
/* ------------------------------------------------------------------ */

const PACK_FIELDS = [
  'identifier', 'name', 'type', 'reasons', 'message', 'description', 'lower', 'lowerReference',
  'upper', 'upperReference', 'uom', 'contactName', 'email', 'phone', 'siteURL',
  'extendedProperties', 'startDateTime', 'endDateTime', 'day', 'startTime', 'endTime',
  'updateDateTime',
].join(',');

async function fetchLayerZones(
  layer: LayerKey,
  layerId: number,
  bbox: OfflinePack['bbox'],
  signal?: AbortSignal,
): Promise<PackedZone[]> {
  const params = new URLSearchParams({
    geometry: `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: PACK_FIELDS,
    returnGeometry: 'true',
    // ~22 m de tolerancia: suficiente y reduce mucho el tamaño del paquete.
    maxAllowableOffset: '0.0002',
    f: 'json',
  });

  // Timeout más largo que el de una consulta interactiva: esto es una descarga
  // de fondo, no alguien esperando de pie en el campo a que responda el móvil.
  const json = await fetchArcgisJson(`${ENAIRE_SERVICE}/${layerId}/query?${params}`, signal, 15000);

  return (json.features ?? [])
    .filter((f: any) => Array.isArray(f?.geometry?.rings))
    .map((f: any) => ({ layer, attributes: f.attributes ?? {}, rings: f.geometry.rings }));
}

async function fetchElevationGrid(
  bbox: OfflinePack['bbox'],
  radiusKm: number,
  signal?: AbortSignal,
  onProgress?: (p: { pct: number; etaSeconds: number }) => void,
): Promise<{
  grid: ElevationGrid | null;
  reason?: ElevationFailure;
  stepKm: number;
  source?: string;
}> {
  // Primero el IGN: la rejilla entera en UNA petición y sin cuota. Medido, los
  // 50x50 km de una zona son 331x250 cotas en menos de medio segundo, frente a
  // los cinco minutos que cuesta lo mismo por Open-Meteo. Ver src/api/ign.ts.
  const sideKm = 2 * radiusKm;
  const resolution = resolutionForSide(sideKm);
  const fromIgn = await ignElevationGrid(bbox, resolution, signal);
  if (signal?.aborted) throw new Error(t('error.downloadCancelled'));
  if (fromIgn) {
    onProgress?.({ pct: 1, etaSeconds: 0 });
    return { grid: fromIgn, stepKm: resolution / 1000, source: IGN_ELEVATION_SOURCE };
  }

  // Respaldo: fuera de España, o si el IGN no contesta. Aquí sí hay cuota, así
  // que se pide punto a punto y al ritmo que deja la fuente.
  const stepKm = elevationStepKm(radiusKm);
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const dLat = stepKm / 111.32;
  const dLon = stepKm / (111.32 * Math.cos((midLat * Math.PI) / 180));

  // El número de nodos sale de `elevationNodesPerSide` y no de medir la caja:
  // así la estimación de duración que se le enseña al usuario antes de empezar
  // cuenta exactamente los mismos puntos que se van a pedir. Derivarlo dos
  // veces dejaba un nodo de diferencia por el redondeo en coma flotante.
  const rows = elevationNodesPerSide(radiusKm);
  const cols = rows;

  const points: { lat: number; lon: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      points.push({ lat: bbox.minLat + r * dLat, lon: bbox.minLon + c * dLon });
    }
  }

  const { values, reason } = await elevations(points, signal, onProgress);
  // Cancelar a mitad de la rejilla no puede acabar guardando un paquete
  // "completo" sin elevación: se distingue aquí y se aborta.
  if (signal?.aborted) throw new Error(t('error.downloadCancelled'));
  if (!values) return { grid: null, reason, stepKm };

  return {
    grid: { lat0: bbox.minLat, lon0: bbox.minLon, dLat, dLon, rows, cols, values },
    stepKm,
    source: ELEVATION_SOURCE,
  };
}

export interface BuildProgress {
  step: 'zonas' | 'elevacion' | 'guardando';
  /**
   * Avance de la descarga ENTERA, 0-1. Es de la descarga y no de la fase para
   * que la barra no se vacíe al cambiar de paso: una barra que retrocede es
   * una barra en la que no se confía.
   */
  pct: number;
  /** Segundos que se estima que queda. Ausente si aún no se puede saber. */
  etaSeconds?: number;
}

/**
 * Cuánto pesa cada fase en la barra. El relieve se lleva casi todo porque es
 * casi todo el tiempo; medido, unos cinco minutos frente a unos segundos de
 * las otras dos.
 */
const PHASE = { zonas: 0.05, elevacion: 0.92, guardando: 0.03 };

/** Descarga y guarda el paquete de un área. Devuelve sus metadatos. */
export async function buildPack(
  center: { lat: number; lon: number },
  label: string,
  radiusKm: number = DEFAULT_RADIUS_KM,
  onProgress?: (p: BuildProgress) => void,
  signal?: AbortSignal,
): Promise<PackMeta> {
  const bbox = boxAround(center.lat, center.lon, radiusKm);
  const ids = await getLayerIds();

  const zones: PackedZone[] = [];
  let done = 0;
  for (const layer of LAYER_KEYS) {
    onProgress?.({ step: 'zonas', pct: PHASE.zonas * (done / LAYER_KEYS.length) });
    zones.push(...(await fetchLayerZones(layer, ids[layer], bbox, signal)));
    done++;
    // Respiro entre capas: el servicio limita las peticiones seguidas.
    await new Promise((r) => setTimeout(r, 250));
  }
  onProgress?.({ step: 'zonas', pct: PHASE.zonas });

  const {
    grid: elevation,
    reason: elevationError,
    stepKm,
    source: elevationSource,
  } = await fetchElevationGrid(bbox, radiusKm, signal, (p) =>
    onProgress?.({
      step: 'elevacion',
      pct: PHASE.zonas + PHASE.elevacion * p.pct,
      etaSeconds: p.etaSeconds,
    }),
  );

  onProgress?.({ step: 'guardando', pct: PHASE.zonas + PHASE.elevacion });
  const pack: OfflinePack = {
    version: PACK_VERSION,
    createdAt: new Date().toISOString(),
    center,
    radiusKm,
    bbox,
    zones,
    elevation,
    elevationStepKm: stepKm,
    elevationSource,
    label,
  };

  const json = JSON.stringify(pack);
  const file = packFile();
  if (file.exists) file.delete();
  file.create();
  file.write(json);

  const meta: PackMeta = {
    createdAt: pack.createdAt,
    center,
    radiusKm,
    bbox,
    zoneCount: zones.length,
    bytes: json.length,
    label,
    elevationComplete: elevation !== null,
    elevationError,
  };
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
  // Si no se actualiza aquí, loadPack() sigue devolviendo el paquete anterior
  // hasta que se cierra la app: todas las consultas offline responderían con
  // la zona vieja aunque el fichero de disco ya sea el nuevo.
  cached = pack;
  onProgress?.({ step: 'guardando', pct: 1 });
  return meta;
}

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

let cached: OfflinePack | null = null;

export async function getPackMeta(): Promise<PackMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as PackMeta) : null;
  } catch {
    return null;
  }
}

export async function loadPack(): Promise<OfflinePack | null> {
  if (cached) return cached;
  try {
    const file = packFile();
    if (!file.exists) return null;
    const pack = JSON.parse(await file.text()) as OfflinePack;
    if (pack.version !== PACK_VERSION) return null;
    cached = pack;
    return pack;
  } catch {
    return null;
  }
}

export async function deletePack(): Promise<void> {
  cached = null;
  try {
    const file = packFile();
    if (file.exists) file.delete();
  } catch {
    /* si no se puede borrar el fichero, al menos se olvida el paquete */
  }
  await AsyncStorage.removeItem(META_KEY).catch(() => {});
}
