import assert from 'node:assert/strict';
import test from 'node:test';

import {
  coordinationFor,
  coordinationPriority,
  coordinationsFor,
  extractContacts,
  mailRecipients,
} from '../src/logic/coordination';
import { htmlToText } from '../src/logic/html';
import type { Zone } from '../src/types';

/**
 * Los mensajes de aquí abajo son los que publica ENAIRE de verdad, copiados
 * del servicio tal cual. Es lo que da valor a estas comprobaciones: no prueban
 * que un analizador funcione con un HTML de laboratorio, prueban que acierta
 * con el HTML que se va a encontrar en el campo.
 */

function zone(over: Partial<Zone> & { officialHtml: string }): Zone {
  const html = over.officialHtml;
  return {
    key: 'k',
    layer: 'aero',
    identifier: 'TEST',
    title: 'Zona',
    category: '',
    type: 'REQ_AUTHORIZATION',
    reasons: [],
    advisory: false,
    referenceElevation: null,
    referenceElevationMissing: false,
    lower: 60,
    lowerRef: 'AGL',
    upper: 305,
    upperRef: 'AGL',
    uom: 'M',
    contact: {},
    applicability: {},
    raw: {},
    ...over,
    // Detrás del spread: el texto plano se deriva siempre del HTML que entra,
    // igual que hace `normalizeZone` con lo que devuelve el servicio.
    officialHtml: html,
    officialText: htmlToText(html),
  };
}

const CTR_MADRID = zone({
  identifier: 'LEMD_CT',
  title: 'CTR MADRID',
  category: 'CTR',
  officialHtml:
    'Se encuentra en una zona geográfica de UAS general por razón de la seguridad operacional del espacio aéreo controlado <elem>CTR MADRID.</elem><p> Para cualquier otra operación realice su solicitud a través del contacto indicado. Contacto: <font color="#009fda"><a href=\'https://planea.enaire.es/nsf/login\' target=\'_blank\'> ENAIRE Planea</a></font>.</p><p>Nivel inferior: SFC</p>',
});

const ATZ_VALENCIA = zone({
  identifier: 'LEVC AT',
  title: 'ATZ VALENCIA',
  category: 'ATZ',
  officialHtml:
    'Se encuentra en una zona geográfica de UAS general <elem>ATZ VALENCIA </elem><p> Para cualquier otra operación realice su solicitud a través del contacto indicado. Contacto: Email: <font color="#009fda">uas@skyway-ans.com</font> ;Email: <font color="#009fda">uas_LEVC@skyway-ans.com</font> .</p>',
});

const ATZ_LANZAROTE = zone({
  identifier: 'GCRR AT',
  title: 'ATZ LANZAROTE',
  category: 'ATZ',
  officialHtml:
    'Se encuentra en una zona geográfica de UAS general <elem>ATZ LANZAROTE.</elem><p> Contacto: Email: <font color="#009fda">uas@saerco.com</font> ;Email: <font color="#009fda">uh_gcrr@saerco.com</font> .</p>',
});

const AERODROMO_MATACAN = zone({
  identifier: 'LESA0',
  title: 'SALAMANCA/Matacán',
  category: 'Aeródromo',
  lower: 0,
  upper: 900,
  contact: {
    email: 'ctamatacan@ea.mde.es;osalamanca@aena.es',
    phone: '+34-923 129 500;+34-923 329 600',
  },
  officialHtml:
    'Se encuentra en la Zona geográfica de UAS General por razón de seguridad operacional de <elem>SALAMANCA/Matacán </elem>, LESA.<p><font color="#dc143c">NO permitido el vuelo a drones excepto coordinación con el Aeródromo.</font></p><p> <b>Contacto:</b> TEL: <font color="#009fda">+34-923 129 500</font> ; TEL: <font color="#009fda">+34-923 329 600</font> ;Email: <font color="#009fda">ctamatacan@ea.mde.es</font> ;Email: <font color="#009fda">osalamanca@aena.es</font> </p>',
});

const CTR_SALAMANCA = zone({
  identifier: 'LESA_CT',
  title: 'CTR SALAMANCA',
  category: 'CTR',
  officialHtml:
    'Se encuentra en una zona geográfica de UAS general <elem>CTR SALAMANCA.</elem><p> Contacto: Ministerio de Defensa <p>(Más información en: <font color=\'#009fda\'><a href=\'https://aip.enaire.es/AIP/contenido_AIC/N/LE_Circ_2026_N_01_es.html\' target=\'_blank\'>AIC_NTL_01/26</a></font>)</p>.</p>',
});

const AERODROMO_BARAJAS = zone({
  identifier: 'LEMD0',
  title: 'MADRID/Adolfo Suárez Madrid-Barajas',
  category: 'Aeródromo',
  contact: { email: 'mad.ops.solicituddron@aena.es;secsegoperacional@aena.es;sgopmad@aena.es' },
  officialHtml:
    '<p><b>Contacto:</b>Email: <font color="#009fda">mad.ops.solicituddron@aena.es</font> ;Email: <font color="#009fda">secsegoperacional@aena.es</font> </p><p>Mas información en la web de <a href=\'https://www.aena.es/es/corporativa/seguridad-operacional.html\' target=\'_blank\'> Aena</a></p>',
});

const VUELO_FOTOGRAFICO = zone({
  identifier: '0559-1',
  title: 'Madrid, Hoja: 0559-1',
  category: 'RVF',
  officialHtml:
    'Se encuentra en una zona geográficas de UAS restringida al vuelo fotográfico.<p>Solicite los condicionantes técnicos al Centro Cartográfico y Fotográfico del Ejército del Aire (CECAF) en el email: <font color="#009fda"><a href = "mailto: cecaf@ea.mde.es"> cecaf@ea.mde.es </a></font></p>',
});

const TMA_MADRID = zone({
  identifier: 'LECM_TMA',
  title: 'TMA MADRID',
  category: 'TMA',
  lower: 305,
  officialHtml:
    'Se encuentra en una zona geográfica de UAS general <elem>TMA MADRID.</elem><p> Para cualquier otra operación realice su solicitud a través del contacto indicado. Contacto: .</p><p>Nivel superior: FL245</p>',
});

const FERROCARRIL = zone({
  identifier: 'INF0224',
  title: 'Infraestructura ferroviaria',
  layer: 'infraestructuras',
  category: '',
  leadInterval: 'P20D',
  contact: { email: 'autorizacioneszonadeafeccion@adif.es' },
  officialHtml:
    'Se encuentra en una <b>Zona Geográfica de UAS </b>de protección de las infraestructuras ferroviarias, gestionada por <b>ADIF/ ADIF AV</b>.<p>Compruebe si su operación requiere autorización previa de ADIF y conozca las condiciones en la web <a href=\'https://www.adif.es/solicitud-de-actuaciones-en-zona-de-afeccion-del-ferrocarril\' target=\'_blank\'>ADIF</a>.</p>',
});

test('el enlace a Planea sobrevive al HTML, que era lo que se perdía', () => {
  const c = coordinationFor(CTR_MADRID);
  assert.ok(c);
  assert.equal(c!.manager, 'enaire');
  assert.equal(c!.name, 'ENAIRE');
  assert.equal(c!.viaPlatform, true);
  assert.equal(c!.platformUrl, 'https://planea.enaire.es/');
  assert.deepEqual(c!.contacts.emails, []);
});

test('un ATZ que no lleva ENAIRE se manda a quien lo lleva', () => {
  const valencia = coordinationFor(ATZ_VALENCIA);
  assert.equal(valencia!.manager, 'skyway');
  assert.equal(valencia!.name, 'Skyway');
  assert.equal(valencia!.viaPlatform, false);
  assert.deepEqual(valencia!.contacts.emails, ['uas@skyway-ans.com', 'uas_LEVC@skyway-ans.com']);

  const lanzarote = coordinationFor(ATZ_LANZAROTE);
  assert.equal(lanzarote!.manager, 'saerco');
  assert.deepEqual(lanzarote!.contacts.emails, ['uas@saerco.com', 'uh_gcrr@saerco.com']);
});

test('la zona de aeródromo de una base militar es de Defensa, no de Aena', () => {
  const c = coordinationFor(AERODROMO_MATACAN);
  assert.equal(c!.manager, 'defensa');
  assert.deepEqual(c!.contacts.emails, ['ctamatacan@ea.mde.es', 'osalamanca@aena.es']);
  assert.deepEqual(c!.contacts.phones, ['+34-923 129 500', '+34-923 329 600']);
});

test('un aeródromo civil es de Aena', () => {
  assert.equal(coordinationFor(AERODROMO_BARAJAS)!.manager, 'aena');
});

test('el enlace a la circular aeronáutica no convierte la zona en un trámite de ENAIRE', () => {
  // El CTR de Salamanca lo lleva Defensa, pero su mensaje enlaza a aip.enaire.es
  // para la AIC. Confundir documentación con ventanilla mandaría al piloto a
  // Planea, donde no le van a coordinar nada.
  const c = coordinationFor(CTR_SALAMANCA);
  assert.equal(c!.manager, 'defensa');
  assert.equal(c!.viaPlatform, false);
});

test('el vuelo fotográfico va a CECAF, que es otro trámite distinto', () => {
  const c = coordinationFor(VUELO_FOTOGRAFICO);
  assert.equal(c!.manager, 'cecaf');
  // El correo va dentro de un mailto con espacio detrás de los dos puntos.
  assert.deepEqual(c!.contacts.emails, ['cecaf@ea.mde.es']);
});

test('las zonas del ferrocarril son de ADIF, y avisan con veinte días', () => {
  // No es espacio aéreo controlado, pero sale en la misma consulta y también
  // pide permiso. Y su antelación —P20D— la publica el propio dato.
  const c = coordinationFor(FERROCARRIL);
  assert.equal(c!.manager, 'adif');
  assert.equal(c!.name, 'ADIF');
  assert.equal(c!.leadHours, 480);
  assert.deepEqual(c!.contacts.emails, ['autorizacioneszonadeafeccion@adif.es']);
});

test('cuando ENAIRE no publica contacto, no se inventa uno', () => {
  const c = coordinationFor(TMA_MADRID);
  assert.equal(c!.manager, 'otro');
  assert.equal(c!.name, '');
  assert.deepEqual(c!.contacts.emails, []);
  assert.deepEqual(c!.contacts.urls, []);
});

test('las alturas del texto no se cuelan como teléfonos', () => {
  assert.deepEqual(extractContacts(TMA_MADRID).phones, []);
  assert.deepEqual(extractContacts(CTR_MADRID).phones, []);
});

test('los avisos generales y las zonas libres no llevan a ninguna ventanilla', () => {
  assert.equal(coordinationFor(zone({ officialHtml: 'x', advisory: true })), null);
  assert.equal(coordinationFor(zone({ officialHtml: 'x', type: 'NO_RESTRICTION' })), null);
});

test('primero el aeródromo, luego el ATZ y después el CTR', () => {
  // Lo dice la guía de buenas prácticas de ENAIRE: donde coinciden ATZ y CTR
  // se coordina con el ATZ, por ser el espacio más afectado.
  assert.ok(coordinationPriority(AERODROMO_MATACAN) < coordinationPriority(ATZ_VALENCIA));
  assert.ok(coordinationPriority(ATZ_VALENCIA) < coordinationPriority(CTR_MADRID));
  assert.ok(coordinationPriority(CTR_MADRID) < coordinationPriority(TMA_MADRID));

  const orden = coordinationsFor([TMA_MADRID, CTR_MADRID, AERODROMO_MATACAN, ATZ_VALENCIA]);
  assert.deepEqual(
    orden.map((c) => c.zone.identifier),
    ['LESA0', 'LEVC AT', 'LEMD_CT', 'LECM_TMA'],
  );
});

test('los destinatarios salen separados por coma, como manda el mailto', () => {
  // ENAIRE los separa con punto y coma y así se pasaban al enlace, que es
  // justo lo que el RFC 6068 no admite.
  assert.equal(
    mailRecipients(AERODROMO_BARAJAS),
    'mad.ops.solicituddron@aena.es,secsegoperacional@aena.es,sgopmad@aena.es',
  );
  assert.equal(mailRecipients(TMA_MADRID), '');
});
