import type { DroneProfile } from './drone';

/** Perfiles de dron en español. Ver `drone.ts` para el porqué de cada campo. */
export const DRONE_PROFILES_ES: DroneProfile[] = [
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
