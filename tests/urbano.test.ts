import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyUrban, parseCatastro, parseSiose } from '../src/api/urbano';

/**
 * El cruce de Catastro y SIOSE es lo único de esta función que es criterio
 * nuestro, así que es lo que hay que poder comprobar sin red. Los casos son
 * respuestas reales de los dos servicios en puntos conocidos.
 */

test('el Catastro distingue parcela urbana de rústica por la dirección', () => {
  const urbana = parseCatastro('<consulta><coord><ldt>PZ AJUNTAMENT 1 ALICANTE/ALACANT (ALICANTE)</ldt></coord></consulta>');
  assert.equal(urbana.kind, 'urbana');
  assert.equal(urbana.direccion, 'PZ AJUNTAMENT 1 ALICANTE/ALACANT (ALICANTE)');

  const rustica = parseCatastro('<consulta><ldt>Polígono 27 Parcela 2 EL CASTAÑAR. MAZARAMBROZ (TOLEDO)</ldt></consulta>');
  assert.equal(rustica.kind, 'rustica');

  // Sobre una calle, una playa o el mar no hay parcela que devolver.
  assert.equal(parseCatastro('<consulta><control><cuerr>1</cuerr></control></consulta>').kind, 'sin-parcela');
  // Y sin respuesta no se puede afirmar nada.
  assert.equal(parseCatastro(null).kind, 'sin-servicio');
});

test('SIOSE se lee del GeoJSON del servicio del IGN', () => {
  const body = JSON.stringify({
    features: [{ properties: { codiige: 111, codiige_valor: 'Casco' } }],
  });
  assert.deepEqual(parseSiose(body), { code: 111, label: 'Casco' });

  // Mar abierto: responde bien, pero sin polígono.
  assert.deepEqual(parseSiose(JSON.stringify({ features: [] })), { code: null, label: null });
  assert.deepEqual(parseSiose('esto no es json'), { code: null, label: null });
  assert.deepEqual(parseSiose(null), { code: null, label: null });
});

test('las dos fuentes de acuerdo dan entorno urbano', () => {
  assert.deepEqual(classifyUrban({ catastro: 'urbana', siose: 111, around: [] }), {
    level: 'urbano',
    supuesto: 'a',
    surrounded: false,
  });
  // Suelo construido que no es casco: el supuesto b).
  assert.deepEqual(classifyUrban({ catastro: 'urbana', siose: 140, around: [] }), {
    level: 'urbano',
    supuesto: 'b',
    surrounded: false,
  });
});

test('una zona verde urbana es el supuesto c) aunque el Catastro calle', () => {
  assert.deepEqual(classifyUrban({ catastro: 'sin-parcela', siose: 114, around: [] }), {
    level: 'parque',
    supuesto: 'c',
    surrounded: false,
  });
  assert.deepEqual(classifyUrban({ catastro: 'rustica', siose: 114, around: [] }), {
    level: 'parque',
    supuesto: 'c',
    surrounded: false,
  });
});

test('una zona verde con parcela urbana es ciudad, no un parque a las afueras', () => {
  // La plaza del ayuntamiento de Alicante sale como "zona verde urbana" en
  // SIOSE. Decir que estás en una zona verde ahí despista: estás en el centro.
  assert.deepEqual(classifyUrban({ catastro: 'urbana', siose: 114, around: [] }), {
    level: 'urbano',
    supuesto: 'c',
    surrounded: false,
  });
});

test('una sola fuente no pasa de "probable"', () => {
  // Casa suelta en el campo: parcela urbana rodeada de cultivo.
  assert.deepEqual(classifyUrban({ catastro: 'urbana', siose: 210, around: [210, 240] }), {
    level: 'probable',
    supuesto: null,
    surrounded: false,
  });
  // Urbanización nueva: el suelo la ve, el catastro todavía no la ubica.
  assert.deepEqual(classifyUrban({ catastro: 'sin-parcela', siose: 121, around: [] }), {
    level: 'probable',
    supuesto: 'b',
    surrounded: false,
  });
  // Y al revés: SIOSE dice casco pero la parcela figura rústica.
  assert.deepEqual(classifyUrban({ catastro: 'rustica', siose: 112, around: [] }), {
    level: 'probable',
    supuesto: 'a',
    surrounded: false,
  });
});

test('en una calle del casco manda la ocupación del suelo', () => {
  // Pisas asfalto, así que no hay parcela, pero estás en mitad de la ciudad.
  assert.deepEqual(classifyUrban({ catastro: 'sin-parcela', siose: 112, around: [] }), {
    level: 'urbano',
    supuesto: 'a',
    surrounded: false,
  });
});

test('el campo se detecta como no urbano', () => {
  assert.deepEqual(classifyUrban({ catastro: 'rustica', siose: 210, around: [240, 210] }), {
    level: 'no-detectado',
    supuesto: null,
    surrounded: false,
  });
  assert.deepEqual(classifyUrban({ catastro: 'rustica', siose: 311, around: [311] }), {
    level: 'no-detectado',
    supuesto: null,
    surrounded: false,
  });
});

test('una infraestructura suelta no convierte el campo en ciudad', () => {
  // Una autovía o una vía férrea son suelo artificial, pero no entorno urbano:
  // sus restricciones son las del art. 39, que ya vienen de ENAIRE.
  assert.deepEqual(classifyUrban({ catastro: 'rustica', siose: 161, around: [312, 161] }), {
    level: 'no-detectado',
    supuesto: null,
    surrounded: false,
  });
  // La pista de Barajas tiene dirección de calle en el Catastro; sin esta
  // regla la app declararía entorno urbano un aeropuerto.
  assert.deepEqual(classifyUrban({ catastro: 'urbana', siose: 163, around: [163, 163, 163, 163] }), {
    level: 'probable',
    supuesto: null,
    surrounded: false,
  });
});

test('si no responde nadie, no se inventa una respuesta', () => {
  assert.deepEqual(classifyUrban({ catastro: 'sin-servicio', siose: null, around: [] }), {
    level: 'sin-datos',
    supuesto: null,
    surrounded: false,
  });
  // El mar: el catastro no responde y no hay polígono de ocupación.
  assert.deepEqual(classifyUrban({ catastro: 'sin-parcela', siose: null, around: [] }), {
    level: 'no-detectado',
    supuesto: null,
    surrounded: false,
  });
});

test('una avenida en mitad de la ciudad es entorno urbano', () => {
  // Avenida de Portugal, Salamanca: el suelo bajo los pies es "red viaria" y
  // sin mirar alrededor la app decía que no había detectado nada.
  assert.deepEqual(
    classifyUrban({
      catastro: 'urbana',
      siose: 161,
      around: [161, 112, 112, 112, 112, 161, 112, 112],
    }),
    { level: 'urbano', supuesto: 'a', surrounded: true },
  );
});

test('una plaza dotacional rodeada de casco también', () => {
  // Plaza Mayor de Salamanca: sin parcela catastral y suelo "dotacional".
  assert.deepEqual(
    classifyUrban({
      catastro: 'sin-parcela',
      siose: 140,
      around: [111, 113, 113, 111, 111, 111, 113, 161],
    }),
    { level: 'urbano', supuesto: 'a', surrounded: false },
  );
});

test('una franja verde dentro de la ciudad no es un parque a las afueras', () => {
  // Avenida de Portugal (Salesas): zona verde urbana rodeada de ensanche.
  assert.deepEqual(
    classifyUrban({
      catastro: 'sin-parcela',
      siose: 114,
      around: [140, 140, 112, 161, 112, 161, 112, 112],
    }),
    { level: 'urbano', supuesto: 'c', surrounded: true },
  );
});

test('un edificio suelto junto a una carretera no hace ciudad', () => {
  // Hace falta más de un polígono urbano, y al menos la mitad de la muestra.
  assert.deepEqual(
    classifyUrban({ catastro: 'rustica', siose: 210, around: [210, 240, 111, 312] }),
    { level: 'no-detectado', supuesto: null, surrounded: false },
  );
});

test('la pista de un aeropuerto sigue sin ser un entorno urbano', () => {
  // Barajas: dirección de calle en el Catastro, pero alrededor sólo aeropuerto.
  assert.deepEqual(
    classifyUrban({ catastro: 'urbana', siose: 163, around: [163, 163, 163, 163] }),
    { level: 'probable', supuesto: null, surrounded: false },
  );
});
