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
import { getLayerIds, LAYER_KEYS } from '../api/enaire';
import { ENAIRE_SERVICE, fetchArcgisJson } from '../api/arcgisClient';
import { elevations } from '../api/openMeteo';
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
  ELEVATION_NODES_PER_SIDE,
  PACK_VERSION,
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
  stepKm: number,
  signal?: AbortSignal,
  onProgress?: (pct: number) => void,
): Promise<ElevationGrid | null> {
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const dLat = stepKm / 111.32;
  const dLon = stepKm / (111.32 * Math.cos((midLat * Math.PI) / 180));

  // Se acota por si acaso: el coste son peticiones de 100 puntos.
  const rows = Math.min(ELEVATION_NODES_PER_SIDE + 2, Math.ceil((bbox.maxLat - bbox.minLat) / dLat) + 1);
  const cols = Math.min(ELEVATION_NODES_PER_SIDE + 2, Math.ceil((bbox.maxLon - bbox.minLon) / dLon) + 1);

  const points: { lat: number; lon: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      points.push({ lat: bbox.minLat + r * dLat, lon: bbox.minLon + c * dLon });
    }
  }

  // Mismo cliente espaciado y con reintentos que usa el resto de la app para
  // Open-Meteo. Sin él, una rejilla de 25 km dispara ~28 peticiones seguidas y
  // el primer 429 tira toda la descarga sin decir por qué.
  const values = await elevations(points, signal, onProgress);
  // elevations() traga cualquier error, incluida la cancelación, y devuelve
  // null: hay que distinguirla aquí o cancelar a mitad de la rejilla acabaría
  // guardando un paquete "completo" sin elevación en vez de abortar.
  if (signal?.aborted) throw new Error('Descarga cancelada');
  if (!values) return null;

  return { lat0: bbox.minLat, lon0: bbox.minLon, dLat, dLon, rows, cols, values };
}

export interface BuildProgress {
  step: 'zonas' | 'elevacion' | 'guardando';
  pct: number;
}

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
    onProgress?.({ step: 'zonas', pct: done / LAYER_KEYS.length });
    zones.push(...(await fetchLayerZones(layer, ids[layer], bbox, signal)));
    done++;
    // Respiro entre capas: el servicio limita las peticiones seguidas.
    await new Promise((r) => setTimeout(r, 250));
  }
  onProgress?.({ step: 'zonas', pct: 1 });

  const stepKm = elevationStepKm(radiusKm);
  const elevation = await fetchElevationGrid(bbox, stepKm, signal, (pct) =>
    onProgress?.({ step: 'elevacion', pct }),
  );

  onProgress?.({ step: 'guardando', pct: 0 });
  const pack: OfflinePack = {
    version: PACK_VERSION,
    createdAt: new Date().toISOString(),
    center,
    radiusKm,
    bbox,
    zones,
    elevation,
    elevationStepKm: stepKm,
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
