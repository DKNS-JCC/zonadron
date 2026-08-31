/**
 * Los datos de la operación: lo único que la app no puede saber sola.
 *
 * Hasta ahora la solicitud salía a medio escribir, con `[COMPLETAR]` donde
 * hacía falta una fecha o una hora, y el piloto los rellenaba a mano dentro
 * del cliente de correo. Eso tenía tres consecuencias, todas vistas en un
 * correo real a una dependencia militar:
 *
 *  - se mandó una solicitud para volar el mismo día, cuando ningún gestor
 *    coordina con esa antelación;
 *  - la altura se escribió en prosa («los metros que me permitan»), así que la
 *    altitud equivalente se quedó con una X dentro;
 *  - no se adjuntó ningún papel, y lo primero que contestaron fue que
 *    mandara el certificado de registro de operador.
 *
 * Este módulo es el modelo de esos datos y las cuentas que se hacen con ellos.
 * No dibuja nada y no toca red ni almacenamiento: se puede probar entero sin
 * móvil, que es la misma regla que sigue el resto de `logic/`.
 *
 * Ojo con las horas: la aviación trabaja en UTC y Planea NO admite otra cosa,
 * pero un piloto piensa en la hora del reloj que lleva encima. Aquí se guarda
 * siempre la hora local y se convierte a UTC al vuelo, usando la zona horaria
 * del propio móvil — que es la buena tanto en la península como en Canarias,
 * y que además se ajusta sola en los cambios de hora.
 */

import { t } from '../i18n';
import type { Zone } from '../types';

/** Dentro o fuera del alcance visual. En categoría abierta, siempre VLOS. */
export type FlightMode = 'VLOS' | 'BVLOS';

/** De día o de noche: cambia las medidas que exige el gestor (luces). */
export type Daylight = 'DIURNO' | 'NOCTURNO';

/**
 * Para qué vuelas. Es una lista cerrada a propósito: el gestor lee cientos de
 * solicitudes y «fotografía y vídeo aéreo» le dice más que un campo libre en
 * el que cada uno escribe una cosa. Queda `otro` para lo que no encaje.
 */
export type PurposeId =
  | 'foto'
  | 'video'
  | 'inspeccion'
  | 'cartografia'
  | 'recreativo'
  | 'formacion'
  | 'emergencia'
  | 'otro';

export const PURPOSE_IDS: PurposeId[] = [
  'foto',
  'video',
  'inspeccion',
  'cartografia',
  'recreativo',
  'formacion',
  'emergencia',
  'otro',
];

export function purposeLabel(id: PurposeId): string {
  switch (id) {
    case 'foto':
      return t('operation.purpose.foto');
    case 'video':
      return t('operation.purpose.video');
    case 'inspeccion':
      return t('operation.purpose.inspeccion');
    case 'cartografia':
      return t('operation.purpose.cartografia');
    case 'recreativo':
      return t('operation.purpose.recreativo');
    case 'formacion':
      return t('operation.purpose.formacion');
    case 'emergencia':
      return t('operation.purpose.emergencia');
    default:
      return t('operation.purpose.otro');
  }
}

export interface OperationDetails {
  /** Fecha del vuelo en AAAA-MM-DD. Cadena vacía si aún no se ha elegido. */
  date: string;
  /** Hora local de inicio, HH:MM. */
  startTime: string;
  /** Hora local de fin, HH:MM. */
  endTime: string;
  /** Altura máxima prevista, en metros sobre el terreno. */
  heightAgl: number;
  /** Radio de la zona de trabajo alrededor del punto, en metros. */
  radiusM: number;
  mode: FlightMode;
  daylight: Daylight;
  purpose: PurposeId;
  /** Detalle del objeto del vuelo; obligatorio cuando `purpose` es `otro`. */
  purposeDetail: string;
  /** Dron de la flota con el que se vuela. null mientras no se elija. */
  droneId: string | null;
  /** Documentos de la carpeta que se van a adjuntar, por id. */
  attachments: string[];
  /** Lo que el piloto quiera añadir por su cuenta. */
  notes: string;
}

/**
 * Una operación en blanco, con lo que ya sabe la app puesto.
 *
 * La fecha se deja vacía a propósito: poner «hoy» por defecto es exactamente
 * el error que queremos evitar. Que la elija quien la conoce.
 */
export function emptyOperation(heightAgl: number, droneId: string | null): OperationDetails {
  return {
    date: '',
    startTime: '',
    endTime: '',
    heightAgl,
    radiusM: 100,
    mode: 'VLOS',
    daylight: 'DIURNO',
    purpose: 'foto',
    purposeDetail: '',
    droneId,
    attachments: [],
    notes: '',
  };
}

/* ------------------------------------------------------------------ */
/* Fechas y horas                                                      */
/* ------------------------------------------------------------------ */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

/** AAAA-MM-DD → [año, mes, día], o null si esa fecha no existe. */
function parseDate(value: string): [number, number, number] | null {
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(y, mo - 1, d);
  // El 31 de febrero se convertiría solo en el 3 de marzo: eso no es una fecha.
  if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 || probe.getDate() !== d) return null;
  return [y, mo, d];
}

/** HH:MM → minutos desde medianoche, o null si no es una hora. */
export function parseTime(value: string): number | null {
  const m = TIME_RE.exec(value.trim());
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2])];
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Fecha y hora locales de la operación como `Date`. null si faltan datos. */
export function localDateTime(dateIso: string, time: string): Date | null {
  const date = parseDate(dateIso);
  const minutes = parseTime(time);
  if (!date || minutes === null) return null;
  const [y, mo, d] = date;
  return new Date(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

/**
 * La misma hora, expresada en UTC. Es lo que hay que escribir en Planea y lo
 * que entiende una dependencia ATS; el desfase lo pone la zona horaria del
 * móvil, así que sale bien en Canarias y en los cambios de hora sin tener que
 * saberse ninguna regla.
 */
export function toUtcLabel(dateIso: string, time: string): string | null {
  const local = localDateTime(dateIso, time);
  if (!local) return null;
  return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}Z`;
}

/** «18:00–20:00 (16:00Z–18:00Z)». null si no están las dos horas. */
export function timeRangeLabel(op: OperationDetails): string | null {
  const start = toUtcLabel(op.date, op.startTime);
  const end = toUtcLabel(op.date, op.endTime);
  if (!start || !end) return null;
  return `${op.startTime}–${op.endTime} (${start}–${end})`;
}

/**
 * Duración en minutos. Si la hora de fin es menor que la de inicio se entiende
 * que el vuelo cruza la medianoche, que en operaciones nocturnas pasa.
 */
export function durationMinutes(op: OperationDetails): number | null {
  const from = parseTime(op.startTime);
  const to = parseTime(op.endTime);
  if (from === null || to === null) return null;
  return to >= from ? to - from : 24 * 60 - from + to;
}

export function durationLabel(op: OperationDetails): string | null {
  const total = durationMinutes(op);
  if (total === null) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return t('operation.duration.minutes', m);
  if (m === 0) return t('operation.duration.hours', h);
  return t('operation.duration.hoursMinutes', h, m);
}

/**
 * Días hábiles que quedan hasta la fecha del vuelo, sin contar hoy.
 *
 * Sólo descuenta sábados y domingos: la app NO conoce los festivos nacionales
 * ni los locales, y fingir que sí llevaría a decir «llegas justo» cuando en
 * realidad no llegas. Por eso el aviso que se construye con esto se redacta
 * siempre como un mínimo, nunca como una garantía.
 */
export function workingDaysUntil(dateIso: string, from: Date = new Date()): number | null {
  const target = parseDate(dateIso);
  if (!target) return null;
  const [y, mo, d] = target;
  const end = new Date(y, mo - 1, d);
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (end <= cursor) return 0;
  let days = 0;
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

/* ------------------------------------------------------------------ */
/* Antelación exigida                                                  */
/* ------------------------------------------------------------------ */

/**
 * Antelación mínima por defecto, en días hábiles.
 *
 * Diez es lo que publica ENAIRE para las solicitudes de coordinación a través
 * de Planea, y su guía de buenas prácticas recomienda además dejar tres o
 * cuatro días de margen por si la meteorología obliga a mover el vuelo. Los
 * demás gestores publican la suya, y cuando ENAIRE la trae en el dato de la
 * zona (`intervalBefore`) manda esa.
 */
export const DEFAULT_LEAD_WORKING_DAYS = 10;

/**
 * Horas de antelación que ENAIRE publica para una zona, si publica alguna.
 *
 * El campo viene en duración ISO-8601 (`PT48H`, `PT72H`, `P5D`, `P7D`) y sólo
 * lo trae una minoría de zonas, casi todas helipuertos — que son justamente
 * las que uno se encuentra dentro de una ciudad sin esperarlo. Algún valor
 * llega sucio (`;PT72H`), así que se limpia antes de mirarlo.
 */
export function parseLeadHours(interval: string | undefined | null): number | null {
  const raw = (interval ?? '').trim().replace(/^[;,\s]+/, '');
  if (!raw) return null;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(raw.toUpperCase());
  if (!m) return null;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const minutes = Number(m[3] ?? 0);
  const total = days * 24 + hours + minutes / 60;
  return total > 0 ? total : null;
}

/** La antelación más exigente de todas las zonas que te afectan. */
export function requiredLeadHours(zones: Zone[]): number | null {
  let worst: number | null = null;
  for (const zone of zones) {
    const hours = parseLeadHours(zone.leadInterval);
    if (hours !== null && (worst === null || hours > worst)) worst = hours;
  }
  return worst;
}

export interface LeadTimeCheck {
  /** true si la fecha elegida llega con la antelación que se pide. */
  ok: boolean;
  /** Aviso ya redactado, o null cuando no hay nada que decir. */
  warning: string | null;
}

/**
 * ¿Llega esta fecha? Se contesta con lo que publique la zona si publica algo,
 * y si no con los diez días hábiles de ENAIRE.
 */
export function checkLeadTime(
  op: OperationDetails,
  zones: Zone[],
  now: Date = new Date(),
): LeadTimeCheck {
  if (!op.date) return { ok: true, warning: null };
  const published = requiredLeadHours(zones);

  if (published !== null) {
    const start = localDateTime(op.date, op.startTime || '00:00');
    if (!start) return { ok: true, warning: null };
    const hours = (start.getTime() - now.getTime()) / 3_600_000;
    if (hours >= published) return { ok: true, warning: null };
    return { ok: false, warning: t('operation.lead.published', Math.round(published)) };
  }

  const days = workingDaysUntil(op.date, now);
  if (days === null || days >= DEFAULT_LEAD_WORKING_DAYS) return { ok: true, warning: null };
  return { ok: false, warning: t('operation.lead.default', DEFAULT_LEAD_WORKING_DAYS, days) };
}

/* ------------------------------------------------------------------ */
/* Qué falta                                                           */
/* ------------------------------------------------------------------ */

/**
 * Lo que hay que rellenar antes de que la solicitud tenga sentido.
 *
 * Devuelve texto para enseñar, no códigos: quien llama lo pinta tal cual.
 */
export function missingOperationFields(op: OperationDetails): string[] {
  const missing: string[] = [];
  if (!parseDate(op.date)) missing.push(t('operation.missing.date'));
  if (parseTime(op.startTime) === null) missing.push(t('operation.missing.startTime'));
  if (parseTime(op.endTime) === null) missing.push(t('operation.missing.endTime'));
  if (!(op.heightAgl > 0)) missing.push(t('operation.missing.height'));
  if (op.purpose === 'otro' && !op.purposeDetail.trim()) {
    missing.push(t('operation.missing.purposeDetail'));
  }
  if (!op.droneId) missing.push(t('operation.missing.drone'));
  return missing;
}

/** true cuando la operación está completa y se puede generar el documento. */
export function operationReady(op: OperationDetails): boolean {
  return missingOperationFields(op).length === 0;
}
