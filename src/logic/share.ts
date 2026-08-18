import type { QueryResult } from '../types';
import { zoneTypeLabel } from './labels';

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
