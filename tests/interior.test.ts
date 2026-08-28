/**
 * Comunicación al Ministerio del Interior.
 *
 * Lo que se comprueba aquí no es cosmético: este módulo produce un documento
 * dirigido a la Administración. Un campo mal colocado no da error en ninguna
 * parte, simplemente sale mal impreso.
 *
 *   npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import {
  ACTIVITIES,
  FIELDS,
  MIN_NOTICE_DAYS,
  PROVINCES,
  buildInteriorFields,
  durationLabel,
  emptyOperation,
  matchProvince,
  missingInteriorFields,
  noticeDays,
  toDms,
  type InteriorContext,
  type PilotProfile,
} from '../src/logic/interior';
import { listFields } from '../src/logic/pdfForm';
import { emptyDrone } from '../src/logic/fleet';
import type { QueryResult } from '../src/types';

const PLANTILLA = 'Formato-Solicitud-Comunicacion.pdf';

test('coordenadas en DMS, que es lo que pide el impreso', async (t) => {
  await t.test('el punto de Salamanca', () => {
    // 40°56\'53.8"N 005°38\'02.9"W
    assert.equal(toDms(40.948283, -5.634151), `40º56'53.8"N 005º38'02.9"W`);
  });

  await t.test('los grados de longitud llevan tres dígitos', () => {
    assert.match(toDms(40, -3), /\s003º/);
  });

  await t.test('hemisferios sur y este', () => {
    const dms = toDms(-33.45, 151.2);
    assert.ok(dms.includes('S'), dms);
    assert.ok(dms.includes('E'), dms);
  });
});

test('provincias: se traducen a como las escribe el desplegable', async (t) => {
  await t.test('artículo delante o detrás da igual', () => {
    assert.equal(matchProvince('A Coruña'), 'Coruña, A');
    assert.equal(matchProvince('Illes Balears'), 'Balears, Illes');
    assert.equal(matchProvince('Las Palmas'), 'Palmas, Las');
    assert.equal(matchProvince('La Rioja'), 'Rioja, La');
  });

  await t.test('acentos y mayúsculas tampoco importan', () => {
    assert.equal(matchProvince('avila'), 'Ávila');
    assert.equal(matchProvince('ALMERIA'), 'Almería');
  });

  await t.test('lo que no es una provincia no se inventa', () => {
    assert.equal(matchProvince('Ávalon'), null);
    assert.equal(matchProvince(''), null);
    assert.equal(matchProvince(null), null);
  });

  await t.test('están las 52', () => {
    assert.equal(PROVINCES.length, 52);
  });
});

test('antelación mínima de cinco días naturales', async (t) => {
  const hoy = new Date(2026, 7, 24, 13, 0, 0);

  await t.test('cuenta días de calendario, no horas', () => {
    // A las 13:00 de hoy, un vuelo el día 29 son 5 días aunque falten 4,5×24 h.
    assert.equal(noticeDays('2026-08-29', hoy), 5);
    assert.ok(noticeDays('2026-08-29', hoy)! >= MIN_NOTICE_DAYS);
  });

  await t.test('mañana no llega', () => {
    assert.equal(noticeDays('2026-08-25', hoy), 1);
  });

  await t.test('una fecha ilegible no se cuela como válida', () => {
    assert.equal(noticeDays('mañana', hoy), null);
    assert.equal(noticeDays('', hoy), null);
  });
});

test('duración a partir de las dos horas', async (t) => {
  await t.test('normal', () => {
    assert.equal(durationLabel('10:00', '12:30'), '2 h 30 min');
    assert.equal(durationLabel('10:00', '11:00'), '1 hora');
    assert.equal(durationLabel('10:00', '10:45'), '45 minutos');
  });

  await t.test('cruzando la medianoche', () => {
    assert.equal(durationLabel('23:30', '00:30'), '1 hora');
  });

  await t.test('horas incompletas no dan una duración inventada', () => {
    assert.equal(durationLabel('10:00', ''), '');
    assert.equal(durationLabel('25:00', '10:00'), '');
  });
});

/* ------------------------------------------------------------------ */

function contexto(): InteriorContext {
  const pilot: PilotProfile = {
    sameAsOperator: true,
    name: '', dni: '', address: '', postalCode: '', municipality: '', province: '',
    competence: 'A1/A3 nº 12345, válido hasta 2030',
    training: 'Autopráctica clase C0 completada',
    insurance: 'Póliza 998877, Mapfre, válida hasta 31/12/2026',
  };

  const result = {
    coords: { lat: 40.948283, lon: -5.634151 },
    terrainElevation: 781,
    terrainSource: 'MDT del IGN (España)',
    flightHeightAgl: 50,
    zones: [],
    verdict: {} as QueryResult['verdict'],
    queriedAt: new Date().toISOString(),
    failedLayers: [],
    notams: null,
  } as unknown as QueryResult;

  return {
    operator: {
      name: 'Ana Pérez Ñíguez',
      uasNumber: 'ESAxxxxxxxxxxxx',
      email: 'ana@ejemplo.es',
      phone: '600123456',
      dni: '12345678Z',
      address: 'Calle Mayor 1',
      postalCode: '37001',
      municipality: 'Salamanca',
      province: 'Salamanca',
      droneModel: '',
      droneSerial: '',
    },
    pilot,
    drone: { ...emptyDrone(), manufacturer: 'DJI', model: 'Mini 4K', serial: 'SN-1', weightGrams: 246 },
    result,
    place: 'Calle Mayor',
    province: 'Salamanca',
    operation: {
      ...emptyOperation(),
      activity: ACTIVITIES[0],
      date: '2026-09-10',
      startTime: '10:00',
      endTime: '11:30',
      radiusM: '100',
    },
    now: new Date(2026, 7, 24, 9, 5, 0),
  };
}

test('relleno del impreso', async (t) => {
  const values = buildInteriorFields(contexto());

  await t.test('los campos con nombre engañoso llevan el dato correcto', () => {
    // Se llama «Correo_electrónico[1]» pero en la hoja es el teléfono.
    assert.equal(values[FIELDS.operadorTelefono], '600123456');
    assert.equal(values[FIELDS.operadorCorreo], 'ana@ejemplo.es');
    // Repite el nombre del campo de formación, pero es la póliza.
    assert.equal(values[FIELDS.seguro], 'Póliza 998877, Mapfre, válida hasta 31/12/2026');
    assert.equal(values[FIELDS.pilotoFormacion], 'Autopráctica clase C0 completada');
  });

  await t.test('«el piloto soy yo» copia los datos del operador', () => {
    assert.equal(values[FIELDS.pilotoNombre], 'Ana Pérez Ñíguez');
    assert.equal(values[FIELDS.pilotoDni], '12345678Z');
  });

  await t.test('el punto consultado rellena la delimitación', () => {
    assert.equal(values[FIELDS.wgs84], `40º56'53.8"N 005º38'02.9"W`);
    assert.equal(values[FIELDS.radio], '100');
    assert.ok(values[FIELDS.alturaPrevista].startsWith('50 m sobre el terreno'));
    assert.ok(values[FIELDS.alturaPrevista].includes('831 m AMSL'), values[FIELDS.alturaPrevista]);
  });

  await t.test('la fecha y la hora de la comunicación van en las cuatro páginas', () => {
    for (const f of [
      FIELDS.comunicacionFecha1, FIELDS.comunicacionFecha2,
      FIELDS.comunicacionFecha3, FIELDS.comunicacionFecha4,
    ]) {
      assert.equal(values[f], '24/08/2026');
    }
    assert.equal(values[FIELDS.comunicacionHora1], '09:05');
  });

  await t.test('la operación se traduce a lenguaje de impreso', () => {
    assert.equal(values[FIELDS.operacionFecha], '10 de septiembre de 2026');
    assert.equal(values[FIELDS.operacionDuracion], '1 h 30 min');
    assert.equal(values[FIELDS.operacionLugar], 'Calle Mayor, Salamanca');
  });

  await t.test('la firma se deja en blanco: no se falsifica una rúbrica', () => {
    assert.equal(values[FIELDS.firma], undefined);
  });
});

test('lo que falta se avisa antes de generar, no después', async (t) => {
  await t.test('un contexto completo no tiene huecos', () => {
    assert.deepEqual(missingInteriorFields(contexto()), []);
  });

  await t.test('sin dron, lo dice', () => {
    const faltan = missingInteriorFields({ ...contexto(), drone: null });
    assert.ok(faltan.some((f) => f.where === 'dron'));
  });

  await t.test('sin DNI del operador, lo dice y sabe dónde se arregla', () => {
    const ctx = contexto();
    const faltan = missingInteriorFields({ ...ctx, operator: { ...ctx.operator, dni: '' } });
    assert.ok(faltan.some((f) => f.where === 'operador' && /DNI/.test(f.label)));
  });
});

/**
 * El que de verdad protege: si el Ministerio cambia la plantilla o alguien se
 * equivoca al copiar un nombre, el impreso saldría con casillas vacías y sin un
 * solo error por ninguna parte. Esto lo convierte en un test rojo.
 */
test('todos los campos existen en la plantilla oficial', { skip: !existsSync(PLANTILLA) }, () => {
  const reales = new Set(listFields(new Uint8Array(readFileSync(PLANTILLA))).map((f) => f.fullName));
  const usados = Object.entries(FIELDS);

  const inexistentes = usados.filter(([, name]) => !reales.has(name)).map(([k]) => k);
  assert.deepEqual(inexistentes, [], `campos que ya no están en la plantilla: ${inexistentes.join(', ')}`);
});
