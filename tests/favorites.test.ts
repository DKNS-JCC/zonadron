/**
 * Sitios guardados: cómo se llaman y qué se enseña de ellos. Sin red.
 *
 *   npm run test:unit
 *
 * Lo que se protege aquí es que un sitio nunca se quede sin nombre y que lo que
 * escribes tú mande siempre sobre lo que dijo el mapa.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  favoriteCoords,
  favoriteHasDetail,
  favoriteName,
  favoriteNotePreview,
  favoritePlaceLine,
  matchFavorites,
} from '../src/logic/favorites';
import { buildFavoriteShareText } from '../src/logic/share';
import type { FavoriteEntry } from '../src/state/FavoritesContext';

const sitio = (extra: Partial<FavoriteEntry> = {}): FavoriteEntry => ({
  id: '40.417,-3.704',
  lat: 40.4168,
  lon: -3.7038,
  label: 'Cervera de Buitrago, Madrid',
  savedAt: '2026-01-05T10:00:00.000Z',
  lastLevel: 'LIBRE',
  lastCheckedAt: '2026-01-05T10:00:00.000Z',
  ...extra,
});

test('el nombre que pones tú manda sobre el del mapa', () => {
  assert.equal(favoriteName(sitio({ name: 'La presa, orilla este' })), 'La presa, orilla este');
});

test('sin nombre propio se usa el del mapa', () => {
  assert.equal(favoriteName(sitio()), 'Cervera de Buitrago, Madrid');
});

test('un nombre a base de espacios no cuenta como nombre', () => {
  assert.equal(favoriteName(sitio({ name: '   ' })), 'Cervera de Buitrago, Madrid');
});

test('sin nada de nada quedan las coordenadas, nunca un hueco', () => {
  const n = favoriteName(sitio({ label: '' }));
  assert.equal(n, '40.4168, -3.7038');
});

test('la dirección sólo se repite debajo si aporta algo', () => {
  assert.equal(favoritePlaceLine(sitio()), null, 'sin nombre propio no se repite');
  assert.equal(
    favoritePlaceLine(sitio({ name: 'La presa' })),
    'Cervera de Buitrago, Madrid',
  );
  assert.equal(
    favoritePlaceLine(sitio({ name: 'Cervera de Buitrago, Madrid' })),
    null,
    'no se enseña dos veces lo mismo',
  );
});

test('de la nota se enseña la primera línea con algo escrito', () => {
  assert.equal(favoriteNotePreview(sitio()), null);
  assert.equal(favoriteNotePreview(sitio({ note: '   ' })), null);
  assert.equal(
    favoriteNotePreview(sitio({ note: '\n\n  Aparcar en la pista de tierra\nTendido al norte' })),
    'Aparcar en la pista de tierra',
  );
});

test('un sitio con algo escrito encima se distingue de una coordenada pelada', () => {
  assert.equal(favoriteHasDetail(sitio()), false);
  assert.equal(favoriteHasDetail(sitio({ note: 'ojo con el tendido' })), true);
  assert.equal(favoriteHasDetail(sitio({ heightM: 30 })), true);
});

test('las coordenadas salen con cinco decimales, listas para pegar', () => {
  assert.equal(favoriteCoords(sitio()), '40.41680, -3.70380');
});

test('el texto para compartir lleva nombre, notas y punto, y ningún veredicto', () => {
  const texto = buildFavoriteShareText(
    sitio({ name: 'La presa', note: 'Aparcar en la pista de tierra', heightM: 60 }),
  );
  assert.match(texto, /La presa/);
  assert.match(texto, /pista de tierra/);
  assert.match(texto, /40\.41680/);
  assert.match(texto, /60 m/);
  assert.doesNotMatch(texto, /Puedes volar/, 'un veredicto de hace meses no se comparte');
});

test('buscar entre tus sitios', async (t) => {
  const lista = [
    sitio({ id: 'a', name: 'La presa', note: 'Aparcar junto al merendero' }),
    sitio({ id: 'b', name: 'Campo de entrenamiento', label: 'Argandá del Rey, Madrid' }),
    sitio({ id: 'c', label: 'Toledo, Castilla-La Mancha' }),
  ];

  await t.test('por el nombre que le pusiste', () => {
    assert.deepEqual(matchFavorites(lista, 'presa').map((f) => f.id), ['a']);
  });

  await t.test('sin distinguir mayúsculas ni tildes', () => {
    assert.deepEqual(matchFavorites(lista, 'ARGANDA').map((f) => f.id), ['b']);
  });

  await t.test('también por lo que escribiste en la nota', () => {
    assert.deepEqual(matchFavorites(lista, 'merendero').map((f) => f.id), ['a']);
  });

  await t.test('primero el que empieza por lo que escribes', () => {
    const dos = [sitio({ id: 'x', name: 'Presa vieja' }), sitio({ id: 'y', name: 'La presa' })];
    assert.deepEqual(matchFavorites(dos, 'presa').map((f) => f.id), ['x', 'y']);
  });

  await t.test('sin texto no se propone nada', () => {
    assert.equal(matchFavorites(lista, '   ').length, 0);
  });
});
