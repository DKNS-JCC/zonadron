import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkLeadTime,
  durationMinutes,
  emptyOperation,
  formatTime,
  localDateTime,
  missingOperationFields,
  operationReady,
  parseLeadHours,
  parseTime,
  requiredLeadHours,
  timeRangeLabel,
  toUtcLabel,
  workingDaysUntil,
  type OperationDetails,
} from '../src/logic/operation';
import type { Zone } from '../src/types';

/**
 * Lo que se comprueba aquí es lo que salió mal en un correo real: una fecha
 * para el mismo día, una hora sin convertir a UTC y una altura sin poner.
 */

function op(over: Partial<OperationDetails> = {}): OperationDetails {
  return { ...emptyOperation(60, 'dron-1'), date: '2026-09-14', startTime: '18:00', endTime: '20:00', ...over };
}

function zone(over: Partial<Zone> = {}): Zone {
  return {
    key: 'k',
    layer: 'aero',
    identifier: 'TEST',
    title: 'Zona de prueba',
    category: 'CTR',
    type: 'REQ_AUTHORIZATION',
    reasons: [],
    officialHtml: '',
    officialText: '',
    advisory: false,
    referenceElevation: null,
    referenceElevationMissing: false,
    lower: 0,
    lowerRef: 'AGL',
    upper: 120,
    upperRef: 'AGL',
    uom: 'M',
    contact: {},
    applicability: {},
    raw: {},
    ...over,
  };
}

test('las horas se leen y se escriben en HH:MM', () => {
  assert.equal(parseTime('18:00'), 1080);
  assert.equal(parseTime('00:00'), 0);
  assert.equal(parseTime('23:59'), 1439);
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('18:60'), null);
  assert.equal(parseTime('seis'), null);
  assert.equal(formatTime(1080), '18:00');
  assert.equal(formatTime(5), '00:05');
});

test('la duración sale de las dos horas, y cruza la medianoche', () => {
  assert.equal(durationMinutes(op()), 120);
  assert.equal(durationMinutes(op({ startTime: '23:30', endTime: '00:30' })), 60);
  assert.equal(durationMinutes(op({ endTime: '' })), null);
});

test('una fecha que no existe no se acepta', () => {
  assert.equal(localDateTime('2026-02-31', '10:00'), null);
  assert.equal(localDateTime('2026-13-01', '10:00'), null);
  assert.notEqual(localDateTime('2026-02-28', '10:00'), null);
});

test('la hora UTC es la misma hora vista desde el meridiano de Greenwich', () => {
  const local = localDateTime('2026-09-14', '18:00');
  assert.ok(local);
  const esperado =
    String(local!.getUTCHours()).padStart(2, '0') +
    ':' +
    String(local!.getUTCMinutes()).padStart(2, '0') +
    'Z';
  assert.equal(toUtcLabel('2026-09-14', '18:00'), esperado);
  assert.match(timeRangeLabel(op()) ?? '', /^18:00–20:00 \(\d{2}:\d{2}Z–\d{2}:\d{2}Z\)$/);
  assert.equal(timeRangeLabel(op({ startTime: '' })), null);
});

test('los días hábiles no cuentan sábados ni domingos', () => {
  // Del lunes 31 de agosto de 2026 al lunes 14 de septiembre hay dos fines de
  // semana por medio: catorce días naturales, diez hábiles.
  const lunes = new Date(2026, 7, 31);
  assert.equal(lunes.getDay(), 1, 'el 31 de agosto de 2026 es lunes');
  assert.equal(workingDaysUntil('2026-09-14', lunes), 10);
  assert.equal(workingDaysUntil('2026-09-01', lunes), 1);
  assert.equal(workingDaysUntil('2026-08-31', lunes), 0, 'hoy no cuenta');
  assert.equal(workingDaysUntil('2026-08-01', lunes), 0, 'una fecha pasada tampoco');
  assert.equal(workingDaysUntil('no es una fecha', lunes), null);
});

test('la antelación publicada por ENAIRE se lee en formato ISO-8601', () => {
  assert.equal(parseLeadHours('PT48H'), 48);
  assert.equal(parseLeadHours('PT72H'), 72);
  assert.equal(parseLeadHours('P5D'), 120);
  assert.equal(parseLeadHours('P7D'), 168);
  // ENAIRE publica algún valor con basura delante.
  assert.equal(parseLeadHours(';PT72H'), 72);
  assert.equal(parseLeadHours(''), null);
  assert.equal(parseLeadHours(undefined), null);
  assert.equal(parseLeadHours('mañana'), null);
});

test('entre varias zonas manda la que pide más antelación', () => {
  const zonas = [zone({ leadInterval: 'PT48H' }), zone({ leadInterval: 'P7D' }), zone()];
  assert.equal(requiredLeadHours(zonas), 168);
  assert.equal(requiredLeadHours([zone()]), null);
});

test('volar el mismo día se avisa, que es lo que pasó de verdad', () => {
  const hoy = new Date(2026, 7, 26, 16, 35);
  const mismoDia = op({ date: '2026-08-26', startTime: '18:00', endTime: '20:00' });
  const check = checkLeadTime(mismoDia, [zone()], hoy);
  assert.equal(check.ok, false);
  assert.match(check.warning ?? '', /días hábiles/);
});

test('con la antelación publicada de la zona se usa esa y no los diez días', () => {
  const hoy = new Date(2026, 7, 26, 10, 0);
  const zonas = [zone({ leadInterval: 'PT48H' })];
  assert.equal(checkLeadTime(op({ date: '2026-08-27' }), zonas, hoy).ok, false);
  assert.equal(checkLeadTime(op({ date: '2026-08-29' }), zonas, hoy).ok, true);
});

test('sin fecha no se avisa de nada: aún no ha elegido', () => {
  assert.equal(checkLeadTime(op({ date: '' }), [zone()]).ok, true);
  assert.equal(checkLeadTime(op({ date: '' }), [zone()]).warning, null);
});

test('lo que falta se enumera para poder enseñarlo', () => {
  assert.deepEqual(missingOperationFields(op()), []);
  assert.ok(operationReady(op()));

  const vacia = emptyOperation(0, null);
  const faltan = missingOperationFields(vacia);
  assert.equal(faltan.length, 5, 'fecha, inicio, fin, altura y dron');
  assert.ok(!operationReady(vacia));

  // «Otro» obliga a explicar qué es: es lo que va a leer el gestor.
  const otro = op({ purpose: 'otro', purposeDetail: '' });
  assert.deepEqual(missingOperationFields(otro), ['qué vas a hacer exactamente']);
  assert.ok(operationReady(op({ purpose: 'otro', purposeDetail: 'Rodaje de un corto' })));
});
