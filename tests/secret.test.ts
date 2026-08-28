/**
 * El despegue escondido de Ajustes. Lo que se comprueba aquí no es que sea
 * gracioso, es que esté escondido: que no se dispare trasteando y que no se
 * destape a base de toques sueltos separados en el tiempo.
 *
 *   npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_TAPS,
  SECRET_RESET_MS,
  SECRET_TAPS,
  registerTap,
  type TapState,
} from '../src/logic/secret';

/** Da `n` toques separados `gap` ms y devuelve cuántas veces habría despegado. */
function tocar(n: number, gap: number, desde = 10_000): { lanzamientos: number; estado: TapState } {
  let estado = NO_TAPS;
  let lanzamientos = 0;
  for (let i = 0; i < n; i++) {
    const r = registerTap(estado, desde + i * gap);
    estado = r.state;
    if (r.launch) lanzamientos++;
  }
  return { lanzamientos, estado };
}

test('hacen falta siete toques seguidos', async (t) => {
  await t.test('con seis no pasa nada', () => {
    assert.equal(tocar(SECRET_TAPS - 1, 200).lanzamientos, 0);
  });

  await t.test('el séptimo despega', () => {
    assert.equal(tocar(SECRET_TAPS, 200).lanzamientos, 1);
  });
});

test('tocar despacio no lo destapa', () => {
  // Un toque cada tres segundos: por encima de la ventana, la cuenta se reinicia
  // en cada uno y no llega nunca. Es el caso de alguien que entra y sale de
  // Ajustes a lo largo del rato.
  const { lanzamientos } = tocar(40, SECRET_RESET_MS + 500);
  assert.equal(lanzamientos, 0, 'no debería despegar ni una sola vez');
});

test('justo en el límite de la ventana la cuenta sigue viva', () => {
  assert.equal(tocar(SECRET_TAPS, SECRET_RESET_MS).lanzamientos, 1);
});

test('un corte a mitad obliga a empezar de cero', () => {
  let estado = NO_TAPS;
  let t0 = 10_000;
  // Cuatro seguidos...
  for (let i = 0; i < 4; i++) {
    estado = registerTap(estado, t0 + i * 200).state;
  }
  // ...una pausa larga, y otros tres: siete en total, pero no seguidos.
  t0 += 4 * 200 + SECRET_RESET_MS + 1000;
  let lanzamientos = 0;
  for (let i = 0; i < 3; i++) {
    const r = registerTap(estado, t0 + i * 200);
    estado = r.state;
    if (r.launch) lanzamientos++;
  }
  assert.equal(lanzamientos, 0, 'siete toques no seguidos no cuentan');
});

test('encadenar toques no dispara un despegue por toque', () => {
  // Catorce toques seguidos son exactamente dos despegues, no ocho.
  assert.equal(tocar(SECRET_TAPS * 2, 200).lanzamientos, 2);
});
