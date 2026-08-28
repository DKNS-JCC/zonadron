/**
 * Filtro de altura de los NOTAM: notamLowerLimit + notamReachable. Sin red.
 *
 *   npm run test:unit
 *
 * Los textos de FLYING_LEVELS_DESC de aquí abajo son literales, copiados de lo
 * que devuelve hoy el servicio de ENAIRE: son las 136 formas distintas que
 * tiene de escribir una franja vertical, resumidas en las que importan.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notamLowerLimit, notamReachable } from '../src/logic/notam';
import type { Notam } from '../src/api/notam';

const notam = (levels: string, lowerM: number | null = 0): Notam => ({
  id: 'V00000/26',
  from: null,
  to: null,
  fromLabel: '',
  toLabel: '',
  schedule: '',
  text: '',
  levels,
  lowerM,
  upperM: null,
  qcode: '',
  activeNow: true,
});

test('SFC y GND se leen como "desde el suelo"', () => {
  for (const texto of ['SFC / 04300FT AMSL', 'GND / 00120M AGL', 'SFC / FL245']) {
    assert.deepEqual(notamLowerLimit(notam(texto)), { metres: 0, ref: 'suelo' }, texto);
  }
});

test('el límite inferior se lee con su referencia y en metros', () => {
  assert.deepEqual(notamLowerLimit(notam('02500FT AMSL / 05000FT AMSL')), {
    metres: 762,
    ref: 'amsl',
  });
  assert.deepEqual(notamLowerLimit(notam('00100M AGL / 00300M AGL')), { metres: 100, ref: 'agl' });
  assert.deepEqual(notamLowerLimit(notam('FL070 / FL240')), { metres: 2134, ref: 'amsl' });
});

test('un NOTAM que arranca en el suelo siempre te puede tocar', () => {
  assert.equal(notamReachable(notam('SFC / 10000FT AMSL'), 120, 650), true);
  // Aunque vueles a ras y el terreno esté al nivel del mar.
  assert.equal(notamReachable(notam('GND / 00030M AGL'), 10, 0), true);
});

test('por encima de tu altura de vuelo, un NOTAM en AGL deja de contar', () => {
  assert.equal(notamReachable(notam('00300M AGL / 00600M AGL'), 120, 650), false);
  assert.equal(notamReachable(notam('00100M AGL / 00300M AGL'), 120, 650), true);
  // Y si bajas la altura de vuelo, el mismo NOTAM se cae de la lista.
  assert.equal(notamReachable(notam('00100M AGL / 00300M AGL'), 30, 650), false);
});

test('el AMSL se mide contra el terreno, no contra el mar', () => {
  const alto = notam('02500FT AMSL / 05000FT AMSL'); // 762 m AMSL
  // A nivel del mar son 762 m por encima de ti: inalcanzable.
  assert.equal(notamReachable(alto, 120, 0), false);
  // En un puerto de montaña a 700 m, esos mismos 762 m te caen dentro.
  assert.equal(notamReachable(alto, 120, 700), true);
});

test('sin elevación del terreno no se descarta ningún NOTAM', () => {
  assert.equal(notamReachable(notam('FL070 / FL240'), 120, null), true);
  assert.equal(notamReachable(notam('02500FT AMSL / 05000FT AMSL'), 120, null), true);
});

test('un texto de alturas que no se entiende nunca oculta el aviso', () => {
  assert.equal(notamReachable(notam('LO QUE SEA', 12000), 120, 0), true);
  assert.equal(notamReachable(notam(''), 120, 0), true);
});
