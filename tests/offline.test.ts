/**
 * Modo sin cobertura: geometría, mapa de altura libre y búsqueda de punto
 * volable. Puro, sin red — es justo lo que permite que funcione sin datos
 * móviles, así que tiene que poder comprobarse igual de aislado.
 *
 *   npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bboxContains, boxAround, interpolateElevation, pointInRings } from '../src/offline/geometry';
import { computeCoverageGrid } from '../src/offline/coverage';
import { findNearestFlyable } from '../src/offline/nearest';
import type { OfflinePack } from '../src/offline/model';

test('punto en polígono', async (t) => {
  const cuadrado = [[[-1, 40], [-1, 41], [0, 41], [0, 40], [-1, 40]]];

  await t.test('dentro', () => {
    assert.equal(pointInRings(40.5, -0.5, cuadrado), true);
  });

  await t.test('fuera', () => {
    assert.equal(pointInRings(42, -0.5, cuadrado), false);
  });
});

test('elevación interpolada de una rejilla', async (t) => {
  const grid = { lat0: 40, lon0: -1, dLat: 0.01, dLon: 0.01, rows: 2, cols: 2, values: [100, 200, 300, 400] };

  await t.test('cae en el centro de la rejilla', () => {
    const centro = interpolateElevation(grid, 40.005, -0.995);
    assert.ok(centro !== null && Math.abs(centro - 250) < 0.001);
  });

  await t.test('fuera de la rejilla no se inventa elevación', () => {
    assert.equal(interpolateElevation(grid, 45, -1), null);
  });
});

test('caja de descarga alrededor de un centro', () => {
  const caja = boxAround(40.4168, -3.7038, 25);
  assert.equal(bboxContains(caja, 40.4168, -3.7038), true, 'contiene su propio centro');
  assert.equal(bboxContains(caja, 41.4, -3.7038), false, 'no contiene un punto a 100 km');
});

function packFixture(zoneRings: number[][][], bbox: OfflinePack['bbox'], center: { lat: number; lon: number }, radiusKm: number): OfflinePack {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    center,
    radiusKm,
    bbox,
    label: 'prueba',
    elevation: null,
    zones: [
      {
        layer: 'aero',
        rings: zoneRings,
        attributes: {
          identifier: 'TEST', type: 'REQ_AUTHORIZATION', uom: 'M',
          lower: 0, lowerReference: 'AGL', upper: 900, upperReference: 'AGL', name: 'ZONA PRUEBA',
        },
      },
    ],
  };
}

test('mapa de altura libre con un paquete sintético', () => {
  // Cuadrado de ~2 km con una zona que exige permiso desde 0 m en su mitad este.
  const bbox = { minLat: 40.0, maxLat: 40.02, minLon: -1.02, maxLon: -1.0 };
  const pack = packFixture(
    [[[-1.01, 40.0], [-1.01, 40.02], [-1.0, 40.02], [-1.0, 40.0], [-1.01, 40.0]]],
    bbox,
    { lat: 40.01, lon: -1.01 },
    2,
  );

  const grid = computeCoverageGrid(pack, bbox, 8);
  const oeste = grid.values[3 * grid.cols + 1]; // mitad oeste, fuera de la zona
  const este = grid.values[3 * grid.cols + 6]; // mitad este, dentro

  assert.equal(oeste, 120, 'fuera de la zona se puede subir a 120 m');
  assert.equal(este, 0, 'dentro de la zona la altura libre es cero');
});

test('punto volable más cercano a un objetivo fotográfico', async (t) => {
  // Zona que exige permiso en la mitad este; el objetivo cae dentro de ella.
  const bbox = { minLat: 40.0, maxLat: 40.06, minLon: -1.06, maxLon: -1.0 };
  const pack = packFixture(
    [[[-1.03, 40.0], [-1.03, 40.06], [-1.0, 40.06], [-1.0, 40.0], [-1.03, 40.0]]],
    bbox,
    { lat: 40.03, lon: -1.03 },
    3,
  );

  await t.test('un objetivo dentro de la zona no se marca como volable', () => {
    const dentro = findNearestFlyable(pack, { lat: 40.03, lon: -1.01 }, 120, 3, 48);
    assert.equal(dentro.targetIsFlyable, false);
    assert.notEqual(dentro.best, null);
    assert.equal(dentro.best?.bearing, 'al oeste', 'que es donde acaba la zona');
    const d = dentro.best?.distanceM ?? 0;
    assert.ok(d > 1300 && d < 2200, `distancia coherente con el borde de la zona, fue ${d}`);
  });

  await t.test('un objetivo fuera de la zona sí es volable de partida', () => {
    const fuera = findNearestFlyable(pack, { lat: 40.03, lon: -1.05 }, 120, 3, 48);
    assert.equal(fuera.targetIsFlyable, true);
  });
});
