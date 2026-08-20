import assert from 'node:assert/strict';
import test from 'node:test';

import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { resolveLocale, setLocale, t } from '../src/i18n';
import { verdictLevelLabel } from '../src/logic/labels';
import { droneProfiles } from '../src/logic/drone';
import { ruleSections } from '../src/logic/rules';

/**
 * El compilador ya obliga a que `en` tenga las mismas claves que `es` (ver el
 * tipo `Messages`), pero eso no impide dejarse una traducción sin traducir ni
 * meter una función donde había un texto fijo. Esto sí.
 */

test('los dos diccionarios tienen exactamente las mismas claves', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
});

test('cada clave es del mismo tipo en los dos idiomas', () => {
  for (const key of Object.keys(es) as (keyof typeof es)[]) {
    assert.equal(
      typeof en[key],
      typeof es[key],
      `${key}: ${typeof es[key]} en español y ${typeof en[key]} en inglés`,
    );
  }
});

test('las funciones piden el mismo número de argumentos', () => {
  for (const key of Object.keys(es) as (keyof typeof es)[]) {
    const a = es[key];
    const b = en[key];
    if (typeof a === 'function' && typeof b === 'function') {
      assert.equal(b.length, a.length, `${key} recibe ${a.length} argumentos en español`);
    }
  }
});

test('no queda ningún texto sin traducir', () => {
  const shared = new Set([
    // Siglas, formatos y nombres propios que se escriben igual.
    'basemap.mapa',
    'reason.PRIVACY',
    'verticalRef.AGL',
    'coverage.legend.high',
    'coverage.legend.mid',
    'settings.field.namePlaceholder',
    'weather.metric.temp',
    'settings.appearanceA11y',
    'settings.languageA11y',
  ]);
  const same: string[] = [];
  for (const key of Object.keys(es) as (keyof typeof es)[]) {
    if (shared.has(key)) continue;
    const a = es[key];
    const b = en[key];
    if (typeof a === 'string' && typeof b === 'string' && a === b && a.trim().length > 3) {
      same.push(key);
    }
  }
  assert.deepEqual(same, [], `mismo texto en los dos idiomas: ${same.join(', ')}`);
});

test('cambiar de idioma cambia lo que devuelve t()', () => {
  setLocale('es');
  assert.equal(t('level.LIBRE'), 'Puedes volar');
  assert.equal(verdictLevelLabel('PROHIBIDO'), 'No puedes volar');

  setLocale('en');
  assert.equal(t('level.LIBRE'), 'You can fly');
  assert.equal(verdictLevelLabel('PROHIBIDO'), 'You cannot fly');

  setLocale('es');
});

test('los perfiles de dron y las normas existen en los dos idiomas', () => {
  const ids = (locale: 'es' | 'en') => droneProfiles(locale).map((d) => d.id);
  assert.deepEqual(ids('en'), ids('es'));

  const sections = (locale: 'es' | 'en') => ruleSections(locale).map((s) => s.id);
  assert.deepEqual(sections('en'), sections('es'));

  // Los enlaces oficiales son los mismos documentos en los dos idiomas.
  const urls = (locale: 'es' | 'en') => ruleSections(locale).map((s) => s.sourceUrl);
  assert.deepEqual(urls('en'), urls('es'));
});

test('el idioma del sistema se traduce a uno de los que hay', () => {
  assert.equal(resolveLocale('sistema', 'en-GB'), 'en');
  assert.equal(resolveLocale('sistema', 'es-ES'), 'es');
  // Un idioma que no tenemos cae al español, que es el de los datos oficiales.
  assert.equal(resolveLocale('sistema', 'de'), 'es');
  assert.equal(resolveLocale('sistema', null), 'es');
  // Una elección explícita manda sobre el móvil.
  assert.equal(resolveLocale('en', 'es-ES'), 'en');
  assert.equal(resolveLocale('es', 'en-GB'), 'es');
});
