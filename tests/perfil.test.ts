/**
 * Perfil: la flota y la carpeta de documentos.
 *
 * Lo que se prueba aquí es lo que puede dejarte tirado en el campo: una ficha
 * guardada que no se vuelve a leer bien, una caducidad mal contada, o el dron
 * que tenías en la versión anterior perdido al actualizar.
 *
 *   npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  droneFromLegacy,
  droneName,
  droneOfficialModel,
  emptyDrone,
  missingDroneFields,
  normaliseDrone,
} from '../src/logic/fleet';
import {
  daysUntil,
  documentStatus,
  expiringDocuments,
  extensionOf,
  formatBytes,
  formatDateInput,
  normaliseDocument,
  parseDateInput,
  sortDocuments,
  titleFromFileName,
  type StoredDocument,
} from '../src/logic/documents';

/* ------------------------------------------------------------------ */
/* Flota                                                               */
/* ------------------------------------------------------------------ */

test('un dron se identifica aunque esté a medio rellenar', () => {
  const conAlias = { ...emptyDrone(), alias: 'El pequeño', manufacturer: 'DJI', model: 'Mini 4' };
  assert.equal(droneName(conAlias), 'El pequeño');
  // El alias es tuyo; en la solicitud va la marca y el modelo.
  assert.equal(droneOfficialModel(conAlias), 'DJI Mini 4');

  const sinAlias = { ...emptyDrone(), manufacturer: 'DJI', model: 'Air 3' };
  assert.equal(droneName(sinAlias), 'DJI Air 3');

  const vacio = emptyDrone();
  assert.ok(droneName(vacio).length > 0, 'un dron sin datos sigue teniendo que poder listarse');
});

test('a una solicitud le falta lo que le falte al dron', () => {
  assert.equal(missingDroneFields(null).length, 1, 'sin dron guardado falta todo');
  assert.equal(missingDroneFields({ ...emptyDrone(), model: 'Mini 4', serial: '1581F' }).length, 0);
  assert.equal(missingDroneFields({ ...emptyDrone(), model: 'Mini 4' }).length, 1, 'falta la serie');
});

test('el dron de la versión anterior se convierte en el primero de la flota', () => {
  const migrado = droneFromLegacy('DJI Mini 2', '1581F5FHD', 'sub250');
  assert.ok(migrado);
  assert.equal(migrado.model, 'DJI Mini 2');
  assert.equal(migrado.serial, '1581F5FHD');
  assert.equal(migrado.profile, 'sub250');
  // Quien no tenía nada puesto no se encuentra un dron fantasma en la lista.
  assert.equal(droneFromLegacy('', '', 'c1'), null);
  assert.equal(droneFromLegacy('  ', ' ', 'c1'), null);
});

test('una ficha guardada a medias se lee sin romper nada', () => {
  const leido = normaliseDrone({ id: 'x1', model: 'Air 3', profile: 'inventada', weightGrams: '720' });
  assert.ok(leido);
  assert.equal(leido.id, 'x1');
  assert.equal(leido.profile, 'otro', 'una clase que no existe cae en el perfil más conservador');
  assert.equal(leido.weightGrams, 720);
  assert.equal(leido.alias, '');
  assert.equal(normaliseDrone(null), null);
  assert.equal(normaliseDrone('DJI'), null);
});

/* ------------------------------------------------------------------ */
/* Documentos                                                          */
/* ------------------------------------------------------------------ */

function doc(patch: Partial<StoredDocument> = {}): StoredDocument {
  return {
    id: 'd1',
    title: 'Seguro',
    category: 'seguro',
    droneId: null,
    fileName: 'seguro.pdf',
    storedName: 'd1.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    addedAt: '2026-01-01T10:00:00.000Z',
    expiresAt: null,
    notes: '',
    ...patch,
  };
}

const hoy = new Date('2026-08-21T09:00:00Z');

test('las caducidades se cuentan por días enteros', () => {
  assert.equal(daysUntil('2026-08-21', hoy), 0, 'hoy caduca hoy, no mañana');
  assert.equal(daysUntil('2026-08-22', hoy), 1);
  assert.equal(daysUntil('2026-08-20', hoy), -1);
  assert.equal(daysUntil('2026-02-30', hoy), null, 'el 30 de febrero no existe');
});

test('un papel está vigente, a punto o caducado', () => {
  assert.equal(documentStatus(doc(), hoy), 'sinFecha');
  assert.equal(documentStatus(doc({ expiresAt: '2027-01-01' }), hoy), 'vigente');
  assert.equal(documentStatus(doc({ expiresAt: '2026-09-10' }), hoy), 'porCaducar');
  assert.equal(documentStatus(doc({ expiresAt: '2026-08-21' }), hoy), 'porCaducar', 'el último día aún vale');
  assert.equal(documentStatus(doc({ expiresAt: '2026-08-20' }), hoy), 'caducado');
});

test('lo que hay que renovar sale primero y en orden', () => {
  const lista = [
    doc({ id: 'a', expiresAt: '2027-05-01' }),
    doc({ id: 'b', expiresAt: '2026-08-01' }),
    doc({ id: 'c', expiresAt: '2026-09-01' }),
    doc({ id: 'd', expiresAt: null, addedAt: '2026-07-01T10:00:00.000Z' }),
  ];
  assert.deepEqual(
    expiringDocuments(lista, hoy).map((d) => d.id),
    ['b', 'c'],
  );
  assert.deepEqual(
    sortDocuments(lista, hoy).map((d) => d.id),
    ['b', 'c', 'd', 'a'],
    'caducado, a punto, y luego lo demás con lo recién guardado arriba',
  );
});

test('las fechas escritas a mano se entienden como las escribe la gente', () => {
  assert.equal(parseDateInput('01/09/2027'), '2027-09-01');
  assert.equal(parseDateInput('1-9-2027'), '2027-09-01');
  assert.equal(parseDateInput('1.9.27'), '2027-09-01');
  assert.equal(parseDateInput('31/02/2027'), null);
  assert.equal(parseDateInput('mañana'), null);
  assert.equal(parseDateInput(''), null);
  assert.equal(formatDateInput('2027-09-01'), '01/09/2027');
  assert.equal(formatDateInput(null), '');
});

test('los archivos se nombran y se miden como toca', () => {
  assert.equal(extensionOf('seguro 2026.PDF'), 'pdf');
  assert.equal(extensionOf('sin_extension'), '');
  assert.equal(extensionOf('.oculto'), '', 'un punto al principio no es una extensión');
  assert.equal(titleFromFileName('carnet a1a3.pdf'), 'carnet a1a3');
  assert.equal(formatBytes(0), '—');
  assert.equal(formatBytes(900), '900 B');
  assert.equal(formatBytes(2048), '2 kB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.0 MB');
});

test('una ficha de documento sin archivo detrás se descarta al leerla', () => {
  assert.equal(normaliseDocument({ id: 'x', title: 'Seguro' }), null, 'sin archivo no hay documento');
  assert.equal(normaliseDocument({ storedName: 'x.pdf' }), null, 'sin id no se puede borrar ni editar');
  const leido = normaliseDocument({
    id: 'x',
    storedName: 'x.pdf',
    fileName: 'seguro.pdf',
    category: 'inventada',
    expiresAt: '2026-13-40',
  });
  assert.ok(leido);
  assert.equal(leido.category, 'otro');
  assert.equal(leido.title, 'seguro', 'sin título se usa el nombre del archivo');
  assert.equal(leido.expiresAt, null, 'una fecha imposible es como no tener fecha');
});
