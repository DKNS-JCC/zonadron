/**
 * Motor de decisión.
 *
 * Regla de oro de esta app: NO se inventa nada. Todo lo que se muestra sale de
 * los campos que publica ENAIRE en formato ED-318. Lo único que hacemos aquí es:
 *
 *  1. Convertir los límites verticales a una referencia común (altura sobre el
 *     terreno), usando la elevación real del punto.
 *  2. Descartar las zonas cuya franja de altitud no se cruza con el vuelo previsto.
 *  3. Quedarnos con la restricción más severa de las que sí aplican.
 *
 * Ante la duda, siempre se elige la interpretación más restrictiva.
 */

import type {
  EvaluatedZone,
  LayerKey,
  MaxFreeHeight,
  Verdict,
  VerdictLevel,
  VerticalRef,
  Zone,
  ZoneType,
  ZoneVerticalCheck,
} from '../types';

/** Severidad relativa para poder ordenar y quedarnos con la peor. */
const SEVERITY: Record<ZoneType, number> = {
  PROHIBITED: 4,
  REQ_AUTHORIZATION: 3,
  CONDITIONAL: 2,
  UNKNOWN: 1,
  NO_RESTRICTION: 0,
};

const LEVEL_BY_TYPE: Record<ZoneType, VerdictLevel> = {
  PROHIBITED: 'PROHIBIDO',
  REQ_AUTHORIZATION: 'AUTORIZACION',
  CONDITIONAL: 'CONDICIONES',
  UNKNOWN: 'CONDICIONES',
  NO_RESTRICTION: 'LIBRE',
};

/* ------------------------------------------------------------------ */
/* 1. Cálculo vertical                                                  */
/* ------------------------------------------------------------------ */

/**
 * Convierte un límite vertical a metros sobre el terreno del punto consultado.
 *
 * Hay tres referencias posibles:
 *  - AGL medido desde el suelo: se usa tal cual.
 *  - AGL medido desde el punto de referencia del aeródromo: hay que pasar por
 *    el nivel del mar (ARP + valor) y volver a bajar restando el terreno local.
 *    Ver `src/logic/reference.ts` para el porqué.
 *  - AMSL: se resta el terreno local.
 */
function toAgl(
  value: number | null,
  ref: VerticalRef,
  terrainElevation: number | null,
  referenceElevation: number | null,
): { agl: number | null; usedTerrain: boolean; usedReference: boolean; unknown: boolean } {
  if (value === null) {
    return { agl: null, usedTerrain: false, usedReference: false, unknown: false };
  }

  if (ref === 'AGL') {
    if (referenceElevation === null) {
      return { agl: value, usedTerrain: false, usedReference: false, unknown: false };
    }
    // Medido desde el punto de referencia del aeródromo.
    if (terrainElevation === null) {
      return { agl: null, usedTerrain: false, usedReference: true, unknown: true };
    }
    return {
      agl: referenceElevation + value - terrainElevation,
      usedTerrain: true,
      usedReference: true,
      unknown: false,
    };
  }

  if (ref === 'AMSL') {
    if (terrainElevation === null) {
      return { agl: null, usedTerrain: false, usedReference: false, unknown: true };
    }
    return { agl: value - terrainElevation, usedTerrain: true, usedReference: false, unknown: false };
  }

  // W84 es altura sobre el elipsoide, no sobre el nivel del mar: restarle una
  // elevación ortométrica introduce el error del geoide (~50 m en España), y
  // siempre hacia el lado permisivo. Se prefiere marcarlo como no convertible.
  // Referencia no indicada: tampoco podemos convertir con seguridad.
  return { agl: null, usedTerrain: false, usedReference: false, unknown: true };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(0);
}

export function evaluateVertical(
  zone: Zone,
  flightHeightAgl: number,
  terrainElevation: number | null,
): ZoneVerticalCheck {
  // El texto dice que las alturas se miden desde el punto de referencia del
  // aeródromo, pero ENAIRE no publica su elevación: no hay forma de calcularlo,
  // así que se asume que la zona te afecta.
  if (zone.referenceElevationMissing) {
    return {
      lowerAgl: null,
      upperAgl: null,
      affects: true,
      usedTerrain: false,
      usedReferencePoint: true,
      explanation:
        'Esta zona mide sus alturas desde el punto de referencia del aeródromo, pero ENAIRE no ' +
        'publica a qué altitud está. Sin ese dato no se puede calcular si te afecta o no, así que ' +
        'se considera que sí. Consulta el texto oficial y coordina con el gestor.',
    };
  }

  const arp = zone.referenceElevation;
  const low = toAgl(zone.lower, zone.lowerRef, terrainElevation, arp);
  const high = toAgl(zone.upper, zone.upperRef, terrainElevation, arp);

  const usedTerrain = low.usedTerrain || high.usedTerrain;
  const usedReferencePoint = low.usedReference || high.usedReference;

  // Si no hemos podido convertir algún límite, asumimos que la zona te afecta.
  if (low.unknown || high.unknown) {
    return {
      lowerAgl: low.agl,
      upperAgl: high.agl,
      affects: true,
      usedTerrain,
      usedReferencePoint,
      explanation: usedReferencePoint
        ? 'Esta zona mide sus alturas desde el punto de referencia del aeródromo y no se ha podido ' +
          'obtener la elevación del terreno en tu punto, así que se considera que te afecta.'
        : 'No se ha podido convertir con seguridad la franja de alturas de esta zona ' +
          '(falta la elevación del terreno o la referencia vertical). Se considera que te afecta.',
    };
  }

  const floorAgl = low.agl ?? 0;
  const ceilingAgl = high.agl; // null = sin techo declarado

  // Explicación del origen de las alturas, para que se pueda contrastar.
  const origin =
    usedReferencePoint && arp !== null && terrainElevation !== null
      ? ` Esta zona mide sus alturas desde el punto de referencia del aeródromo (${fmt(arp)} m sobre el nivel del mar), no desde el suelo: en tu punto el terreno está a ${fmt(terrainElevation)} m, así que la zona empieza a ${fmt(floorAgl)} m por encima de ti.`
      : usedTerrain
        ? ' Calculado con la elevación real del terreno en este punto.'
        : '';

  // El vuelo ocupa desde el suelo (despegue) hasta la altura prevista.
  if (floorAgl > flightHeightAgl) {
    return {
      lowerAgl: floorAgl,
      upperAgl: ceilingAgl,
      affects: false,
      usedTerrain,
      usedReferencePoint,
      explanation:
        `Esta zona empieza a ${fmt(floorAgl)} m sobre el terreno, por encima de los ` +
        `${fmt(flightHeightAgl)} m a los que piensas volar.` +
        origin,
    };
  }

  if (ceilingAgl !== null && ceilingAgl < 0) {
    return {
      lowerAgl: floorAgl,
      upperAgl: ceilingAgl,
      affects: false,
      usedTerrain,
      usedReferencePoint,
      explanation:
        'El techo de esta zona queda por debajo del nivel del terreno en este punto, ' +
        'así que no aplica a tu vuelo.' + origin,
    };
  }

  const ceilingText =
    ceilingAgl === null ? 'sin techo declarado' : `hasta ${fmt(ceilingAgl)} m sobre el terreno`;

  return {
    lowerAgl: floorAgl,
    upperAgl: ceilingAgl,
    affects: true,
    usedTerrain,
    usedReferencePoint,
    explanation:
      `Tu vuelo (0 → ${fmt(flightHeightAgl)} m sobre el terreno) entra en la franja de esta zona ` +
      `(desde ${fmt(floorAgl)} m, ${ceilingText}).` +
      origin,
  };
}

/* ------------------------------------------------------------------ */
/* 2. Vigencia temporal                                                 */
/* ------------------------------------------------------------------ */

/**
 * ENAIRE publica las fechas sin zona horaria (`2026-06-08T10:30:47`). JavaScript
 * las interpretaría como hora local, lo que en España desplaza el instante 1-2 h
 * y podría dar por caducada una zona que todavía está vigente. Se asume UTC.
 */
function parseDate(value?: string): Date | null {
  if (!value) return null;
  const iso = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Margen de seguridad antes de considerar caducada una zona. Dar una zona por
 * caducada la saca del veredicto, así que se espera 3 horas por si la fecha
 * publicada no estuviera realmente en UTC.
 */
const EXPIRY_MARGIN_MS = 3 * 60 * 60 * 1000;

export function evaluateTiming(
  zone: Zone,
  now: Date,
): { timing: EvaluatedZone['timing']; timingNote?: string } {
  const start = parseDate(zone.applicability.startDateTime);
  const end = parseDate(zone.applicability.endDateTime);

  if (end && end.getTime() + EXPIRY_MARGIN_MS < now.getTime()) {
    return {
      timing: 'CADUCADA',
      timingNote: `ENAIRE indica que esta zona dejó de estar vigente el ${end.toLocaleDateString('es-ES')}.`,
    };
  }
  if (start && start.getTime() > now.getTime()) {
    return {
      timing: 'PROGRAMADA',
      timingNote: `Esta zona entra en vigor el ${start.toLocaleDateString('es-ES')}.`,
    };
  }

  const day = (zone.applicability.day ?? '').toUpperCase();
  const hasWindow = Boolean(zone.applicability.startTime || zone.applicability.endTime);
  const limited = zone.applicability.limited;

  if (!hasWindow && (day === '' || day === 'ANY') && !limited) {
    return { timing: 'PERMANENTE' };
  }

  const bits: string[] = [];
  if (day && day !== 'ANY') bits.push(`días: ${day}`);
  if (hasWindow) {
    bits.push(
      `horario: ${zone.applicability.startTime || '—'} a ${zone.applicability.endTime || '—'}`,
    );
  }
  if (limited) bits.push(limited);

  return {
    timing: 'ACTIVA_AHORA',
    timingNote:
      'Esta zona tiene condiciones de aplicación limitadas' +
      (bits.length ? ` (${bits.join('; ')})` : '') +
      '. Comprueba el texto oficial antes de volar.',
  };
}

/* ------------------------------------------------------------------ */
/* 3. Veredicto                                                         */
/* ------------------------------------------------------------------ */

const HEADLINES: Record<VerdictLevel, string> = {
  LIBRE: 'Puedes volar',
  CONDICIONES: 'Puedes volar, con condiciones',
  AUTORIZACION: 'Necesitas autorización',
  PROHIBIDO: 'No puedes volar',
  DESCONOCIDO: 'No se ha podido comprobar',
};

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

export function evaluateZones(
  zones: Zone[],
  flightHeightAgl: number,
  terrainElevation: number | null,
  now: Date = new Date(),
): EvaluatedZone[] {
  return zones
    .map<EvaluatedZone>((z) => {
      const { timing, timingNote } = evaluateTiming(z, now);
      return {
        ...z,
        vertical: evaluateVertical(z, flightHeightAgl, terrainElevation),
        timing,
        timingNote,
      };
    })
    .sort((a, b) => {
      const bySeverity = SEVERITY[b.type] - SEVERITY[a.type];
      if (bySeverity !== 0) return bySeverity;
      return a.title.localeCompare(b.title, 'es');
    });
}

/**
 * Límite general de altura de la categoría abierta: 120 m sobre la superficie
 * (Reglamento de Ejecución (UE) 2019/947, UAS.OPEN.010).
 */
export const OPEN_CATEGORY_CEILING_M = 120;

/**
 * Hasta qué altura se puede subir sin pedirle permiso a nadie.
 *
 * Es la vuelta del veredicto: en vez de que tú pruebes alturas a ver cuál pasa,
 * se calcula el suelo más bajo de todas las zonas que exigen permiso y se te da
 * el número directamente.
 *
 * Sólo cuentan las zonas que bloquean (prohibidas o con autorización previa).
 * Las condicionales no ponen techo: te dejan volar cumpliendo condiciones.
 */
export function computeMaxFreeHeight(evaluated: EvaluatedZone[]): MaxFreeHeight {
  const blocking = evaluated.filter(
    (z) =>
      !z.advisory &&
      z.timing !== 'CADUCADA' &&
      (z.type === 'PROHIBITED' || z.type === 'REQ_AUTHORIZATION' || z.type === 'UNKNOWN'),
  );

  let ceiling = OPEN_CATEGORY_CEILING_M;
  let limitedBy: string | null = null;

  for (const zone of blocking) {
    // Zona cuyo techo queda bajo tierra: no aplica.
    if (zone.vertical.upperAgl !== null && zone.vertical.upperAgl < 0) continue;

    // Suelo desconocido: no se puede afirmar que exista ningún margen libre.
    if (zone.vertical.lowerAgl === null) {
      return {
        metres: null,
        limitedBy: zone.title,
        legalLimit: false,
        label:
          'No se puede calcular hasta qué altura puedes subir sin permiso: ' +
          `la franja de "${zone.title}" no se ha podido determinar.`,
      };
    }

    const floor = Math.max(0, zone.vertical.lowerAgl);
    if (floor < ceiling) {
      ceiling = floor;
      limitedBy = zone.title;
    }
  }

  const legalLimit = limitedBy === null;
  const metres = Math.floor(ceiling);

  let label: string;
  if (metres <= 0) {
    label = `Aquí no puedes volar a ninguna altura sin autorización (${limitedBy}).`;
  } else if (legalLimit) {
    label = `Puedes subir hasta ${metres} m, el límite general de la categoría abierta.`;
  } else {
    label = `Puedes subir hasta ${metres} m sin pedir permiso. Por encima, ${limitedBy}.`;
  }

  return { metres, limitedBy, legalLimit, label };
}

/**
 * Construye el veredicto.
 *
 * `failedLayers` NO es informativo: si alguna de las tres capas oficiales no ha
 * respondido, la app no puede afirmar que se pueda volar. En ese caso el
 * veredicto se degrada a DESCONOCIDO salvo que lo encontrado ya sea igual o más
 * restrictivo, porque una respuesta parcial nunca puede ser más permisiva que la
 * completa.
 */
export function buildVerdict(
  evaluated: EvaluatedZone[],
  flightHeightAgl: number,
  failedLayers: LayerKey[] = [],
): Verdict {
  // Los avisos generales (ver ADVISORY_LAYERS) cubren todo el país y no pueden
  // decidir el veredicto: se muestran aparte, siempre y completos.
  const advisories = evaluated.filter((z) => z.advisory);
  const live = evaluated.filter((z) => !z.advisory && z.timing !== 'CADUCADA');
  const affecting = live.filter((z) => z.vertical.affects);
  const notAffecting = live.filter((z) => !z.vertical.affects);

  const maxFreeHeight = computeMaxFreeHeight(evaluated);
  const incomplete = failedLayers.length > 0;
  const incompleteNote = incomplete
    ? ` No se ${plural(failedLayers.length, 'ha', 'han')} podido consultar ${failedLayers.length} de las 3 capas oficiales de ENAIRE.`
    : '';

  const worst = affecting.length
    ? affecting.reduce((acc, z) => (SEVERITY[z.type] > SEVERITY[acc.type] ? z : acc))
    : null;
  const worstSeverity = worst ? SEVERITY[worst.type] : 0;

  // Respuesta incompleta y nada grave encontrado: no se puede dar un "sí".
  if (incomplete && worstSeverity < SEVERITY.REQ_AUTHORIZATION) {
    return {
      level: 'DESCONOCIDO',
      headline: HEADLINES.DESCONOCIDO,
      summary:
        `No se ha podido comprobar este punto por completo.${incompleteNote} ` +
        'Vuelve a intentarlo con mejor cobertura: hasta entonces, da por hecho que puede haber restricciones.',
      affecting,
      notAffecting,
      advisories,
      maxFreeHeight: incomplete ? { ...maxFreeHeight, metres: null, label: 'No se ha podido determinar: falta consultar alguna capa oficial.' } : maxFreeHeight,
      incomplete: true,
      failedLayers,
    };
  }

  if (!worst) {
    return {
      level: 'LIBRE',
      headline: HEADLINES.LIBRE,
      summary:
        notAffecting.length > 0
          ? `No hay ninguna zona geográfica UAS que te afecte volando hasta ${fmt(flightHeightAgl)} m sobre el terreno. ` +
            `Sí hay ${notAffecting.length} ${plural(notAffecting.length, 'zona', 'zonas')} en este punto, pero ` +
            `${plural(notAffecting.length, 'empieza', 'empiezan')} por encima de esa altura.`
          : 'ENAIRE no publica ninguna zona geográfica UAS que te afecte en este punto. Siguen aplicando las reglas generales de la categoría en la que operes.',
      affecting,
      notAffecting,
      advisories,
      maxFreeHeight,
      incomplete: false,
      failedLayers,
    };
  }

  const level = LEVEL_BY_TYPE[worst.type];

  const counts = {
    prohibido: affecting.filter((z) => z.type === 'PROHIBITED').length,
    auth: affecting.filter((z) => z.type === 'REQ_AUTHORIZATION').length,
    cond: affecting.filter((z) => z.type === 'CONDITIONAL').length,
  };

  let summary: string;
  if (level === 'PROHIBIDO') {
    summary =
      `Estás dentro de ${counts.prohibido} ${plural(counts.prohibido, 'zona prohibida', 'zonas prohibidas')} para drones. ` +
      'No vueles aquí.';
  } else if (level === 'AUTORIZACION') {
    summary =
      `Estás dentro de ${counts.auth} ${plural(counts.auth, 'zona que exige', 'zonas que exigen')} permiso previo. ` +
      'Sin esa autorización el vuelo no es legal.';
  } else if (level === 'CONDICIONES') {
    summary =
      `Estás dentro de ${counts.cond} ${plural(counts.cond, 'zona con condiciones', 'zonas con condiciones')}. ` +
      'Puedes volar si cumples lo que indica cada una.';
  } else {
    summary = 'Revisa las zonas listadas antes de volar.';
  }

  if (affecting.length > 1) {
    summary +=
      ` En total te ${plural(affecting.length, 'afecta', 'afectan')} ${affecting.length} ` +
      `${plural(affecting.length, 'zona', 'zonas')}: se cumplen todas a la vez, no vale con la menos restrictiva.`;
  }

  return {
    level,
    headline: HEADLINES[level],
    summary: summary + incompleteNote,
    affecting,
    notAffecting,
    advisories,
    maxFreeHeight,
    incomplete,
    failedLayers,
  };
}

/* ------------------------------------------------------------------ */
/* 4. Lenguaje llano por zona                                           */
/* ------------------------------------------------------------------ */

/**
 * Frase de "qué tengo que hacer", construida SOLO con campos publicados por
 * ENAIRE. Si no hay datos de contacto, se dice explícitamente.
 */
export function actionAdvice(zone: EvaluatedZone): string {
  if (zone.advisory) {
    return (
      'Esto no es una zona concreta: ENAIRE lo publica cubriendo todo el país como recordatorio. ' +
      'Mira a tu alrededor y decide si estás en entorno urbano según la definición del texto oficial; ' +
      'si lo estás, cumple lo que indica antes de volar.'
    );
  }
  const contactBits: string[] = [];
  if (zone.contact.name) contactBits.push(zone.contact.name);
  if (zone.contact.email) contactBits.push(zone.contact.email);
  if (zone.contact.phone) contactBits.push(zone.contact.phone);
  const contact = contactBits.join(' · ');

  switch (zone.type) {
    case 'PROHIBITED':
      return 'No vueles. Esta zona está prohibida para drones.';
    case 'REQ_AUTHORIZATION':
      return contact
        ? `Solicita autorización antes de volar. Contacto publicado por ENAIRE: ${contact}.`
        : 'Solicita autorización antes de volar. ENAIRE no publica un contacto directo para esta zona: ' +
          'consulta el texto oficial y, si no queda claro, pregunta a AESA o al gestor de la zona.';
    case 'CONDITIONAL':
      return contact
        ? `Puedes volar cumpliendo las condiciones del texto oficial. Contacto: ${contact}.`
        : 'Puedes volar, pero cumpliendo las condiciones que figuran en el texto oficial de esta zona.';
    case 'NO_RESTRICTION':
      return 'Esta zona no añade restricciones.';
    default:
      return 'ENAIRE no ha clasificado esta zona. Trátala como restringida y consulta el texto oficial.';
  }
}

/** Franja vertical en texto corto, ya en metros sobre el terreno. */
export function verticalBandLabel(zone: EvaluatedZone): string {
  const { lowerAgl, upperAgl } = zone.vertical;
  if (lowerAgl === null && upperAgl === null) return 'Franja de alturas no determinada';
  const from = lowerAgl === null ? '?' : `${fmt(Math.max(0, lowerAgl))} m`;
  const to = upperAgl === null ? 'sin techo' : `${fmt(Math.max(0, upperAgl))} m`;
  return `De ${from} a ${to} sobre el terreno`;
}

/** Versión corta para la fila plegada de la tarjeta: "de 45 a 900 m". */
export function verticalBandShort(zone: EvaluatedZone): string {
  const { lowerAgl, upperAgl } = zone.vertical;
  if (lowerAgl === null && upperAgl === null) return 'alturas sin determinar';
  const from = lowerAgl === null ? '?' : fmt(Math.max(0, lowerAgl));
  if (upperAgl === null) return `desde ${from} m`;
  return `de ${from} a ${fmt(Math.max(0, upperAgl))} m`;
}

/** Franja tal y como la publica ENAIRE, sin convertir. */
export function rawBandLabel(zone: Zone): string {
  const unit = zone.uom === 'FT' ? 'ft' : 'm';
  const toUnit = (v: number) => (zone.uom === 'FT' ? v / 0.3048 : v);
  const lo = zone.lower === null ? '—' : `${fmt(toUnit(zone.lower))} ${unit} ${zone.lowerRef}`;
  const hi = zone.upper === null ? '—' : `${fmt(toUnit(zone.upper))} ${unit} ${zone.upperRef}`;
  return `${lo} → ${hi}`;
}
