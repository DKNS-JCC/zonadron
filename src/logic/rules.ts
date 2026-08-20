/**
 * Resumen de la normativa aplicable en España.
 *
 * IMPORTANTE: esto es un resumen divulgativo, no la norma. Cada bloque indica
 * de dónde sale para que se pueda contrastar. La norma que manda es:
 *
 *  - Reglamento de Ejecución (UE) 2019/947 (operaciones con UAS).
 *  - Reglamento Delegado (UE) 2019/945 (clases de producto C0–C6).
 *  - Real Decreto 517/2024, por el que se regula la utilización del espacio
 *    aéreo y las zonas geográficas de UAS en España.
 *
 * El texto vive en `rules.es.ts` y `rules.en.ts`. La traducción al inglés es
 * eso, una traducción de este resumen: la norma sigue estando en español y en
 * los reglamentos europeos, y los enlaces de cada bloque llevan al original.
 */

import { getLocale, type Locale } from '../i18n';
import { RULE_SECTIONS_ES, SOURCES_ES } from './rules.es';
import { RULE_SECTIONS_EN, SOURCES_EN } from './rules.en';

export interface RuleSection {
  id: string;
  icon: string;
  title: string;
  intro: string;
  bullets: string[];
  source: string;
  sourceUrl: string;
}

export interface RuleSource {
  label: string;
  url: string;
}

/** Los bloques de normativa, en el idioma activo. */
export function ruleSections(locale: Locale = getLocale()): RuleSection[] {
  return locale === 'en' ? RULE_SECTIONS_EN : RULE_SECTIONS_ES;
}

/** Enlaces a las fuentes oficiales. Los documentos están en español. */
export function ruleSources(locale: Locale = getLocale()): RuleSource[] {
  return locale === 'en' ? SOURCES_EN : SOURCES_ES;
}
