/**
 * Alturas medidas desde el punto de referencia del aeródromo (ARP).
 *
 * ENAIRE etiqueta muchas zonas de aeródromo y helipuerto como "90 m AGL", pero
 * su propio texto oficial aclara que esos 90 m NO se miden desde el suelo donde
 * estás, sino desde el punto de referencia del aeródromo, cuya elevación publica
 * entre paréntesis. Por ejemplo, para el helipuerto del Hospital Universitario
 * de Salamanca (LEBJ90):
 *
 *   «Por debajo de 90m medidos desde el punto de referencia del aeródromo
 *    (770m), no es necesario coordinar la operación.»
 *
 * Es decir: el suelo real de la zona son 770 + 90 = 860 m sobre el nivel del
 * mar. Tomarlo como 90 m sobre tu propio terreno es incorrecto en las dos
 * direcciones, y en una de ellas es peligroso: si estás en un punto más alto que
 * el aeródromo, la zona empieza MÁS BAJA de lo que parece.
 *
 * 519 de las 1.679 zonas de la capa aeronáutica usan esta redacción, así que no
 * es un caso raro.
 */

const PHRASE = /medidos?\s+desde\s+el\s+punto\s+de\s+referencia/i;
const WITH_VALUE = /punto de referencia del (?:aer[oó]dromo|helipuerto)\s*\(\s*([\d]+(?:[.,]\d+)?)\s*m?\s*\)/gi;

/** Elevaciones plausibles en España, con margen. */
const MIN_M = -50;
const MAX_M = 3500;

export interface ReferenceElevation {
  /** Elevación del punto de referencia, en metros sobre el nivel del mar. */
  metres: number | null;
  /**
   * true cuando el texto dice que las alturas se miden desde el punto de
   * referencia pero no se puede saber su elevación. En ese caso no se puede
   * calcular nada y hay que ponerse en lo peor.
   */
  missing: boolean;
}

/**
 * Busca la elevación del punto de referencia en el texto oficial ya convertido
 * a texto plano.
 *
 * Es deliberadamente estricto: si el texto menciona varias elevaciones
 * distintas, o el número no es plausible, se devuelve `missing` en vez de
 * arriesgarse a una interpretación equivocada.
 */
export function parseReferenceElevation(officialText: string): ReferenceElevation {
  if (!officialText || !PHRASE.test(officialText)) {
    return { metres: null, missing: false };
  }

  const found = new Set<number>();
  WITH_VALUE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WITH_VALUE.exec(officialText)) !== null) {
    const value = Number(match[1].replace(',', '.'));
    if (Number.isFinite(value) && value >= MIN_M && value <= MAX_M) found.add(value);
  }

  // Ninguna elevación utilizable: ENAIRE publica muchos de estos con el
  // paréntesis vacío, sobre todo helipuertos de hospital.
  if (found.size === 0) return { metres: null, missing: true };

  // Varias elevaciones distintas en el mismo texto: no nos fiamos.
  if (found.size > 1) return { metres: null, missing: true };

  return { metres: [...found][0], missing: false };
}
