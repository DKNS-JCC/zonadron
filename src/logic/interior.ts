/**
 * Comunicación previa al Ministerio del Interior.
 *
 * Volar en entorno urbano obliga a comunicárselo al Ministerio del Interior con
 * al menos cinco días naturales de antelación (RD 517/2024, art. 40, y el aviso
 * que publica la propia ENAIRE). El trámite se hace con SU impreso: cuatro
 * páginas y setenta y tres casillas.
 *
 * Este módulo traduce lo que la app ya sabe a esas casillas. No dibuja nada ni
 * toca ficheros: eso es de `pdfForm.ts`. Aquí sólo hay datos, y por eso se puede
 * comprobar entero sin móvil.
 *
 * Sobre los nombres de campo: se usan siempre completos, con su página delante.
 * No es manía. La plantilla repite nombres entre páginas (`ListaDesplegable1[0]`
 * es la provincia del operador, la del piloto y la del observador según en qué
 * página estés), y además tiene nombres que MIENTEN:
 *
 *  - `Correo_electrónico[1]` de la página 1 es en realidad el teléfono.
 *  - `Acreditación_de_formación_autopráctica…[1]` de la página 2 es la casilla
 *    de la póliza de seguros.
 *
 * Cada asignación de aquí está verificada por la posición del campo en la hoja
 * y contrastada con el impreso renderizado, no por su nombre.
 */

import type { QueryResult } from '../types';
import type { OperatorProfile } from '../state/SettingsContext';
import { droneOfficialModel, type FleetDrone } from './fleet';
import { getDroneProfile } from './drone';

/* ------------------------------------------------------------------ */
/* Nombres de campo de la plantilla                                     */
/* ------------------------------------------------------------------ */

const P = (page: 1 | 2 | 3 | 4, name: string) => `topmostSubform[0].Page${page}[0].${name}`;

export const FIELDS = {
  // --- Página 1: declarante (operador) y representante ---
  comunicacionFecha1: P(1, '#field[16]'),
  comunicacionHora1: P(1, 'CampoFechaHora1[0]'),
  operadorNombre: P(1, 'Nombre_o_razón_social_primer_apellido__segundo_apellido__nombre___Row_1[0]'),
  operadorDni: P(1, 'DNI__NIF__NIE__CIF___Row_1[0]'),
  operadorDomicilio: P(1, 'Tipo_Víadenominación[0]'),
  operadorCp: P(1, 'Código_Postal[0]'),
  operadorMunicipio: P(1, 'Municipio[0]'),
  operadorProvincia: P(1, 'ListaDesplegable1[0]'),
  /** Ojo: se llama «Correo_electrónico[1]» pero es la casilla del teléfono. */
  operadorTelefono: P(1, 'Correo_electrónico[1]'),
  operadorCorreo: P(1, 'Correo_electrónico[0]'),
  /** Casillas de 6 pt para marcar el medio preferente de notificación. */
  notificacionPorCorreo: P(1, 'Correo_electrónico_2[0]'),
  notificacionPorPostal: P(
    1,
    'Correo_postal_Domicilio_a_efectos_de_notificaciones_rellenar_solamente_si_no_coincide_con_el_del_declarante[0]',
  ),
  operadorRegistro: P(1, 'Número_de_registro_de_operador[0]'),

  // --- Página 2: piloto, seguro y operación ---
  comunicacionFecha2: P(2, '#field[14]'),
  comunicacionHora2: P(2, 'CampoFechaHora1[0]'),
  pilotoNombre: P(2, 'Nombre_o_razón_social_primer_apellido__segundo_apellido__nombre___Row_1_2[0]'),
  pilotoDni: P(2, 'DNI__NIF__NIE__CIF___Row_1_3[0]'),
  pilotoDomicilio: P(2, 'Tipo_Víadenominación_2[0]'),
  pilotoCp: P(2, 'Código_Postal_3[0]'),
  pilotoMunicipio: P(2, 'Municipio_3[0]'),
  pilotoProvincia: P(2, 'ListaDesplegable1[0]'),
  pilotoCertificado: P(2, 'Certificado_de_competencia_de_piloto_a_distancia____Row_1[0]'),
  pilotoFormacion: P(2, 'Acreditación_de_formación_autopráctica_en_la_clase_de_UAS_a_utilizar___Row_1[0]'),
  /** Ojo: repite el nombre del campo anterior, pero es la póliza de seguros. */
  seguro: P(2, 'Acreditación_de_formación_autopráctica_en_la_clase_de_UAS_a_utilizar___Row_1[1]'),
  operacionTipo: P(
    2,
    'Tipo_de_operación_concretar_la_actividad_a_desarrollar__informativa__grabación_de_imágenes__grabación_de_sonido__telemetría__observación__vigilancia__etc[0]',
  ),
  operacionFecha: P(2, 'Fecha_de_la_operación_día__mes_y_año[0]'),
  operacionLugar: P(2, 'Lugar_de_la_operación_población__provincia_y_CCAA[0]'),
  operacionInicio: P(2, 'Hora_prevista_de_inicio_de_la_operación_en_hora_local[0]'),
  operacionFin: P(2, 'Hora_prevista_de_finalización_de_la_operación_en_hora_local[0]'),
  operacionDuracion: P(2, 'Duración_total_prevista_de_la_operación[0]'),

  // --- Página 3: delimitación del lugar y aeronave ---
  comunicacionFecha3: P(3, '#field[17]'),
  comunicacionHora3: P(3, 'CampoFechaHora1[0]'),
  zonaPoblacion: P(3, 'Zona_de_población[0]'),
  wgs84: P(3, 'WGS-84[0]'),
  radio: P(3, 'Radio_en_metros[0]'),
  ruta: P(
    3,
    'Ruta_a_seguir_en_caso_de_que_haya_desplazamiento_concretar_calles_y_números__velocidad_y_altura_prevista___Row_1[0]',
  ),
  areaProteccion: P(
    3,
    'Ubicación_del_área_de_protección_zona_de_despegue_y_aterrizajes_normales___Row_1[0]',
  ),
  zonaRecuperacion: P(
    3,
    'Ubicación_de_la_zona_de_recuperación_zona_de_aterrizajes_de_emergencias___Row_1[0]',
  ),
  alturaPrevista: P(3, 'Altura_prevista_de_la_operación___Row_1[0]'),
  claseUas: P(3, 'Clase_de_UAS[0]'),
  fabricante: P(3, 'Nombre_del_fabricante[0]'),
  modelo: P(3, 'Tipo_y_modelo[0]'),
  numeroSerie: P(3, 'Número_de_serie[0]'),
  matricula: P(3, 'Matrícula_en_su_caso[0]'),
  mtom: P(3, 'MTOM[0]'),
  autonomia: P(3, 'Autonomía[0]'),
  autopiloto: P(3, 'Autopiloto_tipo_de_autopiloto_y_sistema_de_navegación_inercial_si_lo_tiene[0]'),
  frecuencias: P(3, 'Banda_y_frecuencias_de_funcionamiento_de_control_del_UAS[0]'),
  color: P(3, 'Color[0]'),

  // --- Página 4: equipamiento, observadores y firma ---
  comunicacionFecha4: P(4, '#field[14]'),
  comunicacionHora4: P(4, 'CampoFechaHora1[0]'),
  luces: P(4, 'Luces_pintura_de_alta_visibilidad__etc[0]'),
  cargaPago: P(
    4,
    'Carga_de_pago_cámara__micrófono__antena__infrarrojos__objetos__dispositivos__etc____Row_1[0]',
  ),
  vhf: P(4, 'Equipo_de_comunicaciones_VHF[0]'),
  modoS: P(4, 'Respondedor_Modo_S_solamente_obligatorio_para_espacio_aéreo_controlado[0]'),
  emergencia: P(4, 'Equipo_de_Emergencia_sistema_de_terminación_del_vuelo_seguro[0]'),
  visionDelante: P(4, 'Dispositivo_de_visión_hacia_delante[0]'),
  lugarYFecha: P(4, 'Lugar_y_Fecha__Row_1[0]'),
  nombreYCargo: P(4, 'Nombre__apellidos_y_cargo_-declarante__Row_1[0]'),
  firma: P(4, 'Firma__Row_1[0]'),
} as const;

/* ------------------------------------------------------------------ */
/* Provincias                                                           */
/* ------------------------------------------------------------------ */

/**
 * Las 52 provincias TAL Y COMO las escribe el desplegable del impreso. Están
 * copiadas de su `/Opt`: un valor que no coincida carácter a carácter deja la
 * casilla en blanco, así que no valen ni «A Coruña» ni «Illes Balears».
 */
export const PROVINCES = [
  'Albacete', 'Alicante/Alacant', 'Almería', 'Araba/Álava', 'Asturias', 'Ávila',
  'Badajoz', 'Balears, Illes', 'Barcelona', 'Bizkaia', 'Burgos', 'Cáceres',
  'Cádiz', 'Cantabria', 'Castellón/Castelló', 'Ciudad Real', 'Córdoba',
  'Coruña, A', 'Cuenca', 'Gipuzkoa', 'Girona', 'Granada', 'Guadalajara',
  'Huelva', 'Huesca', 'Jaén', 'León', 'Lleida', 'Lugo', 'Madrid', 'Málaga',
  'Murcia', 'Navarra', 'Ourense', 'Palencia', 'Palmas, Las', 'Pontevedra',
  'Rioja, La', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla',
  'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia/València', 'Valladolid',
  'Zamora', 'Zaragoza', 'Ceuta', 'Melilla',
] as const;

export type Province = (typeof PROVINCES)[number];

/**
 * Encaja un nombre de provincia suelto con el del desplegable.
 *
 * El geocodificador devuelve «A Coruña» y el impreso quiere «Coruña, A»; lo
 * mismo con «Las Palmas», «La Rioja» e «Illes Balears». Se comparan sin
 * acentos, sin mayúsculas y sin orden de artículo.
 */
export function matchProvince(raw: string | null | undefined): Province | null {
  const clean = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
  const target = clean(raw ?? '');
  if (!target) return null;
  for (const p of PROVINCES) {
    if (clean(p) === target) return p;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Coordenadas                                                          */
/* ------------------------------------------------------------------ */

/**
 * Coordenadas en DMS, que es lo que el impreso pide literalmente: «coordenadas
 * del punto central de vuelo en el Sistema de Referencia WGS-84, con anotación
 * DMS (grados, min, segundos)».
 */
export function toDms(lat: number, lon: number): string {
  const one = (value: number, degDigits: number, positive: string, negative: string) => {
    const hemisphere = value >= 0 ? positive : negative;
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = (minFloat - min) * 60;
    return (
      `${String(deg).padStart(degDigits, '0')}º` +
      `${String(min).padStart(2, '0')}'` +
      `${sec.toFixed(1).padStart(4, '0')}"${hemisphere}`
    );
  };
  return `${one(lat, 2, 'N', 'S')} ${one(lon, 3, 'E', 'W')}`;
}

/* ------------------------------------------------------------------ */
/* Datos                                                                */
/* ------------------------------------------------------------------ */

/** Datos del piloto. Casi siempre es el propio operador. */
export interface PilotProfile {
  /** true = el piloto es el operador, y sus datos se copian. */
  sameAsOperator: boolean;
  name: string;
  dni: string;
  address: string;
  postalCode: string;
  municipality: string;
  province: string;
  /** Certificado de competencia de piloto a distancia (A1/A3, A2…). */
  competence: string;
  /** Acreditación de formación autopráctica en la clase de UAS. */
  training: string;
  /** Póliza de seguros o garantía financiera, con entidad y validez. */
  insurance: string;
}

export const EMPTY_PILOT: PilotProfile = {
  sameAsOperator: true,
  name: '', dni: '', address: '', postalCode: '', municipality: '', province: '',
  competence: '', training: '', insurance: '',
};

/** Lo que cambia en cada vuelo. Lo único que hay que teclear cada vez. */
export interface InteriorOperation {
  /** Tipo de operación: grabación de imágenes, observación, etc. */
  activity: string;
  /** Fecha del vuelo, ISO `yyyy-mm-dd`. */
  date: string;
  /** Horas locales `HH:mm`. */
  startTime: string;
  endTime: string;
  /** Radio de vuelo en metros, alrededor del punto central. */
  radiusM: string;
  /** Delimitación por referencias terrestres: calles y números. */
  groundReference: string;
  route: string;
  takeoffArea: string;
  recoveryArea: string;
}

export function emptyOperation(): InteriorOperation {
  return {
    activity: '', date: '', startTime: '', endTime: '', radiusM: '100',
    groundReference: '', route: '', takeoffArea: '', recoveryArea: '',
  };
}

/** Actividades que el propio impreso propone entre paréntesis. */
export const ACTIVITIES = [
  'Grabación de imágenes',
  'Grabación de sonido',
  'Informativa',
  'Telemetría',
  'Observación',
  'Vigilancia',
] as const;

export interface InteriorContext {
  operator: OperatorProfile;
  pilot: PilotProfile;
  drone: FleetDrone | null;
  /** El punto consultado: de aquí salen coordenadas, altura y terreno. */
  result: QueryResult;
  /** Nombre del sitio que ha resuelto el geocodificador, si lo hay. */
  place: string | null;
  /** Provincia del punto, si se ha podido saber. */
  province: string | null;
  operation: InteriorOperation;
  now: Date;
}

/* ------------------------------------------------------------------ */
/* Antelación                                                           */
/* ------------------------------------------------------------------ */

/** Días naturales de antelación que exige la norma. */
export const MIN_NOTICE_DAYS = 5;

/**
 * Días naturales entre hoy y la fecha del vuelo. null si la fecha no es
 * utilizable. Se cuenta por días de calendario, no por horas: la norma habla de
 * días naturales, y comparar instantes daría 4 días para un vuelo que sí los
 * cumple.
 */
export function noticeDays(dateIso: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!m) return null;
  const flight = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((flight - today) / 86400000);
}

/* ------------------------------------------------------------------ */
/* Cálculos auxiliares                                                  */
/* ------------------------------------------------------------------ */

function minutesOf(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Duración a partir de las dos horas. Si cruza medianoche, suma un día. */
export function durationLabel(startTime: string, endTime: string): string {
  const a = minutesOf(startTime);
  const b = minutesOf(endTime);
  if (a === null || b === null) return '';
  const total = b >= a ? b - a : b + 24 * 60 - a;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} minutos`;
  if (m === 0) return h === 1 ? '1 hora' : `${h} horas`;
  return `${h} h ${m} min`;
}

function spanishDate(dateIso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!m) return '';
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${Number(m[3])} de ${meses[Number(m[2]) - 1]} de ${m[1]}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** El piloto efectivo: el operador si has marcado que eres tú. */
function effectivePilot(ctx: InteriorContext) {
  const { pilot, operator } = ctx;
  if (!pilot.sameAsOperator) return pilot;
  return {
    ...pilot,
    name: operator.name,
    dni: operator.dni,
    address: operator.address,
    postalCode: operator.postalCode,
    municipality: operator.municipality,
    province: operator.province,
  };
}

/* ------------------------------------------------------------------ */
/* Relleno                                                              */
/* ------------------------------------------------------------------ */

/**
 * Traduce todo lo anterior a casillas del impreso.
 *
 * Las que se queden vacías se quedan vacías a propósito: es preferible un
 * hueco en blanco, que el declarante ve y rellena a mano, que un dato inventado
 * en un documento dirigido a la Administración.
 */
export function buildInteriorFields(ctx: InteriorContext): Record<string, string> {
  const { operator, drone, result, operation, now } = ctx;
  const pilot = effectivePilot(ctx);
  const { lat, lon } = result.coords;

  const fechaComunicacion = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const horaComunicacion = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const provinciaPunto = matchProvince(ctx.province) ?? '';
  const lugar = [ctx.place, provinciaPunto].filter(Boolean).join(', ');

  // La altura se da sobre el terreno, que es como la mide el impreso y como la
  // mide la app. Si hay elevación, se añade sobre el nivel del mar entre
  // paréntesis: quien lea la solicitud puede necesitarla.
  const alturaAgl = Math.round(result.flightHeightAgl);
  const altura =
    result.terrainElevation === null
      ? `${alturaAgl} m sobre el terreno`
      : `${alturaAgl} m sobre el terreno (terreno a ${Math.round(result.terrainElevation)} m; ` +
        `${Math.round(result.terrainElevation + alturaAgl)} m AMSL)`;

  const profile = drone ? getDroneProfile(drone.profile, 'es') : null;
  const mtom = drone?.weightGrams ? `${drone.weightGrams} g` : '';

  const values: Record<string, string> = {
    // Fecha y hora de la comunicación: van repetidas en las cuatro páginas.
    [FIELDS.comunicacionFecha1]: fechaComunicacion,
    [FIELDS.comunicacionFecha2]: fechaComunicacion,
    [FIELDS.comunicacionFecha3]: fechaComunicacion,
    [FIELDS.comunicacionFecha4]: fechaComunicacion,
    [FIELDS.comunicacionHora1]: horaComunicacion,
    [FIELDS.comunicacionHora2]: horaComunicacion,
    [FIELDS.comunicacionHora3]: horaComunicacion,
    [FIELDS.comunicacionHora4]: horaComunicacion,

    // Operador
    [FIELDS.operadorNombre]: operator.name,
    [FIELDS.operadorDni]: operator.dni,
    [FIELDS.operadorDomicilio]: operator.address,
    [FIELDS.operadorCp]: operator.postalCode,
    [FIELDS.operadorMunicipio]: operator.municipality,
    [FIELDS.operadorProvincia]: matchProvince(operator.province) ?? '',
    [FIELDS.operadorTelefono]: operator.phone,
    [FIELDS.operadorCorreo]: operator.email,
    [FIELDS.operadorRegistro]: operator.uasNumber,
    // Medio preferente: correo electrónico, que es el que se aporta.
    [FIELDS.notificacionPorCorreo]: operator.email ? 'X' : '',

    // Piloto
    [FIELDS.pilotoNombre]: pilot.name,
    [FIELDS.pilotoDni]: pilot.dni,
    [FIELDS.pilotoDomicilio]: pilot.address,
    [FIELDS.pilotoCp]: pilot.postalCode,
    [FIELDS.pilotoMunicipio]: pilot.municipality,
    [FIELDS.pilotoProvincia]: matchProvince(pilot.province) ?? '',
    [FIELDS.pilotoCertificado]: pilot.competence,
    [FIELDS.pilotoFormacion]: pilot.training,
    [FIELDS.seguro]: pilot.insurance,

    // Operación
    [FIELDS.operacionTipo]: operation.activity,
    [FIELDS.operacionFecha]: spanishDate(operation.date),
    [FIELDS.operacionLugar]: lugar,
    [FIELDS.operacionInicio]: operation.startTime,
    [FIELDS.operacionFin]: operation.endTime,
    [FIELDS.operacionDuracion]: durationLabel(operation.startTime, operation.endTime),

    // Delimitación del lugar
    [FIELDS.zonaPoblacion]: operation.groundReference || ctx.place || '',
    [FIELDS.wgs84]: toDms(lat, lon),
    [FIELDS.radio]: operation.radiusM,
    [FIELDS.ruta]: operation.route,
    [FIELDS.areaProteccion]: operation.takeoffArea,
    [FIELDS.zonaRecuperacion]: operation.recoveryArea,
    [FIELDS.alturaPrevista]: altura,

    // Aeronave
    [FIELDS.claseUas]: profile ? profile.label : '',
    [FIELDS.fabricante]: drone?.manufacturer ?? '',
    [FIELDS.modelo]: drone ? droneOfficialModel(drone) : '',
    [FIELDS.numeroSerie]: drone?.serial ?? '',
    [FIELDS.matricula]: drone?.registration ?? '',
    [FIELDS.mtom]: mtom,
    [FIELDS.autonomia]: drone?.autonomy ?? '',
    [FIELDS.autopiloto]: drone?.autopilot ?? '',
    [FIELDS.frecuencias]: drone?.frequencies ?? '',
    [FIELDS.color]: drone?.color ?? '',
    [FIELDS.luces]: drone?.lights ?? '',
    [FIELDS.cargaPago]: drone?.payload ?? '',
    [FIELDS.vhf]: drone?.vhf ?? '',
    [FIELDS.modoS]: drone?.modeS ?? '',
    [FIELDS.emergencia]: drone?.emergency ?? '',
    [FIELDS.visionDelante]: drone?.forwardVision ?? '',

    // Firma
    [FIELDS.lugarYFecha]: [operator.municipality, spanishDate(
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    )].filter(Boolean).join(', '),
    [FIELDS.nombreYCargo]: operator.name,
    // La firma se deja en blanco a propósito: se firma a mano o con la
    // aplicación de firma que use cada uno. Aquí no se falsifica una rúbrica.
  };

  return values;
}

/* ------------------------------------------------------------------ */
/* Qué falta                                                            */
/* ------------------------------------------------------------------ */

export interface MissingField {
  /** Dónde se arregla: en el perfil, en la ficha del dron o aquí mismo. */
  where: 'operador' | 'piloto' | 'dron' | 'operacion';
  label: string;
}

/**
 * Lo que falta para que el impreso salga completo.
 *
 * No bloquea: se puede generar con huecos y rellenarlos a mano. Pero conviene
 * decirlo antes, no después de mandarlo.
 */
export function missingInteriorFields(ctx: InteriorContext): MissingField[] {
  const out: MissingField[] = [];
  const add = (where: MissingField['where'], label: string) => out.push({ where, label });

  const { operator, drone, operation } = ctx;
  const pilot = effectivePilot(ctx);

  if (!operator.name.trim()) add('operador', 'Nombre o razón social');
  if (!operator.dni.trim()) add('operador', 'DNI / NIF / NIE / CIF');
  if (!operator.address.trim()) add('operador', 'Domicilio');
  if (!operator.postalCode.trim()) add('operador', 'Código postal');
  if (!operator.municipality.trim()) add('operador', 'Municipio');
  if (!matchProvince(operator.province)) add('operador', 'Provincia');
  if (!operator.phone.trim()) add('operador', 'Teléfono');
  if (!operator.email.trim()) add('operador', 'Correo electrónico');
  if (!operator.uasNumber.trim()) add('operador', 'Número de registro de operador');

  if (!pilot.name.trim()) add('piloto', 'Nombre del piloto');
  if (!pilot.dni.trim()) add('piloto', 'DNI del piloto');
  if (!pilot.competence.trim()) add('piloto', 'Certificado de competencia');
  if (!pilot.insurance.trim()) add('piloto', 'Póliza de seguros');

  if (!drone) add('dron', 'Ningún dron seleccionado');
  else {
    if (!droneOfficialModel(drone)) add('dron', 'Fabricante y modelo');
    if (!drone.serial.trim()) add('dron', 'Número de serie');
    if (!drone.weightGrams) add('dron', 'MTOM (peso al despegue)');
  }

  if (!operation.activity.trim()) add('operacion', 'Tipo de operación');
  if (noticeDays(operation.date, ctx.now) === null) add('operacion', 'Fecha del vuelo');
  if (!minutesOf(operation.startTime)) add('operacion', 'Hora de inicio');
  if (!minutesOf(operation.endTime)) add('operacion', 'Hora de finalización');
  if (!operation.radiusM.trim()) add('operacion', 'Radio de vuelo');
  if (!(operation.groundReference.trim() || ctx.place)) {
    add('operacion', 'Delimitación por calles y números');
  }

  return out;
}
