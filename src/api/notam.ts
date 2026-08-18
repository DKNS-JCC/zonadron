/**
 * NOTAM (Notice to Air Missions) que afectan a drones.
 *
 * Un NOTAM es un aviso temporal a los que vuelan: hoy hay ejercicios militares
 * aquí, esta semana hay un espectáculo aéreo allá, este fin de semana está
 * activa una zona restringida para paracaidismo. Son restricciones que NO
 * aparecen en el mapa de zonas geográficas porque no son permanentes, y son
 * justo las que te pillan por sorpresa.
 *
 * ENAIRE los publica en un servicio propio para UAS, público y sin clave:
 * DINAMIC/UAS_NOTAM_SRV_DATA_V1
 *
 * Sobre el horario (item D): viene como texto libre («MON-FRI 0600-1400»,
 * «SEP 03-05 16-18 0600-2200»…). NO se interpreta: se muestra tal cual y se
 * avisa de que hay que leerlo. Fingir que se entiende sería justo el tipo de
 * error que esta app no se puede permitir.
 */

export const NOTAM_SERVICE =
  'https://servais.enaire.es/insigniads/rest/services/DINAMIC/UAS_NOTAM_SRV_DATA_V1/MapServer/1';

const FT_TO_M = 0.3048;

export interface Notam {
  id: string;
  /** Inicio de validez (epoch ms). */
  from: number | null;
  to: number | null;
  fromLabel: string;
  toLabel: string;
  /** Horario en texto libre, tal y como lo publica ENAIRE. */
  schedule: string;
  /** Texto del aviso (item E), en inglés aeronáutico. */
  text: string;
  /** Franja de alturas en texto ("GND / 00120M AGL"). */
  levels: string;
  lowerM: number | null;
  upperM: number | null;
  qcode: string;
  /** true si está dentro de su periodo de validez ahora mismo. */
  activeNow: boolean;
}

function clean(v: unknown): string {
  const s = String(v ?? '').trim();
  return s === 'null' || s === 'undefined' ? '' : s;
}

function toMs(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ftToM(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * FT_TO_M) : null;
}

export async function getNotamsAt(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  now: number = Date.now(),
): Promise<Notam[]> {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields:
      'notamId,itemB,itemC,itemBstr,itemCstr,itemD,itemE,FLYING_LEVELS_DESC,LOWER_VAL,UPPER_VAL,qcode',
    returnGeometry: 'false',
    f: 'json',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(`${NOTAM_SERVICE}/query?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.trim().startsWith('<')) throw new Error('El servicio de NOTAM ha rechazado la petición');
    const json = JSON.parse(text);
    if (json?.error) throw new Error(json.error?.message ?? 'Error del servicio de NOTAM');

    const notams: Notam[] = (json.features ?? []).map((f: any) => {
      const a = f.attributes ?? {};
      const from = toMs(a.itemB);
      const to = toMs(a.itemC);
      return {
        id: clean(a.notamId) || '—',
        from,
        to,
        fromLabel: clean(a.itemBstr),
        toLabel: clean(a.itemCstr),
        schedule: clean(a.itemD),
        text: clean(a.itemE).replace(/\s+/g, ' '),
        levels: clean(a.FLYING_LEVELS_DESC),
        lowerM: ftToM(a.LOWER_VAL),
        upperM: ftToM(a.UPPER_VAL),
        qcode: clean(a.qcode),
        activeNow: (from === null || from <= now) && (to === null || to >= now),
      };
    });

    // Los caducados no interesan; los futuros sí, para que no te pillen.
    return notams
      .filter((n) => n.to === null || n.to >= now)
      .sort((a, b) => Number(b.activeNow) - Number(a.activeNow) || (a.from ?? 0) - (b.from ?? 0));
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
