/**
 * Qué NOTAM pueden alcanzarte y cuáles pasan muy por encima.
 *
 * De los NOTAM que publica ENAIRE, nueve de cada diez empiezan en el suelo,
 * pero el resto arrancan a niveles de vuelo (FL070, 6000 ft AMSL…) donde un
 * dron no llega ni de lejos. Pintarlos todos en el mapa llena la pantalla de
 * avisos que no van contigo, y un aviso que no va contigo enseña a ignorar los
 * que sí.
 *
 * La franja vertical viene en texto libre (FLYING_LEVELS_DESC), con el límite
 * inferior delante de la barra:
 *
 *   "GND / 00120M AGL"          → desde el suelo
 *   "SFC / 04300FT AMSL"        → desde el suelo
 *   "02500FT AMSL / 05000FT AMSL" → desde 2500 ft sobre el nivel del mar
 *   "FL070 / FL240"             → desde el nivel de vuelo 070
 *
 * Y la referencia importa tanto como el número: 2500 ft AMSL es inalcanzable
 * sobre la playa y es tu propia altura de vuelo sobre un puerto de montaña. Por
 * eso el AMSL se compara contra la elevación del terreno, y cuando no se sabe
 * cuánto mide el terreno el NOTAM se enseña. En la duda se enseña: un aviso de
 * más se descarta leyéndolo, uno de menos no se descarta de ninguna manera.
 */

import type { Notam } from '../api/notam';

const FT_TO_M = 0.3048;

/** Contra qué se mide el límite inferior de un NOTAM. */
export type LevelRef = 'suelo' | 'agl' | 'amsl' | 'desconocido';

export interface LowerLimit {
  /** Metros sobre la referencia. 0 cuando arranca en el suelo. */
  metres: number;
  ref: LevelRef;
}

const GROUND: LowerLimit = { metres: 0, ref: 'suelo' };

/**
 * El límite inferior de la franja, ya en metros y con su referencia.
 *
 * Si el texto no se entiende se cae a LOWER_VAL (pies, tal cual los publica el
 * servicio) marcado como referencia desconocida, que es lo que hace que el
 * NOTAM se acabe enseñando igualmente.
 */
export function notamLowerLimit(notam: Notam): LowerLimit {
  const raw = (notam.levels ?? '').toUpperCase();
  const lower = (raw.includes('/') ? raw.split('/')[0] : raw).trim();

  if (!lower) {
    return notam.lowerM === null ? GROUND : { metres: notam.lowerM, ref: 'desconocido' };
  }
  // SFC (surface) y GND (ground) son la misma cosa dicha de dos maneras.
  if (/\b(SFC|GND|SURFACE)\b/.test(lower)) return GROUND;

  // Nivel de vuelo: centenas de pies sobre el nivel de presión estándar. Se
  // trata como AMSL — la diferencia por presión son decenas de metros, y a
  // FL070 eso no cambia nada para un dron.
  const fl = lower.match(/\bFL\s*(\d{2,3})\b/);
  if (fl) return { metres: Math.round(Number(fl[1]) * 100 * FT_TO_M), ref: 'amsl' };

  const value = lower.match(/(\d+(?:\.\d+)?)\s*(FT|M)\b/);
  if (value) {
    const n = Number(value[1]);
    const metres = value[2] === 'FT' ? Math.round(n * FT_TO_M) : Math.round(n);
    if (/\bAGL\b/.test(lower)) return { metres, ref: 'agl' };
    if (/\bAMSL\b|\bMSL\b/.test(lower)) return { metres, ref: 'amsl' };
    return { metres, ref: 'desconocido' };
  }

  return notam.lowerM === null ? GROUND : { metres: notam.lowerM, ref: 'desconocido' };
}

/**
 * ¿Puede tu dron meterse dentro de este NOTAM?
 *
 * `terrainElevation` es la altitud del terreno en metros sobre el nivel del
 * mar; null cuando no se ha podido averiguar, y entonces se responde que sí.
 */
export function notamReachable(
  notam: Notam,
  flightHeightAgl: number,
  terrainElevation: number | null,
): boolean {
  const lower = notamLowerLimit(notam);
  switch (lower.ref) {
    case 'suelo':
      return true;
    case 'agl':
      return lower.metres <= flightHeightAgl;
    case 'amsl':
      if (terrainElevation === null) return true;
      return lower.metres <= terrainElevation + flightHeightAgl;
    default:
      // Sin saber contra qué se mide el número, no se descarta nada.
      return true;
  }
}
