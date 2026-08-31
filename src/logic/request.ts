import { t } from '../i18n';
import type { EvaluatedZone, QueryResult } from '../types';
import type { OperatorProfile } from '../state/SettingsContext';
import { getDroneProfile, type DroneProfileId } from './drone';
import { droneOfficialModel, missingDroneFields, type FleetDrone } from './fleet';
import { mailRecipients } from './coordination';
import {
  durationLabel,
  localDateTime,
  missingOperationFields,
  purposeLabel,
  timeRangeLabel,
  type OperationDetails,
} from './operation';

/**
 * Solicitud de autorización / coordinación, lista para enviar por correo.
 *
 * Se construye con los datos que ENAIRE publica de la zona, con los tuyos —que
 * viven sólo en el móvil— y con los de la operación, que los pregunta la
 * pantalla de solicitud antes de llegar aquí. La app NO envía nada: abre tu
 * aplicación de correo con el mensaje redactado para que lo revises y lo
 * mandes tú.
 *
 * Ya no quedan `[COMPLETAR]` en los datos de la operación. Los había, y el
 * resultado era un correo que se terminaba de escribir a mano dentro del
 * cliente de correo, con las prisas: una solicitud salió con la altura puesta
 * en prosa y con una X donde tenía que ir la altitud. Lo que la app no sabe se
 * pregunta antes, no se deja apuntado en el texto.
 *
 * OJO: el correo va SIEMPRE en español, aunque la interfaz esté en inglés. Lo
 * lee el gestor de la zona o AESA, no el piloto, y una solicitud en inglés a un
 * ayuntamiento español no ayuda a nadie. Por eso aquí no se usa `t()` salvo
 * para lo que sí se le enseña al piloto (`missingOperatorFields`).
 */

function line(label: string, value: string | undefined | null, fallback = '[COMPLETAR]') {
  const v = (value ?? '').trim();
  return `${label}: ${v.length > 0 ? v : fallback}`;
}

/** «sábado, 14 de septiembre de 2026». En español, como todo el correo. */
function longDate(dateIso: string): string | null {
  const d = localDateTime(dateIso, '12:00');
  if (!d) return null;
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export interface RequestContext {
  result: QueryResult;
  place?: string | null;
  operator: OperatorProfile;
  /** Clase con la que operas: la del dron activo, o la de los ajustes. */
  drone: DroneProfileId;
  /**
   * El dron concreto con el que vas a volar. De él salen el modelo y el número
   * de serie: quien tiene tres drones no manda tres solicitudes iguales.
   * null cuando todavía no hay ninguno guardado, y entonces los dos campos
   * salen como [COMPLETAR].
   */
  aircraft: FleetDrone | null;
  /** Cuándo, cuánto y para qué. Lo rellena la pantalla de solicitud. */
  operation: OperationDetails;
  /**
   * Títulos de los papeles que el piloto va a adjuntar. Se enumeran en el
   * cuerpo porque un adjunto sin mencionar es un adjunto que nadie abre, y
   * porque así el gestor ve de un vistazo si le falta alguno.
   */
  attachmentTitles?: string[];
}

export function buildRequestSubject(zone: EvaluatedZone, operation?: OperationDetails): string {
  const base = `Solicitud de autorización para operación UAS — ${zone.title} (${zone.identifier})`;
  const day = operation?.date ? localDateTime(operation.date, '12:00') : null;
  return day ? `${base} — ${day.toLocaleDateString('es-ES')}` : base;
}

export function buildRequestBody(zone: EvaluatedZone, ctx: RequestContext): string {
  const { result, place, operator, drone, aircraft, operation, attachmentTitles } = ctx;
  // Etiqueta en español a propósito: forma parte del correo, no de la interfaz.
  const profile = getDroneProfile(drone, 'es');
  const { lat, lon } = result.coords;

  const amsl =
    result.terrainElevation !== null
      ? `${Math.round(result.terrainElevation + operation.heightAgl)} m AMSL (terreno a ${Math.round(result.terrainElevation)} m)`
      : 'no disponible';

  const flightType =
    operation.mode === 'VLOS'
      ? 'VLOS (dentro del alcance visual)'
      : 'BVLOS (más allá del alcance visual)';
  const daylight = operation.daylight === 'DIURNO' ? 'diurna' : 'nocturna';

  const purpose =
    operation.purpose === 'otro'
      ? operation.purposeDetail.trim()
      : operation.purposeDetail.trim()
        ? `${purposeLabel(operation.purpose)} — ${operation.purposeDetail.trim()}`
        : purposeLabel(operation.purpose);

  const attachments = (attachmentTitles ?? []).filter((a) => a.trim().length > 0);

  return [
    'Buenos días,',
    '',
    `Le escribo para solicitar la autorización / coordinación necesaria para realizar una operación con aeronave no tripulada (UAS) dentro de la zona geográfica UAS "${zone.title}" (identificador ${zone.identifier}), publicada por ENAIRE.`,
    '',
    'DATOS DEL OPERADOR',
    line('Nombre o razón social', operator.name),
    line('Número de operador UAS (AESA)', operator.uasNumber),
    line('Correo de contacto', operator.email),
    line('Teléfono de contacto', operator.phone),
    '',
    'DATOS DE LA AERONAVE',
    line('Modelo', aircraft ? droneOfficialModel(aircraft) : ''),
    line('Número de serie', aircraft?.serial),
    `Categoría de la operación: abierta, subcategoría ${profile.subcategory} (${profile.label})`,
    '',
    'DATOS DE LA OPERACIÓN',
    line('Fecha prevista', longDate(operation.date)),
    line('Horario previsto (local y UTC)', timeRangeLabel(operation)),
    line('Duración estimada', durationLabel(operation)),
    `Coordenadas del punto de despegue (WGS-84): ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    line('Emplazamiento', place),
    `Radio de la zona de trabajo: ${operation.radiusM} m alrededor de ese punto`,
    `Altura máxima prevista: ${operation.heightAgl} m sobre el terreno`,
    `Altitud máxima equivalente: ${amsl}`,
    `Tipo de vuelo: ${flightType}, operación ${daylight}`,
    line('Objeto del vuelo', purpose),
    ...(operation.notes.trim() ? ['', 'OBSERVACIONES', operation.notes.trim()] : []),
    ...(attachments.length > 0
      ? ['', 'DOCUMENTACIÓN ADJUNTA', ...attachments.map((a) => `- ${a}`)]
      : []),
    '',
    'ZONA AFECTADA SEGÚN ENAIRE',
    zone.officialText.trim() || '(ENAIRE no publica texto descriptivo para esta zona.)',
    '',
    'Quedo a su disposición para ampliar cualquier información que necesiten.',
    '',
    'Un saludo,',
    operator.name.trim() || '[TU NOMBRE]',
    operator.phone.trim() ? operator.phone.trim() : '',
    '',
    `— Solicitud preparada con Zona Dron a partir de los datos publicados por ENAIRE el ${new Date(result.queriedAt).toLocaleString('es-ES')}.`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/**
 * Enlace mailto completo para abrir la app de correo con todo redactado.
 *
 * Los destinatarios ya no salen del campo estructurado: los resuelve
 * `coordination.ts`, que además los saca del mensaje oficial cuando ENAIRE no
 * los publica aparte —el caso de casi todos los CTR y ATZ— y los separa con
 * coma en vez de con el punto y coma que devuelve el servicio.
 */
export function buildMailto(zone: EvaluatedZone, ctx: RequestContext): string | null {
  const to = mailRecipients(zone);
  if (!to) return null;
  const subject = encodeURIComponent(buildRequestSubject(zone, ctx.operation));
  const body = encodeURIComponent(buildRequestBody(zone, ctx));
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

/**
 * Qué falta por rellenar en el perfil para que la solicitud salga completa.
 *
 * Los datos de la aeronave ya no viven aquí: los pone el dron activo, y de
 * ellos se encarga `missingDroneFields` en `fleet.ts`.
 */
export function missingOperatorFields(operator: OperatorProfile): string[] {
  const missing: string[] = [];
  if (!operator.name.trim()) missing.push(t('operator.missing.name'));
  if (!operator.uasNumber.trim()) missing.push(t('operator.missing.uasNumber'));
  if (!operator.email.trim()) missing.push(t('operator.missing.email'));
  if (!operator.phone.trim()) missing.push(t('operator.missing.phone'));
  return missing;
}

/**
 * Todo lo que falta —tuyo, del dron y del vuelo— antes de mandar nada.
 *
 * La operación es opcional aquí porque hay sitios que preguntan «¿tengo los
 * datos para pedir permiso?» antes de que exista ningún vuelo concreto, como
 * la propia tarjeta de la zona.
 */
export function missingRequestFields(
  operator: OperatorProfile,
  aircraft: FleetDrone | null,
  operation?: OperationDetails,
): string[] {
  return [
    ...missingOperatorFields(operator),
    ...missingDroneFields(aircraft),
    ...(operation ? missingOperationFields(operation) : []),
  ];
}
