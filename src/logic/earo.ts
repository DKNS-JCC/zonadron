/**
 * La EARO: evaluación y atenuación del riesgo operacional.
 *
 * Es el documento que exige el artículo 42.2.b del RD 517/2024 para volar en
 * espacio aéreo controlado, y también lo que pide una dependencia militar
 * cuando quieres trabajar dentro de la zona de su aeródromo. No es un impreso
 * por vuelo: es un acuerdo por ConOps, firmado por las dos partes, con validez
 * indefinida mientras se mantengan las condiciones. Se cruza una vez.
 *
 * Este módulo traduce lo que la app ya sabe —tú, tu flota, la zona, el gestor—
 * a las casillas de la plantilla oficial. Es puro: no lee ficheros ni escribe
 * nada, y por eso se puede comprobar entero sin móvil. El manejo del `.docx`
 * es de `docx.ts`, y el asset y la hoja de compartir de `documents/earoDocx.ts`.
 *
 * Lo que NO hace, y conviene tenerlo claro:
 *
 *  - No firma. La firma es del piloto, y sin ella el documento no vale.
 *  - No rellena el Anexo II. Pide capturas de la comprobación de NOTAM y ATIS
 *    y los procedimientos de salida y llegada del aeródromo sacados del AIP:
 *    son juicio y trabajo del operador, no datos que una app pueda inventar.
 *  - No elige por ti las atenuaciones. Propone las que corresponden a tu
 *    ConOps según el catálogo oficial, y tú quitas y pones.
 *
 * Sobre el direccionamiento de las casillas: la plantilla se recorre por
 * número de tabla, fila y celda, que es frágil si ENAIRE la cambia. Por eso
 * `checkTemplate` comprueba antes unos cuantos rótulos conocidos. Si no
 * cuadran, se prefiere no generar nada a generar un documento con los datos
 * en las casillas equivocadas.
 */

import { getDroneProfile, type DroneProfileId } from './drone';
import { droneOfficialModel, type FleetDrone } from './fleet';
import { catalogEntry } from './droneCatalog';
import { DocxDocument } from './docx';
import { t } from '../i18n';
import type { OperatorProfile } from '../state/SettingsContext';

/** Versión de la plantilla que trae la app. La regenera `npm run vendor:earo`. */
export const EARO_TEMPLATE_VERSION = 'EARO_ABIERTA v3.6 (abril de 2026)';

/* ------------------------------------------------------------------ */
/* Aeronaves                                                           */
/* ------------------------------------------------------------------ */

export type Configuration = 'MULTIRROTOR' | 'ALA_FIJA';

/**
 * Una aeronave tal y como la quiere la tabla de la EARO.
 *
 * Casi todo sale de la flota, pero la plantilla pide tres datos que la ficha
 * del dron no guarda —dimensión característica, velocidad y configuración—
 * porque no hacen falta para nada más. Si el dron se eligió del catálogo de
 * modelos salen de ahí; si se metió a mano, los pregunta el formulario.
 */
export interface EaroAircraft {
  droneId: string;
  manufacturer: string;
  model: string;
  configuration: Configuration;
  /** Marcado de clase (C0…C4), o la explicación de que no lo lleva. */
  classMark: string;
  /** Masa máxima al despegue, en kilos. */
  mtomKg: number | null;
  /** Dimensión característica en metros: la mayor, con las hélices puestas. */
  characteristicSizeM: number | null;
  /** Velocidad máxima en m/s. */
  speedMs: number | null;
  /** Autonomía en minutos. */
  autonomyMin: number | null;
}

const CLASS_MARKS: Record<DroneProfileId, string> = {
  sub250: 'Sin marcado de clase (aeronave «legacy» < 250 g)',
  c1: 'C1',
  c2: 'C2',
  c3c4: 'C3 / C4',
  otro: 'Sin marcado de clase',
};

/** El primer número que aparezca en un texto libre («unos 30 min» → 30). */
function firstNumber(text: string): number | null {
  const m = /(\d+(?:[.,]\d+)?)/.exec(text ?? '');
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Rellena lo que se puede a partir de la ficha del dron; el resto queda a null. */
export function aircraftFromFleet(drone: FleetDrone): EaroAircraft {
  // Si el dron se eligió del catálogo, de ahí salen además los dos datos que
  // la ficha no guarda porque no sirven para nada más —dimensión característica
  // y velocidad máxima— y que sólo pide esta plantilla. Lo que el fabricante
  // no publique sigue quedando en blanco: aquí no se inventa nada.
  const catalog = drone.catalogId ? catalogEntry(drone.catalogId) : null;
  return {
    droneId: drone.id,
    manufacturer: drone.manufacturer.trim(),
    model: drone.model.trim(),
    configuration: catalog?.configuration ?? 'MULTIRROTOR',
    classMark: catalog?.classMark || (CLASS_MARKS[drone.profile] ?? CLASS_MARKS.otro),
    mtomKg: drone.weightGrams !== null ? drone.weightGrams / 1000 : null,
    characteristicSizeM: catalog?.characteristicSizeM ?? null,
    speedMs: catalog?.speedMs ?? null,
    autonomyMin: firstNumber(drone.autonomy) ?? catalog?.autonomyMin ?? null,
  };
}

/**
 * Energía de impacto en julios: ½·m·v².
 *
 * La plantilla la pide y ningún fabricante la publica, pero sale sola de dos
 * datos que sí publican todos. Un Mini 2 a 16 m/s son 32 J.
 */
export function impactEnergyJoules(mtomKg: number | null, speedMs: number | null): number | null {
  if (mtomKg === null || speedMs === null) return null;
  return Math.round(0.5 * mtomKg * speedMs * speedMs);
}

/* ------------------------------------------------------------------ */
/* Concepto de operación                                               */
/* ------------------------------------------------------------------ */

export type EaroDaylight = 'DIURNO' | 'NOCTURNO' | 'AMBOS';

export interface EaroConOps {
  /** Subcategorías de la categoría abierta que cubre el acuerdo. */
  subcategories: string;
  /** Altura máxima del sobre, en metros sobre el terreno. */
  maxHeightAgl: number;
  daylight: EaroDaylight;
  /** true si se va a operar dentro de las ZGUAS de entorno de aeródromo. */
  insideAerodromeZone: boolean;
  /** Radio máximo entre el piloto y la aeronave, en metros. */
  horizontalRangeM: number;
  contingencyHorizontalM: number;
  contingencyVerticalM: number;
  fromMovingVehicle: boolean;
  tethered: boolean;
  fpv: boolean;
  /** Duración máxima de cada sesión de vuelo, en minutos (atenuación MAE11). */
  maxSessionMinutes: number;
}

export interface EaroComms {
  arcid: string;
  callsign: string;
  language: string;
  primary: string;
  alternate: string;
  hasAirBandRadio: boolean;
  hasRadioCertificate: boolean;
}

/** Una dependencia o zona a la que se aplica el acuerdo. */
export interface EaroScope {
  label: string;
  note: string;
}

export interface EaroContext {
  operator: OperatorProfile;
  /** Clase con la que se opera, para la subcategoría. */
  droneProfile: DroneProfileId;
  aircraft: EaroAircraft[];
  /** El proveedor de servicios de tránsito aéreo con el que se firma. */
  atspName: string;
  atspContact: string;
  scope: EaroScope[];
  conops: EaroConOps;
  comms: EaroComms;
  /** Códigos de las atenuaciones que se incluyen. */
  mitigations: string[];
  /** Localidad donde se firma. */
  signPlace: string;
}

/* ------------------------------------------------------------------ */
/* Catálogo de atenuaciones                                            */
/* ------------------------------------------------------------------ */

/**
 * Cuándo procede cada medida. Sirve para proponer un juego coherente con el
 * ConOps en vez de volcar el catálogo entero: pedir luces de vuelo nocturno
 * en una operación diurna sólo consigue que te devuelvan el documento.
 */
export type MitigationWhen = 'siempre' | 'nocturno' | 'cautiva' | 'radio' | 'fpv';

export interface Mitigation {
  code: string;
  strategic: boolean;
  measure: string;
  note: string;
  when: MitigationWhen;
}

/**
 * Catálogo de atenuaciones estratégicas y tácticas de ENAIRE, v1.4.
 *
 * Los textos son los oficiales, resumidos donde el catálogo repite el ámbito
 * de aplicación —que aquí ya lo fija el ConOps— pero sin cambiar lo que cada
 * medida obliga a hacer. Fuente:
 * https://www.enaire.es/docs/download/es_ES/catálogo_mitigaciones/Catalogo_atenuaciones_EAC_ENAIRE_v1_4.pdf
 */
export const MITIGATIONS: Mitigation[] = [
  {
    code: 'MAE01',
    strategic: true,
    when: 'siempre',
    measure:
      'Disponer de un equipo de comunicaciones adecuado capaz de sostener comunicaciones bidireccionales con las estaciones aeronáuticas y en las frecuencias indicadas para cumplir los requisitos aplicables al espacio aéreo en que se opere.',
    note: 'Art. 43.6.a RD 517/2024. A criterio de la dependencia ATS.',
  },
  {
    code: 'MAE02',
    strategic: true,
    when: 'radio',
    measure:
      'Disponer de certificado de formación teórica y práctica como radiofonista emitidos por AESA o por un examinador autorizado; o de los conocimientos necesarios para obtener la calificación de radiofonista conforme al artículo 33.1.e del RD 1036/2017.',
    note: 'Art. 34.1.a RD 517/2024. Sólo si se requiere radio de banda aérea.',
  },
  {
    code: 'MAE03',
    strategic: true,
    when: 'radio',
    measure:
      'Acreditar un conocimiento adecuado del idioma utilizado en las comunicaciones aeronáuticas, al menos nivel operacional 4 según la Orden FOM/1146/2019.',
    note: 'Art. 34.1.b RD 517/2024. Sólo si se requiere radio de banda aérea.',
  },
  {
    code: 'MAE04',
    strategic: true,
    when: 'siempre',
    measure:
      'Coordinación previa del idioma a emplear en las comunicaciones aeronáuticas entre el operador y el servicio de tránsito aéreo.',
    note: '',
  },
  {
    code: 'MAE05',
    strategic: true,
    when: 'siempre',
    measure:
      'Disponer de un sistema de comunicación alternativo con la dependencia ATS (telefonía móvil).',
    note: '',
  },
  {
    code: 'MAE06',
    strategic: true,
    when: 'siempre',
    measure:
      'Contar con la coordinación o respuesta afirmativa expresa del proveedor ATS y gestor o gestores de aeródromos afectados. La operación se realizará con sujeción a las condiciones y limitaciones establecidas en dicha coordinación.',
    note: 'Art. 42.2.b RD 517/2024. La justificación es el presente documento.',
  },
  {
    code: 'MAE09',
    strategic: true,
    when: 'siempre',
    measure:
      'Coordinación con el gestor del aeródromo o helipuerto si se pretende operar dentro de las zonas geográficas de UAS generales del artículo 41 del RD 517/2024.',
    note: 'Art. 41.3 RD 517/2024.',
  },
  {
    code: 'MAE10',
    strategic: true,
    when: 'siempre',
    measure:
      'Contar con procedimientos para la consulta y análisis en AIP de los procedimientos de salida y arribada del aeródromo según sus configuraciones operacionales, incluyendo aproximaciones frustradas y despegues con fallo de motor.',
    note: 'Se evidencia en el Anexo II.',
  },
  {
    code: 'MAE11',
    strategic: true,
    when: 'siempre',
    measure: 'Restricción operacional en tiempo de exposición: emplear el menor tiempo posible.',
    note: '',
  },
  {
    code: 'MAE12',
    strategic: true,
    when: 'siempre',
    measure:
      'Coordinación previa del código ARCID y del indicativo de llamada (callsign) a emplear en las operaciones.',
    note: 'Ver el procedimiento de coordinación.',
  },
  {
    code: 'MAE13',
    strategic: true,
    when: 'siempre',
    measure:
      'Análisis de las franjas horarias con menor densidad de tráfico aéreo en la zona de operaciones prevista.',
    note: '',
  },
  {
    code: 'MAE14',
    strategic: true,
    when: 'cautiva',
    measure:
      'La aeronave anclada se ubicará donde no entorpezca las operaciones de otros usuarios del espacio aéreo, y su ubicación se coordinará previamente con la dependencia ATS afectada.',
    note: '',
  },
  {
    code: 'MAE15',
    strategic: true,
    when: 'cautiva',
    measure:
      'Las operaciones con aeronaves ancladas dentro de las zonas geográficas de UAS de entorno de aeródromo se realizarán en periodos valle de actividad.',
    note: '',
  },
  {
    code: 'MAE16',
    strategic: true,
    when: 'siempre',
    measure: 'Establecer zonas adicionales de seguridad, horizontales y verticales.',
    note: '',
  },
  {
    code: 'MAE17',
    strategic: true,
    when: 'siempre',
    measure:
      'Realizar la operación en el momento más adecuado, determinado por la dependencia ATS afectada.',
    note: 'A nivel pre-táctico y táctico.',
  },
  {
    code: 'MAE18',
    strategic: true,
    when: 'siempre',
    measure:
      'A criterio del proveedor ATS se procederá a la publicación de la operación en NOTAM, ATIS, DATIS u otro medio de difusión aeronáutica cuando pueda suponer un riesgo para las operaciones de aviación tripulada.',
    note: 'El operador no solicitará NOTAM por su cuenta.',
  },
  {
    code: 'MAE20',
    strategic: true,
    when: 'siempre',
    measure:
      'Contar con procedimientos para la comprobación de las actividades y advertencias para los usuarios del espacio aéreo (NOTAM) en la zona de operaciones prevista.',
    note: 'Se evidencia en el Anexo II.',
  },
  {
    code: 'MAE21',
    strategic: true,
    when: 'siempre',
    measure:
      'Independientemente de la altura máxima permitida en la categoría operacional o en el ConOps coordinado, el ATSP podrá requerir una altura máxima de operación inferior.',
    note: 'Aceptado.',
  },
  {
    code: 'MAE22',
    strategic: true,
    when: 'nocturno',
    measure:
      'Disponer de al menos una luz verde intermitente con fines de visibilidad de la aeronave por la noche.',
    note: 'UAS.SPEC.050.1.l. Requerido para vuelos nocturnos.',
  },
  {
    code: 'MAE23',
    strategic: true,
    when: 'siempre',
    measure:
      'Disponer de luces anticolisión o de navegación siempre y cuando no creen confusión a otros usuarios.',
    note: '',
  },
  {
    code: 'MAE24',
    strategic: true,
    when: 'siempre',
    measure:
      'Disponer de transpondedor u otro sistema de identificación (por ejemplo ADS-B «out») para los servicios de tránsito aéreo.',
    note: 'A criterio de la dependencia.',
  },
  {
    code: 'MAT01',
    strategic: false,
    when: 'siempre',
    measure:
      'Comprobación de las actividades y advertencias para los usuarios del espacio aéreo (NOTAM, ATIS/DATIS) en la zona donde tendrán lugar las operaciones.',
    note: 'Antes de cada vuelo, mediante ENAIRE Drones e ICARO XXI.',
  },
  {
    code: 'MAT02',
    strategic: false,
    when: 'siempre',
    measure:
      'Mantenerse a la escucha activa en la frecuencia aeronáutica correspondiente o, en su defecto, poder comunicarse por telefonía móvil con volumen adecuado y cobertura.',
    note: '',
  },
  {
    code: 'MAT03',
    strategic: false,
    when: 'siempre',
    measure:
      'Contactar con la dependencia ATS con la antelación indicada por el ATSP según el procedimiento de coordinación, para verificar la viabilidad de la operación.',
    note: '',
  },
  {
    code: 'MAT04',
    strategic: false,
    when: 'siempre',
    measure:
      'Contar con la previa autorización del control de tránsito aéreo (ATC) o comunicación al personal AFIS. En el primer contacto, los indicativos de llamada incluirán las palabras «no tripulado» o «unmanned».',
    note: 'Art. 42.3 RD 517/2024.',
  },
  {
    code: 'MAT06',
    strategic: false,
    when: 'siempre',
    measure: 'Comunicar la finalización de la operación a la dependencia de servicios de tránsito aéreo.',
    note: '',
  },
  {
    code: 'MAT07',
    strategic: false,
    when: 'siempre',
    measure:
      'Disponer y ejecutar procedimientos específicos ante situaciones anormales y de emergencia, con aviso por radio o teléfono a la dependencia ATS en caso de pérdida de control del UAS (flyaway).',
    note: 'Ver los procedimientos de emergencia.',
  },
  {
    code: 'MAT08',
    strategic: false,
    when: 'siempre',
    measure:
      'Análisis previo de la cobertura VHF en la zona de operaciones, así como de la cobertura de telefonía cuando se use este medio como principal o alternativo.',
    note: '',
  },
  {
    code: 'MAT09',
    strategic: false,
    when: 'cautiva',
    measure:
      'Para aeronaves ancladas situadas en trayectorias estándar de vuelo, se garantizará que la operación pueda suspenderse aterrizando con margen suficiente antes del sobrevuelo de la aeronave tripulada.',
    note: '',
  },
  {
    code: 'MAT10',
    strategic: false,
    when: 'siempre',
    measure:
      'Solicitar asesoramiento anticolisión o información de tránsito respecto de aeronaves tripuladas en las inmediaciones.',
    note: '',
  },
  {
    code: 'MAT11',
    strategic: false,
    when: 'siempre',
    measure:
      'Aterrizaje inmediato por comunicación del servicio ATC o información de tránsito por parte del AFIS.',
    note: 'Aceptado.',
  },
  {
    code: 'MAT12',
    strategic: false,
    when: 'cautiva',
    measure:
      'Vigilar que el cable y el sistema de anclado no fallan. Ante una rotura del sistema de contención se aterrizará la aeronave y se avisará por radio o teléfono a la dependencia ATS.',
    note: '',
  },
  {
    code: 'MAT13',
    strategic: false,
    when: 'fpv',
    measure:
      'Cuando el piloto no tenga visual del entorno deberá valerse de observadores del espacio aéreo u otros medios para evitar un encuentro fortuito con una aeronave tripulada.',
    note: 'Especialmente en entorno urbano y en subcategorías A1 y A2.',
  },
];

export function mitigationByCode(code: string): Mitigation | null {
  return MITIGATIONS.find((m) => m.code === code) ?? null;
}

/** Las atenuaciones que corresponden a un ConOps concreto. */
export function suggestedMitigations(conops: EaroConOps, comms: EaroComms): string[] {
  return MITIGATIONS.filter((m) => {
    switch (m.when) {
      case 'siempre':
        return true;
      case 'nocturno':
        return conops.daylight !== 'DIURNO';
      case 'cautiva':
        return conops.tethered;
      case 'fpv':
        return conops.fpv;
      case 'radio':
        return comms.hasAirBandRadio || comms.hasRadioCertificate;
      default:
        return false;
    }
  }).map((m) => m.code);
}

/* ------------------------------------------------------------------ */
/* Valores de partida                                                  */
/* ------------------------------------------------------------------ */

export function defaultConOps(profile: DroneProfileId): EaroConOps {
  const subcategory = getDroneProfile(profile, 'es').subcategory;
  return {
    subcategories: subcategory,
    maxHeightAgl: 120,
    daylight: 'DIURNO',
    insideAerodromeZone: true,
    horizontalRangeM: 200,
    contingencyHorizontalM: 30,
    contingencyVerticalM: 15,
    fromMovingVehicle: false,
    tethered: false,
    fpv: false,
    maxSessionMinutes: 25,
  };
}

export function defaultComms(operator: OperatorProfile): EaroComms {
  return {
    arcid: '',
    callsign: '',
    language: 'ESPAÑOL',
    primary: operator.phone.trim()
      ? `TELÉFONO MÓVIL: ${operator.phone.trim()}`
      : 'TELÉFONO MÓVIL',
    alternate: 'TELÉFONO MÓVIL (segundo terminal)',
    hasAirBandRadio: false,
    hasRadioCertificate: false,
  };
}

/* ------------------------------------------------------------------ */
/* Comprobación de la plantilla                                        */
/* ------------------------------------------------------------------ */

/**
 * Rótulos que tienen que estar donde se espera para que el relleno sea seguro.
 * Si ENAIRE reordena la plantilla, esto salta antes de escribir nada.
 */
const ANCHORS: Array<[number, number, number, string]> = [
  [0, 0, 0, 'NÚMERO DE REGISTRO DE OPERADOR DE UAS'],
  [1, 0, 0, 'NOMBRE O RAZÓN SOCIAL'],
  [6, 0, 1, 'Fabricante y modelo del UAS'],
  [8, 0, 0, 'COD.'],
  [9, 0, 0, 'Indicativo ARCID'],
  [12, 0, 0, 'El operador de UAS'],
];

export function checkTemplate(doc: DocxDocument): boolean {
  if (doc.tableCount() < 13) return false;
  try {
    return ANCHORS.every(([tabla, fila, celda, texto]) =>
      doc.cellText(tabla, fila, celda).startsWith(texto),
    );
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Relleno                                                             */
/* ------------------------------------------------------------------ */

function num(value: number | null, decimals = 0): string {
  if (value === null) return '[COMPLETAR]';
  return value.toFixed(decimals).replace('.', ',');
}

function daylightLabel(d: EaroDaylight): string {
  return d === 'AMBOS' ? 'DIURNO Y NOCTURNO' : d;
}

/**
 * Escribe todos los datos sobre el documento abierto.
 *
 * Se hace de abajo arriba dentro de cada tabla en lo que toca a borrar y
 * clonar filas, para que los índices no se muevan bajo los pies.
 */
export function fillEaro(doc: DocxDocument, ctx: EaroContext): void {
  const { operator, conops, comms } = ctx;

  // --- Tabla 1: datos del operador ---
  doc.setCell(0, 0, 1, [operator.uasNumber.trim() || '[COMPLETAR]']);
  doc.setCell(0, 1, 1, [operator.name.trim() || '[COMPLETAR]']);
  doc.setCell(0, 2, 1, [
    `${operator.name.trim() || '[COMPLETAR]'} (operador de UAS y piloto a distancia)`,
  ]);
  doc.setCell(0, 3, 1, [operator.phone.trim() || '[COMPLETAR]']);
  doc.setCell(0, 4, 1, [operator.email.trim() || '[COMPLETAR]']);

  // --- Tabla 2: proveedor de servicios de tránsito aéreo ---
  // La plantilla viene con ENAIRE puesto, y no siempre es ENAIRE.
  doc.setCell(1, 0, 1, [ctx.atspName || '[COMPLETAR]']);
  doc.setCell(1, 1, 1, [ctx.atspContact || '[COMPLETAR]']);

  // --- Tabla 3: ConOps ---
  doc.setCell(2, 0, 0, ['CATEGORÍA ABIERTA', `SUBCATEGORÍA ${conops.subcategories}`]);
  doc.setCell(2, 2, 0, [daylightLabel(conops.daylight)]);
  doc.setCell(2, 4, 0, [
    conops.insideAerodromeZone
      ? 'DENTRO DE LAS ZONAS GEOGRÁFICAS DE UAS GENERALES POR RAZÓN DE LA SEGURIDAD OPERACIONAL EN EL ENTORNO DE LOS AERÓDROMOS'
      : 'FUERA DE LAS ZONAS GEOGRÁFICAS DE UAS GENERALES POR RAZÓN DE LA SEGURIDAD OPERACIONAL EN EL ENTORNO DE LOS AERÓDROMOS',
  ]);
  doc.setCell(2, 6, 0, [`ALTURA MÁXIMA ${conops.maxHeightAgl} m AGL, salvo obstáculos`]);

  // --- Tablas 5 y 6: ámbito de aplicación ---
  if (ctx.atspName) {
    doc.setCell(4, 0, 0, [`Dependencias donde ${ctx.atspName} presta servicios de tránsito aéreo`]);
  }
  const scope = ctx.scope.length > 0 ? ctx.scope : [{ label: '[COMPLETAR]', note: '' }];
  doc.cloneRow(5, 1, scope.length - 1);
  scope.forEach((s, i) => {
    doc.setCell(5, 1 + i, 0, [s.label]);
    doc.setCell(5, 1 + i, 1, [s.note]);
  });

  // --- Tabla 7: aeronaves ---
  const aircraft = ctx.aircraft.length > 0 ? ctx.aircraft : [];
  // La plantilla trae tres filas de ejemplo (UAS 1, UAS 2, UAS n).
  const sobran = [1, 2, 3].slice(Math.max(aircraft.length, 1));
  if (sobran.length > 0) doc.dropRows(6, sobran);
  if (aircraft.length > 3) doc.cloneRow(6, 3, aircraft.length - 3);
  aircraft.forEach((a, i) => {
    const fila = 1 + i;
    doc.setCell(6, fila, 0, [`UAS ${i + 1}`]);
    doc.setCell(6, fila, 1, [[a.manufacturer, a.model].filter(Boolean).join(' — ') || '[COMPLETAR]']);
    doc.setCell(6, fila, 2, [a.configuration === 'ALA_FIJA' ? 'Ala fija' : 'Multirrotor']);
    doc.setCell(6, fila, 3, [a.classMark]);
    doc.setCell(6, fila, 4, [num(a.mtomKg, 3)]);
    doc.setCell(6, fila, 5, [num(a.characteristicSizeM, 3)]);
    doc.setCell(6, fila, 6, [num(a.speedMs)]);
    doc.setCell(6, fila, 7, [num(impactEnergyJoules(a.mtomKg, a.speedMs))]);
    doc.setCell(6, fila, 8, [num(a.autonomyMin)]);
  });

  // --- Tabla 8: modelo semántico ---
  const sobranSem = [2, 3, 4].slice(Math.max(aircraft.length, 1));
  if (sobranSem.length > 0) doc.dropRows(7, sobranSem);
  if (aircraft.length > 3) doc.cloneRow(7, 4, aircraft.length - 3);
  aircraft.forEach((a, i) => {
    const fila = 2 + i;
    doc.setCell(7, fila, 0, [`UAS ${i + 1}`]);
    doc.setCell(7, fila, 1, [String(conops.horizontalRangeM)]);
    doc.setCell(7, fila, 2, [String(conops.maxHeightAgl)]);
    doc.setCell(7, fila, 3, [
      `Geografía del vuelo: radio máximo de ${conops.horizontalRangeM} m desde la posición del piloto y ${conops.maxHeightAgl} m AGL. ` +
        `Volumen de contingencia mínimo: ${conops.contingencyHorizontalM} m horizontales y ${conops.contingencyVerticalM} m verticales adicionales. ` +
        `Distancias compatibles con VLOS para una aeronave de ${num(a.mtomKg, 3)} kg.`,
    ]);
  });

  // --- Tabla 9: atenuaciones ---
  const medidas = ctx.mitigations
    .map(mitigationByCode)
    .filter((m): m is Mitigation => m !== null);
  // La plantilla trae dos filas de ejemplo y una de relleno (MAEXX/MATXX).
  doc.dropRows(8, [4]);
  if (medidas.length > 2) doc.cloneRow(8, 2, medidas.length - 2);
  else if (medidas.length < 2) doc.dropRows(8, [3]);
  medidas.forEach((m, i) => {
    const fila = 2 + i;
    doc.setCell(8, fila, 0, [m.code]);
    doc.setCell(8, fila, 1, [m.strategic ? 'Estratégica' : 'Táctica']);
    doc.setCell(8, fila, 2, [m.measure]);
    doc.setCell(8, fila, 3, [
      m.code === 'MAE11'
        ? `Sesiones de vuelo de duración máxima ${conops.maxSessionMinutes} minutos.`
        : m.code === 'MAE16'
          ? `Volumen de contingencia de ${conops.contingencyHorizontalM} m horizontales y ${conops.contingencyVerticalM} m verticales.`
          : m.note,
    ]);
  });

  // --- Tabla 10: procedimiento de coordinación ---
  doc.setCell(9, 0, 1, [comms.arcid.trim() || '[COMPLETAR]']);
  doc.setCell(9, 1, 1, [comms.callsign.trim() || '[COMPLETAR]']);
  doc.setCell(9, 2, 1, [comms.language]);
  doc.setCell(9, 3, 1, [comms.primary]);
  doc.setCell(9, 4, 1, [
    comms.hasAirBandRadio
      ? comms.alternate
      : `${comms.alternate}. El operador no dispone de radio de banda aérea.`,
  ]);

  // --- Tabla 12: contactos ante emergencia ---
  doc.setCell(11, 1, 1, [ctx.atspContact || '[COMPLETAR]']);

  // --- Tabla 13: firma ---
  const year = new Date().getFullYear();
  doc.setCell(12, 1, 0, [
    `En ${ctx.signPlace || '[LOCALIDAD]'}, a ___ de _______________ de ${year}`,
  ]);
  doc.setCell(12, 3, 0, ['Cargo: operador de UAS y piloto a distancia']);
  doc.setCell(12, 4, 0, [operator.name.trim() || '[COMPLETAR]']);

  // --- Párrafos del ámbito de aplicación ---
  doc.setParagraph(
    'El operador de UAS está registrado',
    operator.uasNumber.trim()
      ? `El operador de UAS está registrado en AESA con el número de operador ${operator.uasNumber.trim()}.`
      : 'El operador de UAS está registrado, salvo excepciones.',
  );
  doc.setParagraph(
    'Se opera según la categoría abierta',
    `Se opera según la categoría abierta, subcategoría ${conops.subcategories}.`,
  );
  doc.setParagraph(
    'Se realizarán dentro/fuera',
    conops.insideAerodromeZone
      ? 'Se realizarán dentro de las zonas geográficas de UAS generales por razón de la seguridad operacional en el entorno de los aeródromos y helipuertos definidas en el anexo a este documento.'
      : 'Se realizarán fuera de las zonas geográficas de UAS generales por razón de la seguridad operacional en el entorno de los aeródromos y helipuertos definidas en el anexo a este documento.',
  );
  doc.setParagraph(
    'Serán operaciones diurnas',
    conops.daylight === 'DIURNO'
      ? 'Serán operaciones diurnas.'
      : conops.daylight === 'NOCTURNO'
        ? 'Serán operaciones nocturnas.'
        : 'Serán operaciones diurnas y nocturnas.',
  );
  doc.setParagraph(
    'La operación no se realizará desde vehículos',
    conops.fromMovingVehicle
      ? 'La operación podrá realizarse desde vehículos en movimiento.'
      : 'La operación no se realizará desde vehículos en movimiento.',
  );
  doc.setParagraph(
    'La operación no se realizará con aeronave no tripulada anclada',
    conops.tethered
      ? 'La operación podrá realizarse con aeronave no tripulada anclada (aeronave cautiva).'
      : 'La operación no se realizará con aeronave no tripulada anclada (aeronave cautiva).',
  );
  doc.setParagraph(
    'La operación no se realizará con sistema FPV',
    conops.fpv
      ? 'La operación podrá realizarse con sistema FPV. Para estas operaciones se contará con observadores con la finalidad de garantizar VLOS.'
      : 'La operación no se realizará con sistema FPV.',
  );
}

/* ------------------------------------------------------------------ */
/* Lo que queda por hacer a mano                                       */
/* ------------------------------------------------------------------ */

/** Qué falta para que el documento se pueda mandar. Texto para enseñar. */
export function missingEaroFields(ctx: EaroContext): string[] {
  const missing: string[] = [];
  if (!ctx.operator.name.trim()) missing.push(t('operator.missing.name'));
  if (!ctx.operator.uasNumber.trim()) missing.push(t('operator.missing.uasNumber'));
  if (!ctx.operator.email.trim()) missing.push(t('operator.missing.email'));
  if (!ctx.operator.phone.trim()) missing.push(t('operator.missing.phone'));
  if (!ctx.atspName.trim()) missing.push(t('earo.missing.atsp'));
  if (ctx.scope.length === 0) missing.push(t('earo.missing.scope'));
  if (ctx.aircraft.length === 0) missing.push(t('earo.missing.aircraft'));
  for (const a of ctx.aircraft) {
    if (a.mtomKg === null) missing.push(t('earo.missing.mtom'));
    if (a.characteristicSizeM === null) missing.push(t('earo.missing.size'));
    if (a.speedMs === null) missing.push(t('earo.missing.speed'));
    if (a.autonomyMin === null) missing.push(t('earo.missing.autonomy'));
  }
  if (!ctx.comms.arcid.trim()) missing.push(t('earo.missing.arcid'));
  if (!ctx.comms.callsign.trim()) missing.push(t('earo.missing.callsign'));
  return [...new Set(missing)];
}

/**
 * Lo que la app no puede poner y tiene que añadir el piloto antes de firmar.
 *
 * Se enseña siempre, aunque esté todo lo demás relleno: un EARO sin firmar o
 * sin las evidencias del Anexo II es uno de los reparos más habituales que
 * pone ENAIRE, y vale más leerlo aquí que enterarse una semana después.
 */
export function pendingByHand(): string[] {
  return [
    t('earo.byHand.signature'),
    t('earo.byHand.notam'),
    t('earo.byHand.atis'),
    t('earo.byHand.procedures'),
    t('earo.byHand.registration'),
  ];
}
