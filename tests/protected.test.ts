/**
 * Espacios naturales protegidos: parseo de la respuesta del IEPNB y
 * clasificación de figuras de protección. Sin red — respuestas reales
 * capturadas del servicio.
 *
 *   npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStrictFigure, parseProtectedAreas } from '../src/api/protected';

// Respuesta real de GetFeatureInfo sobre Doñana, recortada a lo que se pide.
const DONANA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'enp.1606',
      geometry: null,
      properties: {
        nombre: 'Doñana',
        designacion: 'Zona de Importancia Comunitaria ZIC (ZEPA/ZEC)',
        nombre_organismo: 'Junta de Andalucía',
        nb_grupo: 'ESPACIOS NATURALES PROTEGIDOS',
      },
    },
    {
      type: 'Feature',
      id: 'enp.621',
      geometry: null,
      properties: {
        nombre: 'Doñana',
        designacion: 'Parque Natural',
        nombre_organismo: 'Junta de Andalucía',
        nb_grupo: 'ESPACIOS NATURALES PROTEGIDOS',
      },
    },
  ],
};

test('parsea los espacios de una respuesta del IEPNB', () => {
  const areas = parseProtectedAreas(DONANA, 'enp');
  assert.equal(areas.length, 2);
  assert.equal(areas[0].name, 'Doñana');
  assert.equal(areas[0].organism, 'Junta de Andalucía');
  assert.equal(areas[1].designation, 'Parque Natural');
  assert.equal(areas[1].source, 'enp');
});

test('una respuesta sin espacios da una lista vacía, no un error', () => {
  assert.deepEqual(parseProtectedAreas({ type: 'FeatureCollection', features: [] }, 'rn2000'), []);
});

test('una respuesta inesperada no revienta', () => {
  // El servicio devuelve XML de excepción ante un error; si algo así llegara
  // aquí ya parseado, no puede tumbar la pantalla de resultado.
  assert.deepEqual(parseProtectedAreas(null, 'enp'), []);
  assert.deepEqual(parseProtectedAreas({}, 'enp'), []);
  assert.deepEqual(parseProtectedAreas({ features: 'no soy un array' }, 'enp'), []);
});

test('los campos vacíos de GeoServer se normalizan a null', () => {
  // GeoServer serializa los nulos de la base como la cadena "null".
  const areas = parseProtectedAreas(
    {
      features: [
        { properties: { nombre: 'Sitio', designacion: 'null', nombre_organismo: '  ' } },
      ],
    },
    'rn2000',
  );
  assert.equal(areas.length, 1);
  assert.equal(areas[0].designation, null);
  assert.equal(areas[0].organism, null);
});

test('un espacio sin nombre se descarta: no hay nada que enseñar', () => {
  const areas = parseProtectedAreas({ features: [{ properties: { designacion: 'Parque Natural' } }] }, 'enp');
  assert.deepEqual(areas, []);
});

test('figuras estrictas: las que casi siempre prohíben o exigen permiso', () => {
  assert.equal(isStrictFigure('Parque Nacional'), true);
  assert.equal(isStrictFigure('Parque Natural'), true);
  assert.equal(isStrictFigure('Reserva Natural Integral'), true);
  assert.equal(isStrictFigure('Reserva de la Biosfera'), true);
  assert.equal(isStrictFigure('Parque Regional'), true);
});

test('figuras no estrictas: protegidas, pero no equivalen a prohibición', () => {
  // Red Natura 2000 cubre en torno a la cuarta parte de España: tratarla como
  // figura estricta pondría media península en tono de alarma.
  assert.equal(isStrictFigure('Zona de Importancia Comunitaria ZIC (ZEPA/ZEC)'), false);
  assert.equal(isStrictFigure('Monumento Natural'), false);
  assert.equal(isStrictFigure(null), false);
});
