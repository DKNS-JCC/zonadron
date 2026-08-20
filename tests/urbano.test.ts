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
  assert.deepEqual(classifyUrban({ catastro: 'urbana', siose: 111 }), {
    level: 'urbano',
    supuesto: 'a',
  });
  // Suelo construido que no es casco: el supuesto b).
  assert.deepEqual(classifyUrban({ catastro: 'urbana', siose: 140 }), {
    level: 'urbano',
    supuesto: 'b',
  });
});

test('una zona verde urbana es el supuesto c) aunque el Catastro calle', () => {
  assert.deepEqual(classifyUrban({ catastro: 'sin-parcela', siose: 114 }), {
    level: 'parque',
    supuesto: 'c',
  });
  assert.deepEqual(classifyUrban({ catastro: 'rustica', siose: 114 }), {
    level: 'parque',
    supuesto: 'c',
  });
});

test('una zona verde con parcela urbana es ciudad, no un parque a las afueras', () => {
  // La plaza del ayuntamiento de Alicante sale como "zona verde urbana" en
  // SIOSE. Decir que estás en una zona verde ahí despista: estás en el centro.
  assert.deepEqual(classifyUrban({ catastro: 'urbana', siose: 114 }), {
    level: 'urbano',
    supuesto: 'c',
  });
});

test('una sola fuente no pasa de "probable"', () => {
  // Casa suelta en el campo: parcela urbana rodeada de cultivo.
  assert.deepEqual(classifyUrban({ catastro: 'urbana', siose: 210 }), {
    level: 'probable',
    supuesto: null,
  });
  // Urbanización nueva: el suelo la ve, el catastro todavía no la ubica.
  assert.deepEqual(classifyUrban({ catastro: 'sin-parcela', siose: 121 }), {
    level: 'probable',
    supuesto: 'b',
  });
  // Y al revés: SIOSE dice casco pero la parcela figura rústica.
  assert.deepEqual(classifyUrban({ catastro: 'rustica', siose: 112 }), {
    level: 'probable',
    supuesto: 'a',
  });
});

test('en una calle del casco manda la ocupación del suelo', () => {
  // Pisas asfalto, así que no hay parcela, pero estás en mitad de la ciudad.
  assert.deepEqual(classifyUrban({ catastro: 'sin-parcela', siose: 112 }), {
    level: 'urbano',
    supuesto: 'a',
  });
});

test('el campo se detecta como no urbano', () => {
  assert.deepEqual(classifyUrban({ catastro: 'rustica', siose: 210 }), {
    level: 'no-detectado',
    supuesto: null,
  });
  assert.deepEqual(classifyUrban({ catastro: 'rustica', siose: 311 }), {
    level: 'no-detectado',
    supuesto: null,
  });
});

test('una infraestructura suelta no convierte el campo en ciudad', () => {
  // Una autovía o una vía férrea son suelo artificial, pero no entorno urbano:
  // sus restricciones son las del art. 39, que ya vienen de ENAIRE.
  assert.deepEqual(classifyUrban({ catastro: 'rustica', siose: 161 }), {
    level: 'no-detectado',
    supuesto: null,
  });
  // La pista de Barajas tiene dirección de calle en el Catastro; sin esta
  // regla la app declararía entorno urbano un aeropuerto.
  assert.deepEqual(classifyUrban({ catastro: 'urbana', siose: 163 }), {
    level: 'probable',
    supuesto: null,
  });
});

test('si no responde nadie, no se inventa una respuesta', () => {
  assert.deepEqual(classifyUrban({ catastro: 'sin-servicio', siose: null }), {
    level: 'sin-datos',
    supuesto: null,
  });
  // El mar: el catastro no responde y no hay polígono de ocupación.
  assert.deepEqual(classifyUrban({ catastro: 'sin-parcela', siose: null }), {
    level: 'no-detectado',
    supuesto: null,
  });
});
