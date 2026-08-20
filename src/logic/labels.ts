import { t, type MessageKey } from '../i18n';
import type { LayerKey, VerdictLevel, VerticalRef, ZoneType } from '../types';

/**
 * Traducción de los códigos ED-318 a lenguaje llano.
 *
 * Son funciones y no objetos constantes a propósito: el idioma se puede
 * cambiar en caliente desde Ajustes, y una constante de módulo se quedaría
 * congelada en el idioma que hubiera al arrancar.
 */

const ZONE_TYPE_KEYS = {
  PROHIBITED: 'zoneType.PROHIBITED',
  REQ_AUTHORIZATION: 'zoneType.REQ_AUTHORIZATION',
  CONDITIONAL: 'zoneType.CONDITIONAL',
  NO_RESTRICTION: 'zoneType.NO_RESTRICTION',
  UNKNOWN: 'zoneType.UNKNOWN',
} satisfies Record<ZoneType, MessageKey>;

const ZONE_TYPE_EXPLAIN_KEYS = {
  PROHIBITED: 'zoneType.explain.PROHIBITED',
  REQ_AUTHORIZATION: 'zoneType.explain.REQ_AUTHORIZATION',
  CONDITIONAL: 'zoneType.explain.CONDITIONAL',
  NO_RESTRICTION: 'zoneType.explain.NO_RESTRICTION',
  UNKNOWN: 'zoneType.explain.UNKNOWN',
} satisfies Record<ZoneType, MessageKey>;

export function zoneTypeLabel(type: ZoneType): string {
  return t(ZONE_TYPE_KEYS[type]);
}

export function zoneTypeExplain(type: ZoneType): string {
  return t(ZONE_TYPE_EXPLAIN_KEYS[type]);
}

/** Los motivos los publica ENAIRE como códigos: los desconocidos se dejan tal cual. */
const REASON_KEYS: Record<string, MessageKey> = {
  AIR_TRAFFIC: 'reason.AIR_TRAFFIC',
  SENSITIVE: 'reason.SENSITIVE',
  PRIVACY: 'reason.PRIVACY',
  POPULATION: 'reason.POPULATION',
  NATURE: 'reason.NATURE',
  NOISE: 'reason.NOISE',
  EMERGENCY: 'reason.EMERGENCY',
  AIR_DEFENCE: 'reason.AIR_DEFENCE',
  DANGEROUS_MATERIAL: 'reason.DANGEROUS_MATERIAL',
  MILITARY: 'reason.MILITARY',
  OTHER: 'reason.OTHER',
};

const REASON_EXPLAIN_KEYS: Record<string, MessageKey> = {
  AIR_TRAFFIC: 'reason.explain.AIR_TRAFFIC',
  SENSITIVE: 'reason.explain.SENSITIVE',
  PRIVACY: 'reason.explain.PRIVACY',
  POPULATION: 'reason.explain.POPULATION',
  NATURE: 'reason.explain.NATURE',
  NOISE: 'reason.explain.NOISE',
  EMERGENCY: 'reason.explain.EMERGENCY',
  AIR_DEFENCE: 'reason.explain.AIR_DEFENCE',
  DANGEROUS_MATERIAL: 'reason.explain.DANGEROUS_MATERIAL',
  MILITARY: 'reason.explain.MILITARY',
  OTHER: 'reason.explain.OTHER',
};

export function reasonLabel(reason: string): string {
  const key = REASON_KEYS[reason];
  return key ? t(key) : reason;
}

/** Explicación del motivo, o `null` si ENAIRE usa un código que no conocemos. */
export function reasonExplain(reason: string): string | null {
  const key = REASON_EXPLAIN_KEYS[reason];
  return key ? t(key) : null;
}

const LAYER_KEYS = {
  aero: 'layer.aero',
  urbano: 'layer.urbano',
  infraestructuras: 'layer.infraestructuras',
} satisfies Record<LayerKey, MessageKey>;

const LAYER_DESCRIPTION_KEYS = {
  aero: 'layer.description.aero',
  urbano: 'layer.description.urbano',
  infraestructuras: 'layer.description.infraestructuras',
} satisfies Record<LayerKey, MessageKey>;

export function layerLabel(layer: LayerKey): string {
  return t(LAYER_KEYS[layer]);
}

export function layerDescription(layer: LayerKey): string {
  return t(LAYER_DESCRIPTION_KEYS[layer]);
}

export const layerColor: Record<LayerKey, string> = {
  aero: '#E05A00',
  urbano: '#7C3AED',
  infraestructuras: '#0891B2',
};

const VERTICAL_REF_KEYS = {
  AGL: 'verticalRef.AGL',
  AMSL: 'verticalRef.AMSL',
  W84: 'verticalRef.W84',
  UNKNOWN: 'verticalRef.UNKNOWN',
} satisfies Record<VerticalRef, MessageKey>;

export function verticalRefLabel(ref: VerticalRef): string {
  return t(VERTICAL_REF_KEYS[ref]);
}

/** Siglas aeronáuticas: son las mismas en cualquier idioma. */
export const verticalRefShort: Record<VerticalRef, string> = {
  AGL: 'AGL',
  AMSL: 'AMSL',
  W84: 'WGS-84',
  UNKNOWN: '—',
};

export function readableReasons(reasons: string[]): string[] {
  return reasons.map((r) => reasonLabel(r));
}

const LEVEL_KEYS = {
  LIBRE: 'level.LIBRE',
  CONDICIONES: 'level.CONDICIONES',
  AUTORIZACION: 'level.AUTORIZACION',
  PROHIBIDO: 'level.PROHIBIDO',
  DESCONOCIDO: 'level.DESCONOCIDO',
} satisfies Record<VerdictLevel, MessageKey>;

export function verdictLevelLabel(level: VerdictLevel): string {
  return t(LEVEL_KEYS[level]);
}
