/**
 * Con quién se coordina, y por dónde.
 *
 * El problema que resuelve este módulo se ve mejor con un ejemplo real. En el
 * CTR de Madrid, ENAIRE deja VACÍOS los campos estructurados `email`, `phone`
 * y `siteURL`, y publica el contacto sólo dentro del HTML del mensaje:
 *
 *   Contacto: <a href='https://planea.enaire.es/nsf/login'>ENAIRE Planea</a>
 *
 * Como `htmlToText` quita el marcado, la app se quedaba con las dos palabras
 * «ENAIRE Planea» y perdía el enlace. Resultado: en un CTR o en un ATZ no
 * había ningún botón, ninguna dirección y ninguna vía — justo en las zonas
 * donde más falta hace.
 *
 * Y no siempre es ENAIRE. Comprobado contra el servicio, la misma pantalla
 * puede tener que mandarte a cuatro sitios distintos:
 *
 *   CTR Valencia  → ENAIRE Planea
 *   ATZ Valencia  → Skyway            (uas@skyway-ans.com)
 *   ATZ Lanzarote → Saerco            (uas@saerco.com)
 *   Aeródromo     → Aena              (mad.ops.solicituddron@aena.es)
 *   Matacán       → Ministerio de Defensa (ctamatacan@ea.mde.es)
 *
 * Decir «pide permiso a ENAIRE» cuando el ATZ lo lleva Skyway es mandar al
 * piloto a la ventanilla equivocada, así que aquí no se supone nada: el gestor
 * sale del dato publicado, y si no se puede saber se dice que no se sabe.
 *
 * Este módulo es puro: entra una zona, sale a quién escribir. No abre correos
 * ni navegadores, que es cosa de la interfaz.
 */

import { htmlToText } from './html';
import { parseLeadHours } from './operation';
import type { Zone } from '../types';

/** Quién gestiona el trámite. Los nombres son propios y no se traducen. */
export type ManagerId =
  | 'enaire'
  | 'aena'
  | 'skyway'
  | 'saerco'
  | 'defensa'
  | 'cecaf'
  | 'adif'
  | 'otro';

const MANAGER_NAMES: Record<ManagerId, string> = {
  enaire: 'ENAIRE',
  aena: 'Aena',
  skyway: 'Skyway',
  saerco: 'Saerco',
  defensa: 'Ministerio de Defensa',
  cecaf: 'CECAF (Ejército del Aire)',
  adif: 'ADIF',
  otro: '',
};

export function managerName(id: ManagerId): string {
  return MANAGER_NAMES[id];
}

/**
 * Dominios que identifican al gestor sin lugar a dudas.
 *
 * Se mira el dominio y no el texto porque el texto cambia: ENAIRE escribe
 * «ENAIRE Planea», «Ministerio de Defensa» o nada en absoluto según la zona,
 * pero `uas@skyway-ans.com` sólo puede ser Skyway.
 */
const DOMAINS: Array<[RegExp, ManagerId]> = [
  [/(^|\.)enaire\.es$/i, 'enaire'],
  [/(^|\.)aena\.es$/i, 'aena'],
  [/(^|\.)skyway-ans\.com$/i, 'skyway'],
  [/(^|\.)saerco\.com$/i, 'saerco'],
  [/(^|\.)mde\.es$/i, 'defensa'],
  // Las zonas de protección del ferrocarril: no son espacio aéreo controlado,
  // pero salen en la misma consulta y también hay que pedirles permiso.
  [/(^|\.)adif\.es$/i, 'adif'],
];

/** La plataforma por la que ENAIRE tramita: no es un correo, es una web. */
export const PLANEA_URL = 'https://planea.enaire.es/';

/* ------------------------------------------------------------------ */
/* Extracción de contactos                                             */
/* ------------------------------------------------------------------ */

// Se busca sobre el HTML en crudo a propósito: así caen tanto los correos que
// están como texto (`Email: <font>uas@saerco.com</font>`) como los que están
// dentro de un enlace (`href="mailto: cecaf@ea.mde.es"`, con ese espacio que
// pone ENAIRE detrás de los dos puntos).
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Sólo números con prefijo internacional. Sin el `+` obligatorio, «1000ft AGL»
// y las alturas de la propia zona entrarían como si fueran teléfonos.
const PHONE_RE = /\+\d{1,3}[\d\s\-().]{6,}\d/g;

const HREF_RE = /href\s*=\s*["']([^"']+)["']/gi;

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
}

/** ENAIRE separa varios valores con punto y coma en un mismo campo. */
function splitField(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export interface ZoneContacts {
  emails: string[];
  phones: string[];
  /** Páginas a las que remite la zona: la plataforma, la web del gestor, un AIC. */
  urls: string[];
}

/**
 * Todo lo que la zona publica para contactar: primero los campos
 * estructurados, y luego lo que haya dentro del mensaje oficial.
 */
export function extractContacts(zone: Zone): ZoneContacts {
  const html = zone.officialHtml || '';

  const emails = dedupe([
    ...splitField(zone.contact.email),
    ...(html.match(EMAIL_RE) ?? []),
  ]);

  const phones = dedupe([
    ...splitField(zone.contact.phone),
    ...(htmlToText(html).match(PHONE_RE) ?? []).map((p) => p.trim()),
  ]);

  const urls: string[] = [];
  if (zone.contact.url) urls.push(zone.contact.url);
  for (const m of html.matchAll(HREF_RE)) {
    const href = m[1].trim();
    if (/^mailto:/i.test(href)) continue;
    if (/^https?:\/\//i.test(href)) urls.push(href);
  }

  return { emails, phones, urls: dedupe(urls) };
}

function hostOf(url: string): string {
  const m = /^https?:\/\/([^/:?#]+)/i.exec(url.trim());
  return m ? m[1].toLowerCase() : '';
}

function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at < 0 ? '' : email.slice(at + 1).toLowerCase();
}

function classify(contacts: ZoneContacts, officialText: string): ManagerId {
  for (const email of contacts.emails) {
    // CECAF tiene correo del Ministerio de Defensa pero no es la dependencia
    // ATS: es quien pone condiciones al vuelo fotográfico. Va antes que el
    // dominio genérico para no confundir los dos trámites.
    if (/^cecaf@/i.test(email)) return 'cecaf';
    const domain = domainOf(email);
    for (const [re, id] of DOMAINS) if (re.test(domain)) return id;
  }
  for (const url of contacts.urls) {
    const host = hostOf(url);
    // El enlace a la circular aeronáutica (AIC) es documentación, no gestor.
    if (host.startsWith('aip.')) continue;
    for (const [re, id] of DOMAINS) if (re.test(host)) return id;
  }
  // Último recurso: hay zonas —el ATZ y el CTR de Salamanca, por ejemplo— cuyo
  // único contacto publicado es el texto «Ministerio de Defensa», sin correo,
  // sin teléfono y sin enlace. Saber que es militar ya es mejor que nada.
  if (/ministerio de defensa|ejército del aire|base a[ée]rea/i.test(officialText)) return 'defensa';
  return 'otro';
}

/* ------------------------------------------------------------------ */
/* Orden de los trámites                                               */
/* ------------------------------------------------------------------ */

/**
 * Con quién se coordina primero cuando una misma posición cae en varias zonas.
 *
 * ENAIRE lo dice en su guía de buenas prácticas: «a la hora de coordinar zonas
 * en las que coinciden ATZ y CTR, se coordinará siempre con ATZ al ser el
 * espacio aéreo más afectado por la operación de UAS». Y la zona de aeródromo
 * del artículo 41 va antes todavía, porque ahí manda el gestor del aeródromo a
 * cualquier altura.
 *
 * Número más bajo, antes.
 */
export function coordinationPriority(zone: Zone): number {
  const c = zone.category.toLowerCase();
  if (c.startsWith('aer') || c.startsWith('helip') || c.includes('base militar')) return 1;
  if (c === 'atz') return 2;
  if (c === 'fiz') return 3;
  if (c === 'ctr') return 4;
  if (c === 'cta' || c === 'tma') return 5;
  return 6;
}

export interface Coordination {
  zone: Zone;
  manager: ManagerId;
  /** Nombre del gestor, o '' cuando no se ha podido deducir. */
  name: string;
  contacts: ZoneContacts;
  /**
   * true cuando el trámite se hace en una plataforma web y no por correo. Hoy
   * sólo ENAIRE: sus zonas remiten a Planea y mandarle un correo a una
   * dirección genérica es la forma más rápida de que no te contesten.
   */
  viaPlatform: boolean;
  /** A dónde ir cuando `viaPlatform`. */
  platformUrl: string | null;
  /** Antelación publicada por ENAIRE para esta zona, en horas. */
  leadHours: number | null;
}

/**
 * Cómo se tramita esta zona. null cuando no hay nada que tramitar: los avisos
 * generales y las zonas sin restricción no llevan a ninguna ventanilla.
 */
export function coordinationFor(zone: Zone): Coordination | null {
  if (zone.advisory || zone.type === 'NO_RESTRICTION') return null;

  const contacts = extractContacts(zone);
  const manager = classify(contacts, zone.officialText);
  const viaPlatform =
    manager === 'enaire' && contacts.urls.some((u) => hostOf(u).includes('planea'));

  return {
    zone,
    manager,
    name: managerName(manager),
    contacts,
    viaPlatform,
    platformUrl: viaPlatform ? PLANEA_URL : null,
    leadHours: parseLeadHours(zone.leadInterval),
  };
}

/** Los trámites de todas las zonas que te afectan, en el orden en que se hacen. */
export function coordinationsFor(zones: Zone[]): Coordination[] {
  return zones
    .map(coordinationFor)
    .filter((c): c is Coordination => c !== null)
    .sort((a, b) => coordinationPriority(a.zone) - coordinationPriority(b.zone));
}

/**
 * Destinatarios del correo, ya como los quiere un enlace `mailto:`.
 *
 * Ojo con la coma: ENAIRE separa las direcciones con punto y coma y el
 * `mailto:` de antes las pasaba tal cual, cuando el RFC 6068 manda coma. Unos
 * clientes lo perdonaban y otros abrían el correo con un único destinatario
 * imposible pegado con puntos y comas.
 */
export function mailRecipients(zone: Zone): string {
  return extractContacts(zone).emails.join(',');
}
