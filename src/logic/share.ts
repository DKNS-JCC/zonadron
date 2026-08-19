import type { FlightLogEntry } from '../state/FlightLogContext';
import type { QueryResult } from '../types';
import { verdictLevelLabel, zoneTypeLabel } from './labels';

/**
 * Texto plano para compartir un resultado (WhatsApp, correo, la solicitud de
 * autorización…). Se incluye siempre la hora y la fuente: quien lo reciba tiene
 * que poder saber de cuándo es el dato y de dónde sale.
 */
export function buildShareText(result: QueryResult, place?: string | null): string {
  const { coords, verdict, flightHeightAgl } = result;
  const lines: string[] = [];

  lines.push(`${verdict.headline.toUpperCase()} — ${place ?? 'punto consultado'}`);
  lines.push('');
  lines.push(verdict.summary);
  lines.push('');
  lines.push(`Coordenadas: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`);
  lines.push(`Altura de vuelo prevista: ${flightHeightAgl} m sobre el terreno`);
  if (result.terrainElevation !== null) {
    lines.push(`Elevación del terreno: ${Math.round(result.terrainElevation)} m sobre el nivel del mar`);
  }

  if (verdict.affecting.length > 0) {
    lines.push('');
    lines.push(`Zonas que afectan (${verdict.affecting.length}):`);
    for (const z of verdict.affecting) {
      const contact = [z.contact.name, z.contact.email, z.contact.phone].filter(Boolean).join(' · ');
      lines.push(`• ${z.title} [${z.identifier}] — ${zoneTypeLabel[z.type]}${contact ? ` — ${contact}` : ''}`);
    }
  }

  lines.push('');
  lines.push(
    `Consultado el ${new Date(result.queriedAt).toLocaleString('es-ES')} a las Zonas Geográficas UAS de ENAIRE.`,
  );
  lines.push('Comprueba siempre la fuente oficial antes de volar: https://drones.enaire.es/');

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
  const lines: string[] = [`Diario de vuelos — ${entries.length} vuelo(s) registrados`, ''];

  for (const e of entries) {
    const when = new Date(e.loggedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    lines.push(`${when} — ${e.label ?? `${e.lat.toFixed(5)}, ${e.lon.toFixed(5)}`}`);
    lines.push(
      `  ${verdictLevelLabel[e.verdictLevel]} (${e.verdictHeadline}) · ${e.heightAgl} m · ${e.droneLabel}`,
    );
    lines.push(`  Coordenadas: ${e.lat.toFixed(5)}, ${e.lon.toFixed(5)}`);
    lines.push('');
  }

  lines.push('Generado con Zona Dron. Registro personal, no sustituye a ningún libro de vuelo oficial.');
  return lines.join('\n');
}
