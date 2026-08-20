/**
 * Traducción de la interfaz.
 *
 * Reglas de este módulo:
 *
 *  - `es` es la fuente de la verdad. `en` tiene que tener exactamente las
 *    mismas claves y las mismas firmas, y eso lo comprueba el compilador (ver
 *    el tipo `Messages` en `en.ts`): no se puede olvidar una traducción.
 *  - Lo que llega de ENAIRE, de los NOTAM o del catálogo de espacios
 *    protegidos NO se traduce nunca. Son textos oficiales con valor legal y
 *    reescribirlos sería inventarse la norma. La interfaz cambia de idioma
 *    alrededor de ellos.
 *  - El idioma vive en un módulo, no sólo en un contexto de React, porque el
 *    motor de decisión y las utilidades puras (`verdict.ts`, `share.ts`,
 *    `sun.ts`…) también generan texto y no son componentes.
 */

import { es } from './es';
import { en } from './en';

/** Lo que se guarda en los ajustes. `sistema` sigue al idioma del móvil. */
export type LanguageId = 'sistema' | 'es' | 'en';

/** Idioma efectivo, ya resuelto. */
export type Locale = 'es' | 'en';

type Dict = typeof es;
export type MessageKey = keyof Dict;

/** Argumentos que pide una clave concreta: ninguno, o los de su función. */
type Args<K extends MessageKey> = Dict[K] extends (...args: infer A) => string ? A : [];

const DICTS: Record<Locale, Dict> = { es, en };

let current: Locale = 'es';

/** Idioma efectivo en uso. */
export function getLocale(): Locale {
  return current;
}

/**
 * Cambia el idioma de toda la app. Lo llama `SettingsProvider`; nadie más
 * debería tener que tocarlo.
 */
export function setLocale(locale: Locale): void {
  current = locale;
}

/**
 * Texto traducido.
 *
 * `t('home.title')` para las claves fijas, `t('verdict.zones', 3)` para las
 * que llevan datos dentro. Si una clave faltara en el diccionario activo se
 * cae al español antes que enseñar la clave en crudo.
 */
export function t<K extends MessageKey>(key: K, ...args: Args<K>): string {
  const value = (DICTS[current][key] ?? es[key]) as unknown;
  if (typeof value === 'function') {
    return (value as (...a: unknown[]) => string)(...args);
  }
  return value as string;
}

/**
 * Etiqueta de idioma para `toLocaleDateString` y compañía.
 *
 * En inglés se usa `en-GB` a propósito: quien vuela en España espera fechas
 * día/mes y reloj de 24 horas, no el formato de Estados Unidos.
 */
export function dateLocale(): string {
  return current === 'en' ? 'en-GB' : 'es-ES';
}

/**
 * Un decimal con la coma o el punto que toque: en español 8,6 m/s y en inglés
 * 8.6 m/s. Mezclarlos delata la traducción a medias.
 */
export function decimal(value: number, digits = 1): string {
  return value.toLocaleString(dateLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Idioma que pedirle a servicios que devuelven topónimos (Nominatim). */
export function acceptLanguage(): string {
  return current === 'en' ? 'en,es' : 'es';
}

/** Convierte lo que diga el móvil en uno de los idiomas que tenemos. */
export function resolveLocale(language: LanguageId, deviceTag: string | null): Locale {
  if (language === 'es' || language === 'en') return language;
  const tag = (deviceTag ?? 'es').toLowerCase();
  return tag.startsWith('en') ? 'en' : 'es';
}
