/**
 * ¿Está el punto dentro del espacio aéreo español?
 *
 * Por qué hace falta preguntárselo: el servicio de ENAIRE responde a cualquier
 * coordenada del mundo, y para un punto de Portugal, Francia o Marruecos
 * responde exactamente lo mismo que para un descampado de Cuenca —cero zonas—.
 * Sin esta comprobación la app decía «Puedes volar, 120 m» en Lisboa, que es la
 * peor mentira posible: verde, grande y falso.
 *
 * La comprobación NO se hace con una caja de coordenadas ni con una frontera
 * dibujada a mano. Se hace con el dato del propio ENAIRE: la capa `ZGUAS_Urbano`
 * son los cuatro polígonos FIR españoles (NPDRID, NPLONA, NPRIAS, NPILLA) y
 * cubren España entera y sólo España — ver la explicación larga en
 * `src/api/enaire.ts`. Si el punto no cae dentro de ninguno de ellos, ENAIRE
 * está diciendo que ese punto no es suyo.
 *
 * Comprobado contra el servicio: Madrid, Badajoz (a 8 km de la raya), Palma,
 * Las Palmas y Ceuta devuelven su FIR; Lisboa, un punto al otro lado de la raya
 * extremeña, Toulouse, Andorra y Londres no devuelven ninguno.
 */

import { ADVISORY_LAYERS, ADVISORY_IDS } from '../api/enaire';
import type { Zone } from '../types';

/** País del punto, tal y como lo devuelve la búsqueda inversa. */
export interface OutsideCountry {
  /** ISO 3166-1 alfa-2 en minúsculas ('pt', 'fr'…). null si no se ha podido saber. */
  code: string | null;
  /** Nombre del país en el idioma de la app. null si no se ha podido saber. */
  name: string | null;
}

export const UNKNOWN_COUNTRY: OutsideCountry = { code: null, name: null };

/**
 * true si alguna de las zonas devueltas es uno de los polígonos FIR de ENAIRE.
 *
 * Ojo: sólo es concluyente si la capa que los contiene ha respondido. Quien
 * llama tiene que comprobarlo (`failedLayers`); si no ha respondido, el
 * veredicto ya se degrada a DESCONOCIDO por el camino normal.
 */
export function isSpanishAirspace(zones: Zone[]): boolean {
  return zones.some(
    (z) => ADVISORY_LAYERS.includes(z.layer) && ADVISORY_IDS.has(z.identifier.toUpperCase()),
  );
}

/** Autoridad de aviación civil a la que preguntar en cada país. */
export interface Authority {
  /** Siglas o nombre corto, tal cual se conocen allí. No se traduce. */
  name: string;
  url: string;
  /** true si la URL lleva directamente a un mapa de zonas para drones. */
  isMap?: boolean;
}

/**
 * Directorio mínimo y conservador: sólo los vecinos y los destinos más
 * probables, y siempre a la portada de la autoridad (que no se mueve) salvo
 * cuando el país publica un mapa de zonas estable, que es lo que de verdad
 * busca quien está mirando esta pantalla.
 *
 * Lo que no esté aquí cae en el enlace de la EASA con la lista completa de
 * autoridades nacionales. Es preferible eso a inventarse una URL.
 */
const AUTHORITIES: Record<string, Authority> = {
  pt: { name: 'ANAC', url: 'https://www.anac.pt' },
  fr: {
    name: 'DGAC',
    url: 'https://www.geoportail.gouv.fr/donnees/restrictions-uas-categorie-ouverte-et-aeromodelisme',
    isMap: true,
  },
  ad: { name: "Govern d'Andorra", url: 'https://www.govern.ad' },
  gb: { name: 'UK CAA', url: 'https://www.caa.co.uk/drones/' },
  gi: { name: 'UK CAA', url: 'https://www.caa.co.uk/drones/' },
  it: { name: 'ENAC', url: 'https://www.enac.gov.it' },
  de: { name: 'LBA', url: 'https://www.lba.de' },
  ma: { name: 'ONDA', url: 'https://www.onda.ma' },
};

/** Lista de autoridades nacionales de la EASA: el respaldo para todo lo demás. */
export const EASA_AUTHORITIES_URL = 'https://www.easa.europa.eu/en/domains/civil-drones/naa';

export function authorityFor(code: string | null): Authority | null {
  if (!code) return null;
  return AUTHORITIES[code.toLowerCase()] ?? null;
}

/**
 * Estados en los que se aplica el Reglamento (UE) 2019/947: mismas categorías
 * y mismos límites generales que en España, pero con zonas geográficas propias.
 * Saberlo cambia el mensaje: no es «no tengo ni idea», es «las reglas generales
 * que ya conoces valen, lo que cambia es el mapa».
 */
const EASA_STATES = new Set([
  'at', 'be', 'bg', 'hr', 'cy', 'cz', 'dk', 'ee', 'fi', 'fr', 'de', 'gr', 'hu',
  'ie', 'it', 'lv', 'lt', 'lu', 'mt', 'nl', 'pl', 'pt', 'ro', 'sk', 'si', 'se',
  'is', 'li', 'no', 'ch',
]);

export function isEasaState(code: string | null): boolean {
  return code ? EASA_STATES.has(code.toLowerCase()) : false;
}

/** Bandera del país en emoji, a partir del código ISO. '' si no se sabe. */
export function countryFlag(code: string | null): string {
  if (!code || !/^[a-z]{2}$/i.test(code)) return '';
  const base = 0x1f1e6;
  const up = code.toUpperCase();
  return String.fromCodePoint(base + up.charCodeAt(0) - 65, base + up.charCodeAt(1) - 65);
}
