import { t } from '../i18n';
import type { EvaluatedZone, QueryResult } from '../types';
import type { OperatorProfile } from '../state/SettingsContext';
import { getDroneProfile, type DroneProfileId } from './drone';
import { droneOfficialModel, missingDroneFields, type FleetDrone } from './fleet';

/**
 * Solicitud de autorización / coordinación, lista para enviar por correo.
 *
 * Se construye con los datos que ENAIRE publica de la zona y con los tuyos, que
 * viven sólo en el móvil. La app NO envía nada: abre tu aplicación de correo con
 * el mensaje redactado para que lo revises y lo mandes tú.
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
}

export function buildRequestSubject(zone: EvaluatedZone): string {
  return `Solicitud de autorización para operación UAS — ${zone.title} (${zone.identifier})`;
}

export function buildRequestBody(zone: EvaluatedZone, ctx: RequestContext): string {
  const { result, place, operator, drone, aircraft } = ctx;
  // Etiqueta en español a propósito: forma parte del correo, no de la interfaz.
  const profile = getDroneProfile(drone, 'es');
  const { lat, lon } = result.coords;

  const amsl =
    result.terrainElevation !== null
      ? `${Math.round(result.terrainElevation + result.flightHeightAgl)} m AMSL (terreno a ${Math.round(result.terrainElevation)} m)`
      : 'no disponible';

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
    'Fecha y hora previstas: [COMPLETAR]',
    'Duración estimada: [COMPLETAR]',
    `Coordenadas del punto de despegue (WGS-84): ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    place ? `Emplazamiento: ${place}` : 'Emplazamiento: [COMPLETAR]',
    `Altura máxima prevista: ${result.flightHeightAgl} m sobre el terreno`,
    `Altitud máxima equivalente: ${amsl}`,
    'Tipo de vuelo: VLOS (dentro del alcance visual)',
    'Objeto del vuelo: [COMPLETAR]',
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

/** Enlace mailto completo para abrir la app de correo con todo redactado. */
export function buildMailto(zone: EvaluatedZone, ctx: RequestContext): string | null {
  const to = (zone.contact.email ?? '').trim();
  if (!to) return null;
  const subject = encodeURIComponent(buildRequestSubject(zone));
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

/** Todo lo que falta —tuyo y del dron— antes de mandar nada. */
export function missingRequestFields(
  operator: OperatorProfile,
  aircraft: FleetDrone | null,
): string[] {
  return [...missingOperatorFields(operator), ...missingDroneFields(aircraft)];
}
