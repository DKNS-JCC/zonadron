/**
 * Perfil del dron del usuario.
 *
 * Las zonas geográficas UAS aplican igual a todos los drones, así que el perfil
 * NUNCA cambia el veredicto: sólo cambia qué reglas generales se te enseñan.
 * Pesar menos de 250 g no exime de ninguna zona.
 *
 * El texto de cada perfil vive en `drone.es.ts` y `drone.en.ts`: son párrafos
 * enteros y se leen mucho mejor juntos que troceados en un diccionario de
 * claves sueltas.
 *
 * Fuentes: Reglamento de Ejecución (UE) 2019/947 (subcategorías A1/A2/A3 y
 * UAS.OPEN.020/030/040), Reglamento Delegado (UE) 2019/945 (clases C0–C4) y
 * Real Decreto 517/2024.
 */

import { getLocale, type Locale } from '../i18n';
import { DRONE_PROFILES_ES } from './drone.es';
import { DRONE_PROFILES_EN } from './drone.en';

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

/** Todos los perfiles, en el idioma activo (o en el que se pida). */
export function droneProfiles(locale: Locale = getLocale()): DroneProfile[] {
  return locale === 'en' ? DRONE_PROFILES_EN : DRONE_PROFILES_ES;
}

/**
 * Un perfil por id. `locale` sólo se pasa cuando el texto NO es para la
 * interfaz: la solicitud de autorización por correo se redacta siempre en
 * español (ver `request.ts`).
 */
export function getDroneProfile(id: DroneProfileId, locale: Locale = getLocale()): DroneProfile {
  const profiles = droneProfiles(locale);
  return profiles.find((d) => d.id === id) ?? profiles[profiles.length - 1];
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
