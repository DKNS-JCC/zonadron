/**
 * Motor de decisión: verdict.ts + reference.ts. Sin red — datos sintéticos.
 *
 *   npm run test:unit
 *
 * Portado de scripts/verificar-motor.ts, que mezclaba estas comprobaciones
 * (deterministas) con consultas en vivo a ENAIRE (de red): así se pueden
 * ejecutar solas, rápido y en CI, sin depender de que el servicio esté arriba.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeZone } from '../src/api/enaire';
import { buildVerdict, evaluateZones } from '../src/logic/verdict';
import type { RawZoneAttributes } from '../src/types';

const zonaFalsa = (attrs: Partial<RawZoneAttributes>) =>
  normalizeZone({ identifier: 'TEST', type: 'REQ_AUTHORIZATION', uom: 'M', ...attrs }, 'aero', 0);

test('una capa caída nunca produce "Puedes volar"', () => {
  const v = buildVerdict([], 120, ['aero']);
  assert.equal(v.level, 'DESCONOCIDO');
  assert.equal(v.incomplete, true);
});

test('sin capas caídas y sin zonas sí se puede volar', () => {
  const v = buildVerdict([], 120, []);
  assert.equal(v.level, 'LIBRE');
});

test('una zona prohibida manda aunque falte una capa', () => {
  const zona = zonaFalsa({ type: 'PROHIBITED', lower: 0, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
  const v = buildVerdict(evaluateZones([zona], 120, 500), 120, ['urbano']);
  assert.equal(v.level, 'PROHIBIDO');
});

test('con unidad desconocida la zona se considera aplicable', () => {
  const zona = zonaFalsa({ uom: '', lower: 300, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
  const [ev] = evaluateZones([zona], 120, 500);
  assert.equal(ev.vertical.affects, true);
});

test('en metros, una zona que empieza a 300 m no afecta a un vuelo de 120 m', () => {
  const zona = zonaFalsa({ uom: 'M', lower: 300, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
  const [ev] = evaluateZones([zona], 120, 500);
  assert.equal(ev.vertical.affects, false);
});

test('una zona referida a W84 se considera aplicable (no se convierte a ciegas)', () => {
  // El error del geoide en España es de ~50 m, siempre hacia el lado permisivo
  // si se convirtiera a ciegas: mejor no fingir precisión que no se tiene.
  const zona = zonaFalsa({ lower: 500, lowerReference: 'W84', upper: 2000, upperReference: 'W84' });
  const [ev] = evaluateZones([zona], 120, 500);
  assert.equal(ev.vertical.affects, true);
});

test('sin elevación del terreno, una zona AMSL se considera aplicable', () => {
  const zona = zonaFalsa({ lower: 1000, lowerReference: 'AMSL', upper: 2000, upperReference: 'AMSL' });
  const [ev] = evaluateZones([zona], 120, null);
  assert.equal(ev.vertical.affects, true);
});

test('una zona recién terminada no se descarta de inmediato', () => {
  const haceDosHoras = new Date(Date.now() - 2 * 3600e3).toISOString().slice(0, 19);
  const zona = zonaFalsa({ endDateTime: haceDosHoras, lower: 0, lowerReference: 'AGL' });
  const [ev] = evaluateZones([zona], 120, 500, new Date());
  assert.notEqual(ev.timing, 'CADUCADA');
});

test('altura medida desde el punto de referencia del aeródromo', async (t) => {
  // 519 de las 1.679 zonas aeronáuticas de ENAIRE dicen "90 m AGL" pero su
  // texto aclara que esos metros se cuentan desde el ARP, no desde el suelo
  // donde estás. Caso real: helipuerto del Hospital de Salamanca.
  const msg =
    'Se encuentra en la Zona geografica de UAS General de HOSPITAL X, LEBJ. ' +
    'Por debajo de 90m medidos desde el punto de referencia del aerodromo (770m), no es necesario coordinar la operacion.';
  const zona = zonaFalsa({ message: msg, lower: 90, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });

  await t.test('se lee la elevación del punto de referencia', () => {
    assert.equal(zona.referenceElevation, 770);
  });

  await t.test('terreno más alto que el aeródromo: la zona empieza antes de los 90 m', () => {
    const [alto] = evaluateZones([zona], 120, 785);
    assert.equal(alto.vertical.affects, true);
    assert.equal(Math.round(alto.vertical.lowerAgl ?? -1), 75);
  });

  await t.test('terreno más bajo que el aeródromo: la zona empieza a 160 m y no afecta a 120 m', () => {
    const [bajo] = evaluateZones([zona], 120, 700);
    assert.equal(bajo.vertical.affects, false);
    assert.equal(Math.round(bajo.vertical.lowerAgl ?? -1), 160);
  });

  await t.test('sin elevación del terreno no se puede calcular: se asume que afecta', () => {
    const [sinTerreno] = evaluateZones([zona], 120, null);
    assert.equal(sinTerreno.vertical.affects, true);
  });
});

test('sin elevación publicada del aeródromo (paréntesis vacío), se marca como no calculable', () => {
  // ENAIRE deja el paréntesis vacío en muchos helipuertos de hospital.
  const msg = 'Por debajo de 90m medidos desde el punto de referencia del aerodromo (), no es necesario coordinar.';
  const zona = zonaFalsa({ message: msg, lower: 90, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
  assert.equal(zona.referenceElevationMissing, true);
  const [ev] = evaluateZones([zona], 30, 785);
  assert.equal(ev.vertical.affects, true);
});

test('una zona AGL normal sigue midiéndose desde el suelo, no desde ningún ARP', () => {
  const zona = zonaFalsa({ message: 'Zona normal sin referencia.', lower: 90, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
  const [ev] = evaluateZones([zona], 120, 785);
  assert.equal(Math.round(ev.vertical.lowerAgl ?? -1), 90);
});

test('techo libre: hasta dónde se puede subir sin pedir permiso', async (t) => {
  await t.test('el techo libre es el suelo de la zona que exige permiso', () => {
    const zona = zonaFalsa({ type: 'REQ_AUTHORIZATION', lower: 74, lowerReference: 'AGL', upper: 900, upperReference: 'AGL', name: 'ZONA ALTA' });
    const v = buildVerdict(evaluateZones([zona], 120, 500), 120, []);
    assert.equal(v.maxFreeHeight.metres, 74);
  });

  await t.test('sin zonas, el techo libre es el límite legal de 120 m', () => {
    const v = buildVerdict([], 120, []);
    assert.equal(v.maxFreeHeight.metres, 120);
    assert.equal(v.maxFreeHeight.legalLimit, true);
  });

  await t.test('con una zona desde el suelo, el techo libre es cero', () => {
    const zona = zonaFalsa({ type: 'PROHIBITED', lower: 0, lowerReference: 'AGL', upper: 900, upperReference: 'AGL', name: 'PROHIBIDA' });
    const v = buildVerdict(evaluateZones([zona], 120, 500), 120, []);
    assert.equal(v.maxFreeHeight.metres, 0);
  });

  await t.test('una zona condicional no baja el techo libre', () => {
    const zona = zonaFalsa({ type: 'CONDITIONAL', lower: 0, lowerReference: 'AGL', upper: 120, upperReference: 'AGL', name: 'CONDICIONAL' });
    const v = buildVerdict(evaluateZones([zona], 120, 500), 120, []);
    assert.equal(v.maxFreeHeight.metres, 120);
  });
});

test('los avisos generales se reconocen por identificador, no por capa entera', () => {
  // ZGUAS_Urbano son en realidad las cuatro FIR españolas: si se contase por
  // capa, cualquier punto de España saldría en rojo. Ver ADVISORY_LAYERS.
  const aviso = normalizeZone({ identifier: 'NPDRID', type: 'REQ_AUTHORIZATION', uom: 'M' }, 'urbano', 0);
  const zonaReal = normalizeZone({ identifier: 'URB0001', type: 'REQ_AUTHORIZATION', uom: 'M', lower: 0, lowerReference: 'AGL' }, 'urbano', 1);
  assert.equal(aviso.advisory, true);
  assert.equal(zonaReal.advisory, false);
});
