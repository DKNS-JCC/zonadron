/**
 * Perfil del dron del usuario.
 *
 * Las zonas geográficas UAS aplican igual a todos los drones, así que el perfil
 * NUNCA cambia el veredicto: sólo cambia qué reglas generales se te enseñan.
 * Pesar menos de 250 g no exime de ninguna zona.
 *
 * Fuentes: Reglamento de Ejecución (UE) 2019/947 (subcategorías A1/A2/A3 y
 * UAS.OPEN.020/030/040), Reglamento Delegado (UE) 2019/945 (clases C0–C4) y
 * Real Decreto 517/2024.
 */

export type DroneProfileId = 'sub250' | 'c1' | 'c2' | 'c3c4' | 'otro';

export interface DroneProfile {
  id: DroneProfileId;
  /** Etiqueta corta para el selector. */
  label: string;
  /** Ejemplos de drones típicos, para que sea fácil reconocerse. */
  examples: string;
  /** Subcategoría de la categoría abierta en la que operas. */
  subcategory: string;
  /** Lo que te aplica a ti, en lenguaje llano. */
  rules: string[];
}

export const DRONE_PROFILES: DroneProfile[] = [
  {
    id: 'sub250',
    label: 'Menos de 250 g',
    examples: 'DJI Mini 2, Mini 3, Mini 4K, Neo…',
    subcategory: 'A1',
    rules: [
      'Puedes volar cerca de personas, pero nunca sobre aglomeraciones de personas.',
      'Evita sobrevolar a personas ajenas a la operación; si ocurre, que sea el menor tiempo posible.',
      'No necesitas la formación adicional de A2: basta con conocer el manual del fabricante.',
      'Altura máxima 120 m sobre la superficie y siempre dentro de tu alcance visual (VLOS).',
      'Si tu dron lleva cámara, tienes que estar registrado como operador UAS en AESA aunque pese menos de 250 g.',
      'En entorno urbano no puedes sobrevolar edificios en categoría abierta.',
    ],
  },
  {
    id: 'c1',
    label: 'C1 (250 g – 900 g)',
    examples: 'DJI Mini 4 Pro con marcado C1, Air 3S…',
    subcategory: 'A1',
    rules: [
      'Mantén 5 m horizontales respecto a personas ajenas a la operación.',
      'Nunca sobre aglomeraciones de personas.',
      'Necesitas la formación en línea A1/A3 y el registro de operador UAS.',
      'Altura máxima 120 m sobre la superficie y siempre en VLOS.',
    ],
  },
  {
    id: 'c2',
    label: 'C2 (menos de 4 kg)',
    examples: 'DJI Mavic 3 con marcado C2…',
    subcategory: 'A2',
    rules: [
      'Mantén 30 m horizontales respecto a personas ajenas (5 m si usas el modo de baja velocidad).',
      'Nunca sobre aglomeraciones de personas.',
      'Necesitas la formación A2, además del registro de operador UAS.',
      'Altura máxima 120 m sobre la superficie y siempre en VLOS.',
    ],
  },
  {
    id: 'c3c4',
    label: 'C3 o C4 (hasta 25 kg)',
    examples: 'Drones grandes de trabajo o construidos por ti',
    subcategory: 'A3',
    rules: [
      'Vuela lejos de personas: 150 m como mínimo de zonas residenciales, comerciales, industriales o recreativas.',
      'No debe haber ninguna persona ajena a la operación en la zona de vuelo.',
      'Necesitas la formación en línea A1/A3 y el registro de operador UAS.',
      'Altura máxima 120 m sobre la superficie y siempre en VLOS.',
    ],
  },
  {
    id: 'otro',
    label: 'Otro o no lo sé',
    examples: 'Se muestran todas las reglas',
    subcategory: '—',
    rules: [],
  },
];

export function getDroneProfile(id: DroneProfileId): DroneProfile {
  return DRONE_PROFILES.find((d) => d.id === id) ?? DRONE_PROFILES[DRONE_PROFILES.length - 1];
}

/** Secciones de la pantalla de normas que sólo interesan a ciertos perfiles. */
export const SECTION_RELEVANCE: Record<string, DroneProfileId[]> = {
  abierta: ['sub250', 'c1', 'c2', 'c3c4', 'otro'],
  antes: ['sub250', 'c1', 'c2', 'c3c4', 'otro'],
  zonas: ['sub250', 'c1', 'c2', 'c3c4', 'otro'],
  aerodromos: ['sub250', 'c1', 'c2', 'c3c4', 'otro'],
  controlado: ['sub250', 'c1', 'c2', 'c3c4', 'otro'],
  urbano: ['sub250', 'c1', 'c2', 'otro'],
  infra: ['sub250', 'c1', 'c2', 'c3c4', 'otro'],
  natura: ['sub250', 'c1', 'c2', 'c3c4', 'otro'],
};
