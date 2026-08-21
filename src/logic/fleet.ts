/**
 * Tu flota: los drones que tienes, con su ficha.
 *
 * Nadie vuela un solo dron para siempre — se empieza con uno ligero, luego
 * llega el bueno, y el viejo se queda para practicar. La app tiene que poder
 * con todos: cada uno con su modelo, su número de serie y su clase, porque es
 * lo que hay que poner en una solicitud de autorización y lo que decide qué
 * reglas te aplican.
 *
 * Este módulo es sólo el modelo y sus reglas; guardarlo es cosa de
 * `src/state/FleetContext.tsx`. Aquí no se toca ni almacenamiento ni React,
 * para que se pueda probar sin montar nada.
 *
 * La clase (`profile`) usa los mismos identificadores que `drone.ts`: es la
 * subcategoría de la categoría abierta, no una etiqueta nueva. Un dron sin
 * clase marcada cuenta como 'otro', que es el perfil más conservador.
 */

import { t } from '../i18n';
import { getDroneProfile, type DroneProfileId } from './drone';
import { newId } from './id';

const VALID_PROFILES: DroneProfileId[] = ['sub250', 'c1', 'c2', 'c3c4', 'otro'];

export interface FleetDrone {
  id: string;
  /** Cómo lo llamas tú: «el Mini de la mochila». Opcional. */
  alias: string;
  manufacturer: string;
  model: string;
  /** Número de serie del aparato. Lo piden en casi todas las solicitudes. */
  serial: string;
  /** Clase / subcategoría con la que operas este dron. */
  profile: DroneProfileId;
  /** Peso al despegue en gramos. null = no lo has puesto. */
  weightGrams: number | null;
  notes: string;
  addedAt: string;
}

export function emptyDrone(): FleetDrone {
  return {
    id: newId(),
    alias: '',
    manufacturer: '',
    model: '',
    serial: '',
    profile: 'sub250',
    weightGrams: null,
    notes: '',
    addedAt: new Date().toISOString(),
  };
}

/**
 * Nombre con el que sale en las listas: el alias si lo has puesto, y si no la
 * marca y el modelo. Un dron a medio rellenar sigue teniendo que poder
 * distinguirse del de al lado, así que nunca se devuelve cadena vacía.
 */
export function droneName(d: FleetDrone): string {
  const alias = d.alias.trim();
  if (alias) return alias;
  const made = [d.manufacturer.trim(), d.model.trim()].filter(Boolean).join(' ');
  return made || t('fleet.unnamed');
}

/**
 * Modelo tal y como debe ir en una solicitud: marca y modelo, sin el alias
 * (a un ayuntamiento no le dice nada que lo llames «el pequeño»).
 */
export function droneOfficialModel(d: FleetDrone): string {
  const made = [d.manufacturer.trim(), d.model.trim()].filter(Boolean).join(' ');
  return made || d.alias.trim();
}

/** Segunda línea de la ficha: clase y serie, lo que de verdad identifica. */
export function droneSubtitle(d: FleetDrone): string {
  const profile = getDroneProfile(d.profile);
  const parts = [profile.label];
  const serial = d.serial.trim();
  if (serial) parts.push(t('fleet.serialShort', serial));
  return parts.join(' · ');
}

/** Qué le falta a este dron para que una solicitud salga completa. */
export function missingDroneFields(d: FleetDrone | null): string[] {
  if (!d) return [t('fleet.missing.drone')];
  const missing: string[] = [];
  if (!droneOfficialModel(d)) missing.push(t('fleet.missing.model'));
  if (!d.serial.trim()) missing.push(t('fleet.missing.serial'));
  return missing;
}

/**
 * Un dron leído de disco. Lo guardado puede venir de una versión anterior o
 * estar a medias, así que todo campo que falte se rellena con algo válido en
 * lugar de dejar que reviente una pantalla entera.
 */
export function normaliseDrone(raw: unknown): FleetDrone | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' && r.id ? r.id : newId();
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  const weight = Number(r.weightGrams);
  return {
    id,
    alias: text(r.alias),
    manufacturer: text(r.manufacturer),
    model: text(r.model),
    serial: text(r.serial),
    profile: VALID_PROFILES.includes(r.profile as DroneProfileId)
      ? (r.profile as DroneProfileId)
      : 'otro',
    weightGrams: Number.isFinite(weight) && weight > 0 ? Math.round(weight) : null,
    notes: text(r.notes),
    addedAt: typeof r.addedAt === 'string' ? r.addedAt : new Date().toISOString(),
  };
}

/**
 * Lo que había antes: un único modelo y una única serie sueltos en los
 * ajustes. Si estaban rellenos se convierten en el primer dron de la flota —
 * nadie tiene que volver a teclear lo que ya había escrito.
 */
export function droneFromLegacy(
  model: string,
  serial: string,
  profile: DroneProfileId,
): FleetDrone | null {
  if (!model.trim() && !serial.trim()) return null;
  return {
    ...emptyDrone(),
    model: model.trim(),
    serial: serial.trim(),
    profile,
  };
}
