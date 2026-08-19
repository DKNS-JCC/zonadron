import type { LayerKey, VerdictLevel, VerticalRef, ZoneType } from '../types';

/** Traducción de los códigos ED-318 a lenguaje llano en español. */

export const zoneTypeLabel: Record<ZoneType, string> = {
  PROHIBITED: 'Prohibido',
  REQ_AUTHORIZATION: 'Requiere autorización',
  CONDITIONAL: 'Con condiciones',
  NO_RESTRICTION: 'Sin restricción',
  UNKNOWN: 'Sin clasificar',
};

export const zoneTypeExplain: Record<ZoneType, string> = {
  PROHIBITED: 'Aquí no se puede volar. La zona está prohibida para drones.',
  REQ_AUTHORIZATION:
    'Aquí sólo puedes volar si antes pides permiso y te lo conceden. Sin esa autorización, el vuelo no es legal.',
  CONDITIONAL:
    'Puedes volar, pero cumpliendo unas condiciones concretas (altura, distancia, coordinación previa…).',
  NO_RESTRICTION: 'Esta zona no impone restricciones adicionales.',
  UNKNOWN: 'ENAIRE no ha clasificado el tipo de restricción de esta zona.',
};

export const reasonLabel: Record<string, string> = {
  AIR_TRAFFIC: 'Tráfico aéreo',
  SENSITIVE: 'Instalación sensible',
  PRIVACY: 'Privacidad',
  POPULATION: 'Zona poblada',
  NATURE: 'Espacio natural',
  NOISE: 'Ruido',
  EMERGENCY: 'Emergencias',
  AIR_DEFENCE: 'Defensa aérea',
  DANGEROUS_MATERIAL: 'Material peligroso',
  MILITARY: 'Militar',
  OTHER: 'Otros motivos',
};

export const reasonExplain: Record<string, string> = {
  AIR_TRAFFIC:
    'Hay aviones o helicópteros tripulados operando por aquí (espacio aéreo controlado, aeropuerto o helipuerto cercano).',
  SENSITIVE: 'Se protege una instalación sensible o crítica.',
  PRIVACY: 'Se protege la intimidad de las personas.',
  POPULATION: 'Es una aglomeración de personas o un entorno urbano.',
  NATURE: 'Es un espacio natural protegido y la fauna puede verse afectada.',
  NOISE: 'Se limita el ruido en la zona.',
  EMERGENCY: 'Puede haber operaciones de emergencia.',
  AIR_DEFENCE: 'Zona relacionada con la defensa aérea.',
  DANGEROUS_MATERIAL: 'Hay materiales peligrosos en la zona.',
  MILITARY: 'Es una zona de interés militar.',
  OTHER: 'ENAIRE agrupa aquí otros motivos; consulta el texto oficial.',
};

export const layerLabel: Record<LayerKey, string> = {
  aero: 'Aeronáutica',
  urbano: 'Aviso urbano',
  infraestructuras: 'Infraestructura',
};

export const layerDescription: Record<LayerKey, string> = {
  aero:
    'Zonas por seguridad del espacio aéreo: aeropuertos, helipuertos, espacio aéreo controlado, zonas prohibidas y restringidas.',
  urbano:
    'Aviso general de ENAIRE, no una zona concreta: cubre toda España y recuerda que debes ' +
    'comprobar tú si vuelas en entorno urbano, y qué obligaciones tienes si es así.',
  infraestructuras:
    'Protección de infraestructuras críticas: ferrocarril, carreteras, energía, agua, puertos, hospitales, etc.',
};

export const layerColor: Record<LayerKey, string> = {
  aero: '#E05A00',
  urbano: '#7C3AED',
  infraestructuras: '#0891B2',
};

export const verticalRefLabel: Record<VerticalRef, string> = {
  AGL: 'sobre el terreno',
  AMSL: 'sobre el nivel del mar',
  W84: 'sobre el elipsoide WGS-84',
  UNKNOWN: '(referencia no indicada)',
};

export const verticalRefShort: Record<VerticalRef, string> = {
  AGL: 'AGL',
  AMSL: 'AMSL',
  W84: 'WGS-84',
  UNKNOWN: '—',
};

export function readableReasons(reasons: string[]): string[] {
  return reasons.map((r) => reasonLabel[r] ?? r);
}

export const verdictLevelLabel: Record<VerdictLevel, string> = {
  LIBRE: 'Puedes volar',
  CONDICIONES: 'Con condiciones',
  AUTORIZACION: 'Necesitas autorización',
  PROHIBIDO: 'No puedes volar',
  DESCONOCIDO: 'Sin comprobar del todo',
};
