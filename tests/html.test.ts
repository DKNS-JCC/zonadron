/**
 * Limpieza del HTML oficial de ENAIRE a texto legible. Sin red.
 *
 *   npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText } from '../src/logic/html';

test('limpieza de HTML no deja marcado ni entidades', () => {
  const muestra =
    '<b>Zona</b><p>Texto con <font color="#dc143c">color</font> y <elem>etiqueta propia</elem>.</p><br/>Fin&nbsp;&amp; ya';
  const limpio = htmlToText(muestra);
  assert.ok(!/[<>]/.test(limpio), `quedó marcado sin limpiar: ${JSON.stringify(limpio)}`);
  assert.ok(!limpio.includes('&nbsp;'), `quedó una entidad sin decodificar: ${JSON.stringify(limpio)}`);
});
