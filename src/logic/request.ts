import type { EvaluatedZone, QueryResult } from '../types';
import type { OperatorProfile } from '../state/SettingsContext';
import { getDroneProfile, type DroneProfileId } from './drone';

/**
 * Solicitud de autorización / coordinación, lista para enviar por correo.
 *
 * Se construye con los datos que ENAIRE publica de la zona y con los tuyos, que
 * viven sólo en el móvil. La app NO envía nada: abre tu aplicación de correo con
 * el mensaje redactado para que lo revises y lo mandes tú.
 */

function line(label: string, value: string | undefined | null, fallback = '[COMPLETAR]') {
  const v = (value ?? '').trim();
  return `${label}: ${v.length > 0 ? v : fallback}`;
}

export interface RequestContext {
  result: QueryResult;
  place?: string | null;
  operator: OperatorProfile;
  drone: DroneProfileId;
}

export function buildRequestSubject(zone: EvaluatedZone): string {
  return `Solicitud de autorización para operación UAS — ${zone.title} (${zone.identifier})`;
}

export function buildRequestBody(zone: EvaluatedZone, ctx: RequestContext): string {
  const { result, place, operator, drone } = ctx;
  const profile = getDroneProfile(drone);
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
    line('Modelo', operator.droneModel),
    line('Número de serie', operator.droneSerial),
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

/** Qué falta por rellenar en Ajustes para que la solicitud salga completa. */
export function missingOperatorFields(operator: OperatorProfile): string[] {
  const missing: string[] = [];
  if (!operator.name.trim()) missing.push('tu nombre');
  if (!operator.uasNumber.trim()) missing.push('tu número de operador UAS');
  if (!operator.email.trim()) missing.push('tu correo');
  if (!operator.phone.trim()) missing.push('tu teléfono');
  if (!operator.droneModel.trim()) missing.push('el modelo del dron');
  return missing;
}
