/**
 * Tipos y constantes del modo sin cobertura. Sin dependencias de plataforma,
 * para que la lógica se pueda comprobar con `npm run test:motor`.
 */

import type { LayerKey, RawZoneAttributes } from '../types';
import type { BBox, ElevationGrid } from './geometry';

export const PACK_VERSION = 1;
export const DEFAULT_RADIUS_KM = 25;
export const MIN_RADIUS_KM = 5;
export const MAX_RADIUS_KM = 60;

/**
 * Nodos por lado de la rejilla de elevaciones. Se mantiene fijo y lo que cambia
 * es la separación entre nodos, para que un área grande no dispare el número de
 * peticiones (la API admite 100 puntos por petición).
 */
export const ELEVATION_NODES_PER_SIDE = 50;

/** Separación de la rejilla, en km, para un radio dado. */
export function elevationStepKm(radiusKm: number): number {
  return Math.max(0.5, (2 * radiusKm) / ELEVATION_NODES_PER_SIDE);
}

/**
 * Margen de seguridad de la elevación interpolada: entre dos nodos de la
 * rejilla puede haber un cerro, y cuanto más separados están, más margen hace
 * falta. Se aplica siempre hacia el lado restrictivo.
 */
export function elevationUncertaintyFor(stepKm: number | undefined): number {
  const step = stepKm && stepKm > 0 ? stepKm : 1;
  return Math.min(80, Math.round(25 * step + 5));
}

/** Compatibilidad: margen del paso de 1 km. */
export const ELEVATION_UNCERTAINTY_M = 30;

export interface PackedZone {
  layer: LayerKey;
  attributes: RawZoneAttributes;
  /** Anillos en [lon, lat]. */
  rings: number[][][];
}

export interface OfflinePack {
  version: number;
  createdAt: string;
  center: { lat: number; lon: number };
  radiusKm: number;
  bbox: BBox;
  zones: PackedZone[];
  elevation: ElevationGrid | null;
  /** Separación real de la rejilla de elevaciones, en km. */
  elevationStepKm?: number;
  label: string;
}

export interface PackMeta {
  createdAt: string;
  center: { lat: number; lon: number };
  radiusKm: number;
  bbox: BBox;
  zoneCount: number;
  bytes: number;
  label: string;
}
