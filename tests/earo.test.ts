import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { canFillDocx, openDocx, readZip, saveDocx, setParagraphText, paragraphText } from '../src/logic/docx';
import {
  aircraftFromFleet,
  checkTemplate,
  defaultComms,
  defaultConOps,
  fillEaro,
  impactEnergyJoules,
  missingEaroFields,
  suggestedMitigations,
  type EaroAircraft,
  type EaroContext,
} from '../src/logic/earo';
import { emptyDrone } from '../src/logic/fleet';
import type { OperatorProfile } from '../src/state/SettingsContext';

/**
 * Esto no prueba un `.docx` de laboratorio: abre la plantilla oficial que
 * viaja con la app, la rellena y vuelve a leer el resultado para comprobar que
 * cada dato ha caído en su casilla. Si ENAIRE cambia la plantilla y alguien
 * ejecuta `npm run vendor:earo`, estas comprobaciones son las que avisan.
 */

const PLANTILLA = new Uint8Array(readFileSync('assets/earo-abierta.docx'));

const OPERADOR: OperatorProfile = {
  name: 'JORGE CUADRADO CRIADO',
  uasNumber: 'ESPy65pw1ksjyrcu',
  email: 'jorge@example.com',
  phone: '+34 665 148 956',
  // Migrados a la flota; se conservan vacíos para leer perfiles antiguos.
  droneModel: '',
  droneSerial: '',
};

const MINI2: EaroAircraft = {
  droneId: 'd1',
  manufacturer: 'SZ DJI Technology Co., Ltd.',
  model: 'DJI Mini 2',
  configuration: 'MULTIRROTOR',
  classMark: 'Sin marcado de clase (aeronave «legacy» < 250 g)',
  mtomKg: 0.249,
  characteristicSizeM: 0.289,
  speedMs: 16,
  autonomyMin: 31,
};

function contexto(over: Partial<EaroContext> = {}): EaroContext {
  const conops = defaultConOps('sub250');
  const comms = { ...defaultComms(OPERADOR), arcid: 'JCCUAS1', callsign: 'JCCUAS01' };
  return {
    operator: OPERADOR,
    droneProfile: 'sub250',
    aircraft: [MINI2],
    atspName: 'Base Aérea de Salamanca/Matacán',
    atspContact: 'ctamatacan@ea.mde.es / +34 923 129 500',
    scope: [
      { label: 'ZGUAS de aeródromo LESA0', note: 'Artículo 41 del RD 517/2024. SFC – 900 m AGL.' },
      { label: 'ATZ SALAMANCA', note: 'Círculo de 8 km centrado en el ARP.' },
    ],
    conops,
    comms,
    mitigations: suggestedMitigations(conops, comms),
    signPlace: 'Salamanca',
    ...over,
  };
}

function rellenar(ctx: EaroContext) {
  const { entries, doc } = openDocx(PLANTILLA);
  fillEaro(doc, ctx);
  const bytes = saveDocx(entries, doc);
  return { bytes, leido: openDocx(bytes).doc };
}

test('la plantilla empaquetada se puede abrir sin descomprimir nada', () => {
  assert.ok(canFillDocx(PLANTILLA), 'las entradas tienen que venir sin comprimir');
  const entradas = readZip(PLANTILLA);
  assert.equal(entradas.length, 46);
  assert.ok(entradas.some((e) => e.name === 'word/document.xml'));
});

test('la plantilla es la que espera el mapeo de casillas', () => {
  const { doc } = openDocx(PLANTILLA);
  assert.ok(checkTemplate(doc), 'si esto falla, ENAIRE ha movido la plantilla');
});

test('el documento generado sigue siendo un ZIP legible y completo', () => {
  const { bytes } = rellenar(contexto());
  assert.ok(canFillDocx(bytes));
  assert.equal(readZip(bytes).length, 46);
});

test('los datos del operador y del gestor caen en su casilla', () => {
  const { leido } = rellenar(contexto());
  assert.equal(leido.cellText(0, 0, 1), 'ESPy65pw1ksjyrcu');
  assert.equal(leido.cellText(0, 1, 1), 'JORGE CUADRADO CRIADO');
  assert.equal(leido.cellText(0, 3, 1), '+34 665 148 956');
  // La plantilla viene con ENAIRE puesto, y aquí se firma con Defensa.
  assert.equal(leido.cellText(1, 0, 1), 'Base Aérea de Salamanca/Matacán');
  assert.match(leido.cellText(1, 1, 1), /ctamatacan@ea\.mde\.es/);
});

test('el ConOps refleja lo elegido y no lo que traía la plantilla', () => {
  const { leido } = rellenar(contexto());
  assert.match(leido.cellText(2, 0, 0), /CATEGORÍA ABIERTA\s+SUBCATEGORÍA A1/);
  assert.equal(leido.cellText(2, 2, 0), 'DIURNO');
  assert.match(leido.cellText(2, 6, 0), /ALTURA MÁXIMA 120 m AGL/);
  assert.match(leido.cellText(2, 4, 0), /^DENTRO DE LAS ZONAS/);
});

test('la energía de impacto sale de la masa y la velocidad', () => {
  // ½ · 0,249 kg · (16 m/s)² = 31,9 J
  assert.equal(impactEnergyJoules(0.249, 16), 32);
  assert.equal(impactEnergyJoules(0.9, 19), 162);
  assert.equal(impactEnergyJoules(null, 16), null);
  assert.equal(impactEnergyJoules(0.249, null), null);

  const { leido } = rellenar(contexto());
  assert.equal(leido.cellText(6, 1, 4), '0,249');
  assert.equal(leido.cellText(6, 1, 5), '0,289');
  assert.equal(leido.cellText(6, 1, 6), '16');
  assert.equal(leido.cellText(6, 1, 7), '32');
  assert.equal(leido.cellText(6, 1, 8), '31');
});

test('sobran las filas de ejemplo de las aeronaves', () => {
  const una = rellenar(contexto()).leido;
  assert.equal(una.rowCount(6), 2, 'cabecera y una aeronave');
  assert.equal(una.rowCount(7), 3, 'dos de cabecera y una aeronave');

  const dos = rellenar(contexto({ aircraft: [MINI2, { ...MINI2, droneId: 'd2', model: 'Air 3' }] }))
    .leido;
  assert.equal(dos.rowCount(6), 3);
  assert.equal(dos.cellText(6, 2, 1), 'SZ DJI Technology Co., Ltd. — Air 3');

  const cuatro = rellenar(
    contexto({
      aircraft: [1, 2, 3, 4].map((n) => ({ ...MINI2, droneId: `d${n}`, model: `Dron ${n}` })),
    }),
  ).leido;
  assert.equal(cuatro.rowCount(6), 5);
  assert.equal(cuatro.cellText(6, 4, 1), 'SZ DJI Technology Co., Ltd. — Dron 4');
});

test('las atenuaciones se escriben todas, una por fila', () => {
  const ctx = contexto();
  const { leido } = rellenar(ctx);
  // Dos de cabecera más una por medida.
  assert.equal(leido.rowCount(8), 2 + ctx.mitigations.length);
  assert.equal(leido.cellText(8, 2, 0), ctx.mitigations[0]);
  assert.equal(leido.cellText(8, 1 + ctx.mitigations.length, 0), ctx.mitigations.at(-1));
  // No debe quedar la fila de relleno de la plantilla.
  for (let f = 2; f < leido.rowCount(8); f++) {
    assert.notEqual(leido.cellText(8, f, 0), 'MAEXX/MATXX');
  }
});

test('las atenuaciones propuestas se ajustan al ConOps', () => {
  const conops = defaultConOps('sub250');
  const comms = defaultComms(OPERADOR);

  const dia = suggestedMitigations(conops, comms);
  assert.ok(!dia.includes('MAE22'), 'la luz verde es de vuelo nocturno');
  assert.ok(!dia.includes('MAT09'), 'eso es de aeronave cautiva');
  assert.ok(!dia.includes('MAE02'), 'sin radio no hace falta radiofonista');
  assert.ok(dia.includes('MAE06') && dia.includes('MAT04'));

  assert.ok(suggestedMitigations({ ...conops, daylight: 'NOCTURNO' }, comms).includes('MAE22'));
  assert.ok(suggestedMitigations({ ...conops, tethered: true }, comms).includes('MAT09'));
  assert.ok(suggestedMitigations({ ...conops, fpv: true }, comms).includes('MAT13'));
  assert.ok(
    suggestedMitigations(conops, { ...comms, hasAirBandRadio: true }).includes('MAE02'),
  );
});

test('el ámbito de aplicación crece con las dependencias afectadas', () => {
  const { leido } = rellenar(contexto());
  assert.equal(leido.rowCount(5), 3, 'cabecera y dos dependencias');
  assert.equal(leido.cellText(5, 1, 0), 'ZGUAS de aeródromo LESA0');
  assert.equal(leido.cellText(5, 2, 0), 'ATZ SALAMANCA');
  assert.match(leido.cellText(4, 0, 0), /Base Aérea de Salamanca\/Matacán/);
});

test('las alternativas del texto se resuelven, no se dejan con la barra', () => {
  const { bytes } = rellenar(contexto());
  const xml = openDocx(bytes).doc.toString();
  assert.ok(!xml.includes('dentro/fuera'), 'quedaba sin decidir si es dentro o fuera');
  assert.ok(xml.includes('Serán operaciones diurnas.'));
  assert.ok(xml.includes('La operación no se realizará con sistema FPV.'));
  assert.ok(!xml.includes('La operación podrá realizarse con sistema FPV'));
});

test('la ficha del dron rellena lo que puede y deja el resto en blanco', () => {
  const drone = { ...emptyDrone(), manufacturer: 'DJI', model: 'Mini 2', weightGrams: 249, autonomy: 'unos 31 min' };
  const a = aircraftFromFleet(drone);
  assert.equal(a.mtomKg, 0.249);
  assert.equal(a.autonomyMin, 31);
  assert.equal(a.characteristicSizeM, null, 'la ficha del dron no guarda esto');
  assert.equal(a.speedMs, null);
  assert.match(a.classMark, /legacy/);
});

test('se dice lo que falta antes de generar nada', () => {
  assert.deepEqual(missingEaroFields(contexto()), []);

  const faltan = missingEaroFields(
    contexto({ aircraft: [{ ...MINI2, speedMs: null, characteristicSizeM: null }] }),
  );
  assert.deepEqual(faltan, ['la dimensión característica', 'la velocidad máxima']);

  const sinGestor = missingEaroFields(contexto({ atspName: '' }));
  assert.ok(sinGestor.includes('con quién se firma'));
});

test('un párrafo vacío admite texto, y uno partido en trozos no se duplica', () => {
  const vacio = '<w:p><w:pPr><w:rPr><w:b/></w:rPr></w:pPr></w:p>';
  assert.equal(paragraphText(setParagraphText(vacio, 'hola')), 'hola');

  const partido =
    '<w:p><w:r><w:t>Cate</w:t></w:r><w:r><w:t>goría</w:t></w:r><w:r><w:t> abierta</w:t></w:r></w:p>';
  assert.equal(paragraphText(partido), 'Categoría abierta');
  assert.equal(paragraphText(setParagraphText(partido, 'Nuevo')), 'Nuevo');
});

test('los caracteres que rompen el XML se escapan', () => {
  const { leido } = rellenar(
    contexto({ scope: [{ label: 'Zona A & B', note: 'Altura < 120 m' }] }),
  );
  assert.equal(leido.cellText(5, 1, 0), 'Zona A & B');
  assert.equal(leido.cellText(5, 1, 1), 'Altura < 120 m');
});
