/**
 * Punto fuera de España: airspace.ts + buildOutsideVerdict. Sin red.
 *
 *   npm run test:unit
 *
 * Lo que se protege aquí es el fallo que motivó todo esto: un punto de Lisboa
 * devuelve de ENAIRE exactamente lo mismo que un descampado de Cuenca —cero
 * zonas— y la app respondía «Puedes volar, 120 m».
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeZone } from '../src/api/enaire';
import {
  buildNoCoverageVerdict,
  buildOutsideVerdict,
  buildVerdict,
  evaluateZones,
} from '../src/logic/verdict';
import {
  authorityFor,
  countryFlag,
  isEasaState,
  isSpanishAirspace,
} from '../src/logic/airspace';
import type { RawZoneAttributes } from '../src/types';

/** Uno de los cuatro polígonos FIR que ENAIRE publica en la capa `urbano`. */
const fir = (identifier = 'NPDRID') =>
  normalizeZone({ identifier, type: 'CONDITIONAL', uom: 'M' } as RawZoneAttributes, 'urbano', 0);

const zonaAero = () =>
  normalizeZone(
    { identifier: 'ES-CTR-LEMD', type: 'REQ_AUTHORIZATION', uom: 'M' } as RawZoneAttributes,
    'aero',
    0,
  );

test('sin ningún polígono FIR el punto no es español', () => {
  assert.equal(isSpanishAirspace([]), false);
});

test('el FIR de la capa urbano identifica el espacio aéreo español', () => {
  assert.equal(isSpanishAirspace([fir()]), true);
  assert.equal(isSpanishAirspace([fir('NPLONA')]), true);
  assert.equal(isSpanishAirspace([fir('NPRIAS')]), true);
  assert.equal(isSpanishAirspace([fir('NPILLA')]), true);
});

test('una zona normal no vale como prueba de estar en España', () => {
  assert.equal(isSpanishAirspace([zonaAero()]), false);
});

test('fuera de España nunca se responde "Puedes volar"', () => {
  const v = buildOutsideVerdict({ code: 'pt', name: 'Portugal' });
  assert.equal(v.level, 'FUERA_DE_ESPANA');
  assert.notEqual(v.level, 'LIBRE');
  assert.match(v.summary, /Portugal/);
});

test('fuera de España no se da ninguna altura libre', () => {
  const v = buildOutsideVerdict({ code: 'fr', name: 'Francia' });
  assert.equal(v.maxFreeHeight.metres, null);
  assert.equal(v.maxFreeHeight.legalLimit, false);
});

test('sin saber el país el mensaje sigue funcionando', () => {
  const v = buildOutsideVerdict();
  assert.equal(v.level, 'FUERA_DE_ESPANA');
  assert.ok(v.summary.length > 0);
});

test('dentro de España el veredicto normal sigue intacto', () => {
  const v = buildVerdict([], 120, []);
  assert.equal(v.level, 'LIBRE');
  assert.equal(v.maxFreeHeight.metres, 120);
});

test('las autoridades conocidas tienen enlace y el resto no se inventa', () => {
  assert.equal(authorityFor('pt')?.name, 'ANAC');
  assert.equal(authorityFor('PT')?.name, 'ANAC');
  assert.equal(authorityFor('jp'), null);
  assert.equal(authorityFor(null), null);
});

test('el ámbito europeo se distingue del resto', () => {
  assert.equal(isEasaState('pt'), true);
  assert.equal(isEasaState('no'), true);
  assert.equal(isEasaState('ma'), false);
  assert.equal(isEasaState(null), false);
});

test('la bandera sale del código ISO y aguanta la basura', () => {
  assert.equal(countryFlag('pt'), '🇵🇹');
  assert.equal(countryFlag('FR'), '🇫🇷');
  assert.equal(countryFlag(null), '');
  assert.equal(countryFlag('xyz'), '');
});

test('un punto español sin FIR (Llívia) no sale ni verde ni fuera de España', () => {
  const v = buildNoCoverageVerdict([], 120, []);
  assert.equal(v.level, 'DESCONOCIDO');
  assert.equal(v.maxFreeHeight.metres, null);
  assert.equal(v.incomplete, true);
});

test('si además hay una zona prohibida, manda la zona', () => {
  const zona = normalizeZone(
    { identifier: 'X', type: 'PROHIBITED', uom: 'M', lower: 0, lowerReference: 'AGL' } as RawZoneAttributes,
    'aero',
    0,
  );
  const evaluado = evaluateZones([zona], 120, 500);
  assert.equal(buildNoCoverageVerdict(evaluado, 120, []).level, 'PROHIBIDO');
});
