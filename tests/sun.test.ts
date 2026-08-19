/**
 * Planificador de luz: posición solar, sombras y horizonte del terreno.
 * Todo se calcula en el móvil (SunCalc, algoritmos de Meeus) — sin red.
 *
 *   npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lightKind, shadowAzimuth, shadowRatio, sunDay, sunPosition } from '../src/logic/sun';
import { horizonAt } from '../src/api/horizon';

const lat = 40.9605;
const lon = -5.679;

test('posición solar en Salamanca, 18 de agosto de 2026', async (t) => {
  const dia = sunDay(new Date('2026-08-18T12:00:00Z'), lat, lon);

  await t.test('al mediodía solar el sol está justo al sur', () => {
    const noon = sunPosition(dia.solarNoon!, lat, lon);
    assert.ok(Math.abs(noon.azimuth - 180) < 0.5, `azimut fue ${noon.azimuth.toFixed(1)}°`);
  });

  await t.test('el sol sale por el este y se pone por el oeste', () => {
    assert.ok(dia.sunriseAzimuth! < 110);
    assert.ok(dia.sunsetAzimuth! > 250);
  });

  await t.test('la hora dorada de la tarde acaba en el ocaso', () => {
    assert.ok(dia.goldenEveningStart! < dia.sunset!);
    assert.ok(dia.sunset! < dia.blueEvening[0]!);
  });

  await t.test('la hora azul va después del ocaso y antes del final del crepúsculo', () => {
    assert.ok(dia.blueEvening[0]! < dia.blueEvening[1]!);
  });
});

test('sombras', () => {
  assert.ok(Math.abs((shadowRatio(45) ?? 0) - 1) < 0.001, 'a 45° la sombra mide lo mismo que el objeto');
  assert.equal(shadowRatio(0), null, 'con el sol en el horizonte no hay sombra que medir');
  assert.equal(shadowAzimuth(90), 270, 'la sombra cae al contrario que el sol');
});

test('tipo de luz según la altura del sol', () => {
  assert.equal(lightKind(3), 'dorada');
  assert.equal(lightKind(-5), 'azul');
  assert.equal(lightKind(-20), 'noche');
});

test('el horizonte del terreno se interpola entre azimuts medidos', () => {
  const perfil = {
    byAzimuth: [
      { azimuth: 270, angle: 0, distanceKm: 1 },
      { azimuth: 280, angle: 10, distanceKm: 1 },
    ],
    originElevation: 700,
    maxDistanceKm: 20,
  };
  assert.ok(Math.abs(horizonAt(perfil, 280) - 10) < 0.01, 'en el azimut medido devuelve su ángulo');
  const medio = horizonAt(perfil, 275);
  assert.ok(medio > 3 && medio < 7, `a mitad de camino interpola, fue ${medio.toFixed(1)}°`);
});
