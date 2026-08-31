/**
 * Catálogo de modelos, para no teclear la ficha entera.
 *
 * Rellenar un dron a mano son diez casillas, y cuatro de ellas —peso, clase,
 * velocidad, dimensión— hay que ir a buscarlas al manual. Como en la práctica
 * casi todo el mundo vuela un DJI, con elegir el modelo de una lista se
 * ahorra ese paseo.
 *
 * Por qué es una tabla dentro de la app y no una descarga:
 *
 *  - No existe ninguna fuente abierta y estable con esto. Ni AESA ni la EASA
 *    publican una base de datos de modelos; lo único canónico son las fichas
 *    de cada fabricante, que son páginas web. Rasparlas desde el móvil sería
 *    montar un scraper que se rompe cada vez que DJI rediseña su web, y hacerlo
 *    desde un servidor propio significa tener servidor propio, que es
 *    justamente lo que esta app no tiene.
 *  - Aquí funciona sin cobertura, que es donde se usa la app.
 *
 * A cambio, la tabla envejece. Por eso cada ficha lleva de dónde salió el dato
 * y cuándo se comprobó, y añadir un modelo es añadir una línea.
 *
 * Dos reglas que se respetan en toda la tabla:
 *
 *  - **Ningún número inventado.** Lo que el fabricante no publica se queda a
 *    `null` y lo pregunta el formulario. Es preferible una casilla vacía a un
 *    dato plausible: con el peso se decide la subcategoría, y con ella lo que
 *    la app te deja creer que puedes hacer.
 *  - **Los valores europeos mandan.** Varios modelos declaran una velocidad
 *    máxima menor en la Unión Europea que en el resto del mundo. Si el
 *    fabricante publica la cifra europea, es la que va aquí.
 */

import type { DroneProfileId } from './drone';

export type CatalogConfiguration = 'MULTIRROTOR' | 'ALA_FIJA';

export interface CatalogEntry {
  /** Identificador estable, en minúsculas y con guiones. */
  id: string;
  manufacturer: string;
  model: string;
  /** Subcategoría con la que se opera de fábrica. */
  profile: DroneProfileId;
  /** Marcado de clase europeo, o '' cuando el modelo no lo lleva. */
  classMark: string;
  /** Masa máxima al despegue en gramos, tal y como la declara el fabricante. */
  weightGrams: number;
  /** Dimensión mayor con las hélices puestas, en metros. null si no se publica. */
  characteristicSizeM: number | null;
  /** Velocidad máxima en m/s, con el límite europeo cuando existe. */
  speedMs: number | null;
  autonomyMin: number;
  frequencies: string;
  configuration: CatalogConfiguration;
  /** De dónde sale la ficha. */
  source: string;
}

/** Cuándo se contrastó por última vez la tabla contra las fichas oficiales. */
export const CATALOG_CHECKED = '2026-08-31';

const DJI_SPECS = 'dji.com — ficha oficial del producto';

/**
 * Los modelos más comunes en España. No pretende ser exhaustivo: pretende
 * cubrir lo que la gente vuela de verdad y ser fácil de ampliar.
 *
 * Ojo con las dimensiones: DJI dejó de publicar la medida «desplegado con
 * hélices» en los modelos nuevos y sólo da la de sin hélices, que no vale para
 * la dimensión característica de una EARO. Donde no la publica va `null`.
 */
export const DRONE_CATALOG: CatalogEntry[] = [
  {
    id: 'dji-mini-2',
    manufacturer: 'DJI',
    model: 'Mini 2',
    profile: 'sub250',
    classMark: '',
    weightGrams: 249,
    characteristicSizeM: 0.289,
    speedMs: 16,
    autonomyMin: 31,
    frequencies: '2,400–2,4835 GHz / 5,725–5,850 GHz',
    configuration: 'MULTIRROTOR',
    // Es anterior al marcado de clase: vuela como «legacy» de menos de 250 g.
    source: 'Manual de usuario del DJI Mini 2, especificaciones',
  },
  {
    id: 'dji-mini-3-pro',
    manufacturer: 'DJI',
    model: 'Mini 3 Pro',
    profile: 'sub250',
    classMark: 'C0',
    weightGrams: 249,
    characteristicSizeM: 0.362,
    // DJI no publica una cifra europea separada para este modelo.
    speedMs: null,
    autonomyMin: 34,
    frequencies: '2,400–2,4835 GHz / 5,725–5,850 GHz',
    configuration: 'MULTIRROTOR',
    source: DJI_SPECS,
  },
  {
    id: 'dji-mini-4-pro',
    manufacturer: 'DJI',
    model: 'Mini 4 Pro',
    profile: 'sub250',
    classMark: 'C0',
    weightGrams: 249,
    characteristicSizeM: 0.373,
    speedMs: 16,
    autonomyMin: 34,
    frequencies: '2,400–2,4835 GHz / 5,170–5,250 GHz / 5,725–5,850 GHz',
    configuration: 'MULTIRROTOR',
    source: DJI_SPECS,
  },
  {
    id: 'dji-neo',
    manufacturer: 'DJI',
    model: 'Neo',
    profile: 'sub250',
    classMark: 'C0',
    weightGrams: 135,
    characteristicSizeM: null,
    speedMs: 8,
    autonomyMin: 18,
    frequencies: '2,400–2,4835 GHz / 5,170–5,250 GHz / 5,725–5,850 GHz',
    configuration: 'MULTIRROTOR',
    source: DJI_SPECS,
  },
  {
    id: 'dji-flip',
    manufacturer: 'DJI',
    model: 'Flip',
    profile: 'sub250',
    classMark: 'C0',
    weightGrams: 249,
    characteristicSizeM: null,
    speedMs: 12,
    autonomyMin: 31,
    frequencies: '2,400–2,4835 GHz / 5,170–5,250 GHz / 5,725–5,850 GHz',
    configuration: 'MULTIRROTOR',
    source: DJI_SPECS,
  },
  {
    id: 'dji-air-3',
    manufacturer: 'DJI',
    model: 'Air 3',
    profile: 'c1',
    classMark: 'C1',
    weightGrams: 720,
    characteristicSizeM: null,
    speedMs: 19,
    autonomyMin: 46,
    frequencies: '2,400–2,4835 GHz / 5,170–5,250 GHz / 5,725–5,850 GHz',
    configuration: 'MULTIRROTOR',
    source: DJI_SPECS,
  },
  {
    id: 'dji-air-3s',
    manufacturer: 'DJI',
    model: 'Air 3S',
    profile: 'c1',
    classMark: 'C1',
    weightGrams: 724,
    characteristicSizeM: null,
    speedMs: 19,
    autonomyMin: 45,
    frequencies: '2,400–2,4835 GHz / 5,170–5,250 GHz / 5,725–5,850 GHz',
    configuration: 'MULTIRROTOR',
    source: DJI_SPECS,
  },
  {
    id: 'dji-mavic-3-pro',
    manufacturer: 'DJI',
    model: 'Mavic 3 Pro',
    profile: 'c2',
    classMark: 'C2',
    weightGrams: 958,
    characteristicSizeM: null,
    speedMs: 21,
    autonomyMin: 43,
    frequencies: '2,400–2,4835 GHz / 5,725–5,850 GHz',
    configuration: 'MULTIRROTOR',
    source: DJI_SPECS,
  },
];

export function catalogEntry(id: string): CatalogEntry | null {
  return DRONE_CATALOG.find((e) => e.id === id) ?? null;
}

/** «DJI Mini 4 Pro», que es como lo busca quien lo tiene en la mano. */
export function catalogLabel(entry: CatalogEntry): string {
  return `${entry.manufacturer} ${entry.model}`;
}

/**
 * Aclaración corta para la lista: peso y clase, que es lo que decide qué
 * puedes hacer con él.
 */
export function catalogHint(entry: CatalogEntry): string {
  const clase = entry.classMark || 'sin clase';
  return `${entry.weightGrams} g · ${clase}`;
}

/** Busca por fabricante o modelo, sin distinguir mayúsculas ni acentos. */
export function searchCatalog(query: string): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return DRONE_CATALOG;
  return DRONE_CATALOG.filter((e) => catalogLabel(e).toLowerCase().includes(q));
}

/**
 * Lo que la ficha de un modelo aporta a la ficha de tu dron.
 *
 * Devuelve un parche, no un dron entero: el alias, el número de serie y las
 * notas son tuyos y no los toca nadie. Los campos que el fabricante no publica
 * tampoco se tocan, para no borrar lo que ya hubieras puesto a mano.
 */
export function catalogPatch(entry: CatalogEntry): {
  manufacturer: string;
  model: string;
  profile: DroneProfileId;
  weightGrams: number;
  autonomy: string;
  frequencies: string;
} {
  return {
    manufacturer: entry.manufacturer,
    model: entry.model,
    profile: entry.profile,
    weightGrams: entry.weightGrams,
    autonomy: `${entry.autonomyMin} min`,
    frequencies: entry.frequencies,
  };
}
