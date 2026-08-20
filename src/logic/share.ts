import type { FlightLogEntry } from '../state/FlightLogContext';
import type { QueryResult } from '../types';
import { dateLocale, t } from '../i18n';
import { verdictLevelLabel, zoneTypeLabel } from './labels';

/**
 * Texto plano para compartir un resultado (WhatsApp, correo, la solicitud de
 * autorización…). Se incluye siempre la hora y la fuente: quien lo reciba tiene
 * que poder saber de cuándo es el dato y de dónde sale.
 */
export function buildShareText(result: QueryResult, place?: string | null): string {
  const { coords, verdict, flightHeightAgl } = result;
  const lines: string[] = [];

  lines.push(t('share.headline', verdict.headline.toUpperCase(), place ?? t('share.thisPoint')));
  lines.push('');
  lines.push(verdict.summary);
  lines.push('');
  lines.push(t('share.coords', coords.lat.toFixed(5), coords.lon.toFixed(5)));
  lines.push(t('share.height', flightHeightAgl));
  if (result.terrainElevation !== null) {
    lines.push(t('share.terrain', Math.round(result.terrainElevation)));
  }

  if (verdict.affecting.length > 0) {
    lines.push('');
    lines.push(t('share.zones', verdict.affecting.length));
    for (const z of verdict.affecting) {
      const contact = [z.contact.name, z.contact.email, z.contact.phone].filter(Boolean).join(' · ');
      lines.push(`• ${z.title} [${z.identifier}] — ${zoneTypeLabel(z.type)}${contact ? ` — ${contact}` : ''}`);
    }
  }

  lines.push('');
  lines.push(t('share.checkedAt', new Date(result.queriedAt).toLocaleString(dateLocale())));
  lines.push(t('share.checkSource'));

  return lines.join('\n');
}

/** Enlace al visor oficial centrado en el punto, para verificar el dato. */
export function enaireViewerUrl(lat: number, lon: number): string {
  return `https://drones.enaire.es/?lat=${lat.toFixed(6)}&lng=${lon.toFixed(6)}&zoom=14`;
}

/**
 * Navegación por carretera hasta el punto. Un enlace universal de Google Maps
 * en vez de un esquema propio (`comgooglemaps://`, `maps://`): esos hacen
 * falta declararlos en Info.plist para poder comprobarlos con `canOpenURL`, y
 * sin esa declaración `Linking.openURL` falla en silencio en iOS. El enlace
 * universal abre la app si está instalada y si no, el navegador — sin permisos
 * nuevos que pedir.
 */
export function drivingDirectionsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lon.toFixed(6)}&travelmode=driving`;
}

/** Diario de vuelos en texto plano, del más reciente al más antiguo. */
export function buildFlightLogText(entries: FlightLogEntry[]): string {
  const lines: string[] = [t('share.logTitle', entries.length), ''];

  for (const e of entries) {
    const when = new Date(e.loggedAt).toLocaleString(dateLocale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    lines.push(`${when} — ${e.label ?? `${e.lat.toFixed(5)}, ${e.lon.toFixed(5)}`}`);
    // El titular guardado se ignora a propósito: se escribió en el idioma que
    // hubiera entonces, y el nivel sí se puede volver a traducir ahora.
    lines.push(t('share.logEntry', verdictLevelLabel(e.verdictLevel), e.heightAgl, e.droneLabel));
    lines.push(t('share.logCoords', e.lat.toFixed(5), e.lon.toFixed(5)));
    lines.push('');
  }

  lines.push(t('share.logFooter'));
  return lines.join('\n');
}
