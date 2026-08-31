import assert from 'node:assert/strict';
import test from 'node:test';

import {
  catalogEntry,
  catalogHint,
  catalogLabel,
  catalogPatch,
  DRONE_CATALOG,
  searchCatalog,
} from '../src/logic/droneCatalog';
import { aircraftFromFleet, impactEnergyJoules } from '../src/logic/earo';
import { emptyDrone } from '../src/logic/fleet';

/**
 * Un catálogo de fichas de aparatos es de esas cosas que envejecen mal y en
 * silencio. Lo que se comprueba aquí no es que los números sean los del
 * fabricante —eso hay que ir a mirarlo— sino que sean coherentes entre sí:
 * un dron marcado C0 que pesara 700 g haría que la app enseñara las reglas
 * equivocadas sin que nadie se enterase.
 */

test('cada modelo tiene identificador único y ficha completa', () => {
  const ids = DRONE_CATALOG.map((e) => e.id);
  assert.deepEqual(ids, [...new Set(ids)], 'hay identificadores repetidos');
  assert.ok(DRONE_CATALOG.length > 0);

  for (const e of DRONE_CATALOG) {
    assert.match(e.id, /^[a-z0-9-]+$/, `${e.id}: el id va en minúsculas y con guiones`);
    assert.ok(e.manufacturer.trim(), `${e.id}: falta el fabricante`);
    assert.ok(e.model.trim(), `${e.id}: falta el modelo`);
    assert.ok(e.source.trim(), `${e.id}: toda ficha dice de dónde sale`);
    assert.ok(e.weightGrams > 0, `${e.id}: el peso no puede ser cero`);
    assert.ok(e.autonomyMin > 0, `${e.id}: la autonomía no puede ser cero`);
    assert.ok(e.frequencies.trim(), `${e.id}: faltan las frecuencias`);
  }
});

test('la clase y el peso no se contradicen', () => {
  for (const e of DRONE_CATALOG) {
    if (e.classMark === 'C0' || e.classMark === '') {
      assert.ok(e.weightGrams < 250, `${e.id}: ${e.classMark || 'legacy'} obliga a menos de 250 g`);
      assert.equal(e.profile, 'sub250', `${e.id}: por debajo de 250 g se vuela en A1`);
    }
    if (e.classMark === 'C1') {
      assert.ok(e.weightGrams < 900, `${e.id}: C1 son menos de 900 g`);
      assert.equal(e.profile, 'c1');
    }
    if (e.classMark === 'C2') {
      assert.ok(e.weightGrams < 4000, `${e.id}: C2 son menos de 4 kg`);
      assert.equal(e.profile, 'c2');
    }
  }
});

test('lo que el fabricante no publica se queda vacío, no se inventa', () => {
  for (const e of DRONE_CATALOG) {
    if (e.characteristicSizeM !== null) {
      assert.ok(e.characteristicSizeM > 0.05 && e.characteristicSizeM < 3, `${e.id}: dimensión rara`);
    }
    if (e.speedMs !== null) {
      assert.ok(e.speedMs > 0 && e.speedMs <= 30, `${e.id}: velocidad rara`);
    }
  }
  // Al menos uno tiene que estar a null: DJI dejó de publicar la medida con
  // hélices en los modelos nuevos, y taparlo con un número sería mentir.
  assert.ok(DRONE_CATALOG.some((e) => e.characteristicSizeM === null));
});

test('elegir un modelo rellena la ficha sin tocar lo que es tuyo', () => {
  const mini = catalogEntry('dji-mini-2');
  assert.ok(mini);
  const patch = catalogPatch(mini!);

  assert.equal(patch.manufacturer, 'DJI');
  assert.equal(patch.model, 'Mini 2');
  assert.equal(patch.weightGrams, 249);
  assert.equal(patch.profile, 'sub250');
  assert.equal(patch.autonomy, '31 min');
  assert.ok(patch.frequencies.includes('2,400'));

  // Ni el alias, ni el número de serie, ni las notas salen del catálogo.
  assert.ok(!('alias' in patch));
  assert.ok(!('serial' in patch));
  assert.ok(!('notes' in patch));
});

test('un dron elegido del catálogo llega a la EARO con todo lo que la plantilla pide', () => {
  const mano = { ...emptyDrone(), manufacturer: 'DJI', model: 'Mini 2', weightGrams: 249 };
  const aMano = aircraftFromFleet(mano);
  assert.equal(aMano.characteristicSizeM, null, 'metido a mano, nadie sabe la dimensión');
  assert.equal(aMano.speedMs, null);

  const delCatalogo = { ...mano, catalogId: 'dji-mini-2', autonomy: '' };
  const a = aircraftFromFleet(delCatalogo);
  assert.equal(a.characteristicSizeM, 0.289);
  assert.equal(a.speedMs, 16);
  assert.equal(a.autonomyMin, 31, 'si no la has escrito, la pone el catálogo');
  assert.equal(a.configuration, 'MULTIRROTOR');
  assert.equal(impactEnergyJoules(a.mtomKg, a.speedMs), 32);
});

test('lo que hayas escrito tú manda sobre el catálogo', () => {
  const drone = {
    ...emptyDrone(),
    catalogId: 'dji-mini-2',
    weightGrams: 260,
    autonomy: 'unos 22 min con viento',
  };
  const a = aircraftFromFleet(drone);
  assert.equal(a.mtomKg, 0.26, 'el peso lo llevas tú, con sus accesorios encima');
  assert.equal(a.autonomyMin, 22);
});

test('un catalogId que ya no existe no rompe nada', () => {
  const a = aircraftFromFleet({ ...emptyDrone(), catalogId: 'dji-modelo-retirado' });
  assert.equal(a.characteristicSizeM, null);
  assert.equal(a.speedMs, null);
  assert.equal(catalogEntry('dji-modelo-retirado'), null);
});

test('la lista se puede buscar y se presenta con lo que decide las reglas', () => {
  assert.equal(searchCatalog('').length, DRONE_CATALOG.length);
  assert.ok(searchCatalog('mini').every((e) => catalogLabel(e).toLowerCase().includes('mini')));
  assert.ok(searchCatalog('MINI 2').length >= 1, 'la búsqueda no distingue mayúsculas');
  assert.deepEqual(searchCatalog('parrot'), []);

  assert.equal(catalogLabel(catalogEntry('dji-air-3')!), 'DJI Air 3');
  assert.equal(catalogHint(catalogEntry('dji-air-3')!), '720 g · C1');
  assert.equal(catalogHint(catalogEntry('dji-mini-2')!), '249 g · sin clase');
});
