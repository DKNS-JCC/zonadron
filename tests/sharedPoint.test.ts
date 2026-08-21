import assert from 'node:assert/strict';
import test from 'node:test';

import {
  firstUrl,
  parseLabelFromHtml,
  parsePointFromHtml,
  parseSharedLabel,
  parseSharedPoint,
} from '../src/logic/sharedPoint';

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

test('Google: la chincheta suelta llega como coordenadas en la ruta', () => {
  // Compartir un punto sin ficha de sitio acaba en /maps/search/lat,+lon.
  assert.deepEqual(parseSharedPoint('https://www.google.com/maps/search/38.3452,+-0.4815'), {
    lat: 38.3452,
    lon: -0.4815,
    label: null,
  });
  assert.deepEqual(parseSharedPoint('https://www.google.com/maps/search/38.3452,-0.4815'), {
    lat: 38.3452,
    lon: -0.4815,
    label: null,
  });
  assert.deepEqual(parseSharedPoint('https://www.google.com/maps/place/38.3452,-0.4815'), {
    lat: 38.3452,
    lon: -0.4815,
    label: null,
  });
});

test('una URL codificada se entiende igual que sin codificar', () => {
  assert.deepEqual(parseSharedPoint('https://www.google.com/maps/search/38.3452%2C-0.4815'), {
    lat: 38.3452,
    lon: -0.4815,
    label: null,
  });
  assert.deepEqual(
    parseSharedPoint('https://www.google.com/maps/place/Bar/data=!4m2!3m1!8m2!3d38.3452!4d-0.4815'),
    { lat: 38.3452, lon: -0.4815, label: 'Bar' },
  );
});

test('cuando la URL no trae el sitio, se saca de la página', () => {
  // 1. La miniatura del mapa es el sitio de la ficha.
  const conMiniatura =
    '<meta property="og:title" content="Playa de la Malvarrosa - Google Maps">' +
    '<meta property="og:image" content="https://maps.google.com/maps/api/staticmap?' +
    'center=39.4756%2C-0.3229&amp;zoom=17&amp;size=900x900">';
  assert.deepEqual(parsePointFromHtml(conMiniatura), {
    lat: 39.4756,
    lon: -0.3229,
    label: 'Playa de la Malvarrosa',
  });

  // 2. Sin miniatura, la chincheta de los datos de la página.
  assert.deepEqual(
    parsePointFromHtml('<title>Sitio</title> ...!3d38.3452!4d-0.4815!16s...'),
    { lat: 38.3452, lon: -0.4815, label: 'Sitio' },
  );

  // 3. El estado inicial trae la longitud antes que la latitud, y es el
  //    encuadre: sale marcado como aproximado para que se avise.
  assert.deepEqual(
    parsePointFromHtml('window.APP_INITIALIZATION_STATE=[[[17.1,-0.4815,38.3452],null,null]'),
    { lat: 38.3452, lon: -0.4815, label: null, approximate: true },
  );

  // Una miniatura sin ficha detrás es el mapa genérico: aproximado, no el sitio.
  assert.deepEqual(
    parsePointFromHtml('<title> Google Maps </title>?center=40.9731072%2C-5.6590336&zoom=11'),
    { lat: 40.9731072, lon: -5.6590336, label: null, approximate: true },
  );

  assert.equal(parsePointFromHtml(''), null);
  assert.equal(parsePointFromHtml('<title>Google Maps</title>'), null);
});

test('el nombre de la página se limpia de la coletilla de Google', () => {
  assert.equal(
    parseLabelFromHtml('<meta property="og:title" content="Faro de Santa Pola - Google Maps">'),
    'Faro de Santa Pola',
  );
  assert.equal(parseLabelFromHtml('<title>Faro de Santa Pola - Google Maps</title>'), 'Faro de Santa Pola');
  // Un nombre que son coordenadas no es un nombre.
  assert.equal(parseLabelFromHtml('<title>38.3452, -0.4815 - Google Maps</title>'), null);
});
