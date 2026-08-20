import assert from 'node:assert/strict';
import test from 'node:test';

import { firstUrl, parseSharedLabel, parseSharedPoint } from '../src/logic/sharedPoint';

/**
 * Formatos reales de lo que mandan Google Maps y Apple Maps al menú de
 * compartir. Si alguno cambia, esto es lo que se entera primero.
 */

test('Google: la chincheta manda sobre el centro del mapa', () => {
  // El enlace largo trae las dos: @ es el encuadre, !3d!4d es el sitio.
  const url =
    'https://www.google.com/maps/place/Playa+de+la+Malvarrosa/@39.4700,-0.3300,15z/' +
    'data=!3m1!4b1!4m6!3m5!1s0xd6048c0d7b1b1b1:0x1!8m2!3d39.4756!4d-0.3229!16s%2Fg%2F11abc';
  assert.deepEqual(parseSharedPoint(url), {
    lat: 39.4756,
    lon: -0.3229,
    label: 'Playa de la Malvarrosa',
  });
});

test('Google: un enlace sin chincheta cae al centro del mapa', () => {
  assert.deepEqual(parseSharedPoint('https://www.google.com/maps/@40.4168,-3.7038,17z'), {
    lat: 40.4168,
    lon: -3.7038,
    label: null,
  });
});

test('Google: los enlaces de búsqueda y de ruta también sirven', () => {
  assert.deepEqual(
    parseSharedPoint('https://www.google.com/maps/search/?api=1&query=39.7,-4.1'),
    { lat: 39.7, lon: -4.1, label: null },
  );
  assert.deepEqual(
    parseSharedPoint('https://www.google.com/maps/dir/?api=1&destination=39.7%2C-4.1'),
    { lat: 39.7, lon: -4.1, label: null },
  );
  assert.deepEqual(parseSharedPoint('https://maps.google.com/?q=38.3452,-0.4815'), {
    lat: 38.3452,
    lon: -0.4815,
    label: null,
  });
});

test('Apple Maps: ll, coordinate y daddr', () => {
  assert.deepEqual(parseSharedPoint('https://maps.apple.com/?ll=38.3452,-0.4815&q=Ayuntamiento'), {
    lat: 38.3452,
    lon: -0.4815,
    label: 'Ayuntamiento',
  });
  assert.deepEqual(
    parseSharedPoint('https://maps.apple.com/place?place-id=I123&coordinate=40.4152%2C-3.6844&name=Retiro'),
    { lat: 40.4152, lon: -3.6844, label: 'Retiro' },
  );
  assert.deepEqual(parseSharedPoint('https://maps.apple.com/?daddr=39.4756,-0.3229'), {
    lat: 39.4756,
    lon: -0.3229,
    label: null,
  });
});

test('el texto que comparte Android trae el nombre en la primera línea', () => {
  const shared = 'Playa de la Malvarrosa\nhttps://maps.app.goo.gl/AbCdEf123';
  // Sin resolver el enlace corto no hay coordenadas…
  assert.equal(parseSharedPoint(shared), null);
  // …pero el nombre ya se puede leer, y el enlace se puede seguir.
  assert.equal(parseSharedLabel(shared), 'Playa de la Malvarrosa');
  assert.equal(firstUrl(shared), 'https://maps.app.goo.gl/AbCdEf123');
});

test('enlaces geo: y coordenadas pegadas a mano', () => {
  assert.deepEqual(parseSharedPoint('geo:39.4756,-0.3229'), {
    lat: 39.4756,
    lon: -0.3229,
    label: null,
  });
  // Android manda a veces geo:0,0 con el sitio de verdad en la consulta.
  assert.deepEqual(parseSharedPoint('geo:0,0?q=39.4756,-0.3229'), {
    lat: 39.4756,
    lon: -0.3229,
    label: null,
  });
  assert.deepEqual(parseSharedPoint('39.4756, -0.3229'), {
    lat: 39.4756,
    lon: -0.3229,
    label: null,
  });
});

test('lo que no es un sitio no se convierte en uno', () => {
  assert.equal(parseSharedPoint(''), null);
  assert.equal(parseSharedPoint('mira esto que gracioso'), null);
  assert.equal(parseSharedPoint('https://www.google.com/maps'), null);
  // El golfo de Guinea es lo que sale cuando el enlace no lleva coordenadas.
  assert.equal(parseSharedPoint('geo:0,0'), null);
  // Coordenadas imposibles.
  assert.equal(parseSharedPoint('https://maps.apple.com/?ll=200,-0.32'), null);
});

test('un nombre que son coordenadas no es un nombre', () => {
  assert.equal(parseSharedLabel('https://maps.google.com/?q=38.3452,-0.4815'), null);
  assert.equal(parseSharedLabel('39.4756, -0.3229'), null);
});
