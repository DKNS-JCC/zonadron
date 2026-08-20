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

import { dateLocale, t, type MessageKey } from '../i18n';
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
      explanation: t('verdict.vertical.referenceMissing'),
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
        ? t('verdict.vertical.referenceNoTerrain')
        : t('verdict.vertical.notConvertible'),
    };
  }

  const floorAgl = low.agl ?? 0;
  const ceilingAgl = high.agl; // null = sin techo declarado

  // Explicación del origen de las alturas, para que se pueda contrastar.
  const origin =
    usedReferencePoint && arp !== null && terrainElevation !== null
      ? t('verdict.vertical.originReference', fmt(arp), fmt(terrainElevation), fmt(floorAgl))
      : usedTerrain
        ? t('verdict.vertical.originTerrain')
        : '';

  // El vuelo ocupa desde el suelo (despegue) hasta la altura prevista.
  if (floorAgl > flightHeightAgl) {
    return {
      lowerAgl: floorAgl,
      upperAgl: ceilingAgl,
      affects: false,
      usedTerrain,
      usedReferencePoint,
      explanation: t('verdict.vertical.above', fmt(floorAgl), fmt(flightHeightAgl)) + origin,
    };
  }

  if (ceilingAgl !== null && ceilingAgl < 0) {
    return {
      lowerAgl: floorAgl,
      upperAgl: ceilingAgl,
      affects: false,
      usedTerrain,
      usedReferencePoint,
      explanation: t('verdict.vertical.underground') + origin,
    };
  }

  const ceilingText =
    ceilingAgl === null
      ? t('verdict.vertical.noCeiling')
      : t('verdict.vertical.ceilingAt', fmt(ceilingAgl));

  return {
    lowerAgl: floorAgl,
    upperAgl: ceilingAgl,
    affects: true,
    usedTerrain,
    usedReferencePoint,
    explanation:
      t('verdict.vertical.inside', fmt(flightHeightAgl), fmt(floorAgl), ceilingText) + origin,
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
      timingNote: t('verdict.timing.expired', end.toLocaleDateString(dateLocale())),
    };
  }
  if (start && start.getTime() > now.getTime()) {
    return {
      timing: 'PROGRAMADA',
      timingNote: t('verdict.timing.scheduled', start.toLocaleDateString(dateLocale())),
    };
  }

  const day = (zone.applicability.day ?? '').toUpperCase();
  const hasWindow = Boolean(zone.applicability.startTime || zone.applicability.endTime);
  const limited = zone.applicability.limited;

  if (!hasWindow && (day === '' || day === 'ANY') && !limited) {
    return { timing: 'PERMANENTE' };
  }

  const bits: string[] = [];
  if (day && day !== 'ANY') bits.push(t('verdict.timing.days', day));
  if (hasWindow) {
    bits.push(
      t(
        'verdict.timing.hours',
        zone.applicability.startTime || '—',
        zone.applicability.endTime || '—',
      ),
    );
  }
  if (limited) bits.push(limited);

  return {
    timing: 'ACTIVA_AHORA',
    timingNote: t('verdict.timing.limited', bits.length ? ` (${bits.join('; ')})` : ''),
  };
}

/* ------------------------------------------------------------------ */
/* 3. Veredicto                                                         */
/* ------------------------------------------------------------------ */

const HEADLINE_KEYS = {
  LIBRE: 'verdict.headline.LIBRE',
  CONDICIONES: 'verdict.headline.CONDICIONES',
  AUTORIZACION: 'verdict.headline.AUTORIZACION',
  PROHIBIDO: 'verdict.headline.PROHIBIDO',
  DESCONOCIDO: 'verdict.headline.DESCONOCIDO',
} satisfies Record<VerdictLevel, MessageKey>;

/** Titular del veredicto, en el idioma activo. */
export function verdictHeadline(level: VerdictLevel): string {
  return t(HEADLINE_KEYS[level]);
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
        label: t('verdict.maxFree.unknownBand', zone.title),
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
    label = t('verdict.maxFree.none', limitedBy ?? '');
  } else if (legalLimit) {
    label = t('verdict.maxFree.legalLimit', metres);
  } else {
    label = t('verdict.maxFree.limitedBy', metres, limitedBy ?? '');
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
  const incompleteNote = incomplete ? t('verdict.incompleteNote', failedLayers.length) : '';

  const worst = affecting.length
    ? affecting.reduce((acc, z) => (SEVERITY[z.type] > SEVERITY[acc.type] ? z : acc))
    : null;
  const worstSeverity = worst ? SEVERITY[worst.type] : 0;

  // Respuesta incompleta y nada grave encontrado: no se puede dar un "sí".
  if (incomplete && worstSeverity < SEVERITY.REQ_AUTHORIZATION) {
    return {
      level: 'DESCONOCIDO',
      headline: verdictHeadline('DESCONOCIDO'),
      summary:
        t('verdict.summary.unknown') + incompleteNote + t('verdict.summary.unknownRetry'),
      affecting,
      notAffecting,
      advisories,
      maxFreeHeight: incomplete
        ? { ...maxFreeHeight, metres: null, label: t('verdict.maxFree.unknownLayer') }
        : maxFreeHeight,
      incomplete: true,
      failedLayers,
    };
  }

  if (!worst) {
    return {
      level: 'LIBRE',
      headline: verdictHeadline('LIBRE'),
      summary:
        notAffecting.length > 0
          ? t('verdict.summary.freeWithZonesAbove', fmt(flightHeightAgl), notAffecting.length)
          : t('verdict.summary.free'),
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
    summary = t('verdict.summary.prohibited', counts.prohibido);
  } else if (level === 'AUTORIZACION') {
    summary = t('verdict.summary.authorization', counts.auth);
  } else if (level === 'CONDICIONES') {
    summary = t('verdict.summary.conditional', counts.cond);
  } else {
    summary = t('verdict.summary.review');
  }

  if (affecting.length > 1) {
    summary += t('verdict.summary.allAtOnce', affecting.length);
  }

  return {
    level,
    headline: verdictHeadline(level),
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
    return t('verdict.advice.advisory');
  }
  const contactBits: string[] = [];
  if (zone.contact.name) contactBits.push(zone.contact.name);
  if (zone.contact.email) contactBits.push(zone.contact.email);
  if (zone.contact.phone) contactBits.push(zone.contact.phone);
  const contact = contactBits.join(' · ');

  switch (zone.type) {
    case 'PROHIBITED':
      return t('verdict.advice.prohibited');
    case 'REQ_AUTHORIZATION':
      return contact
        ? t('verdict.advice.authorizationContact', contact)
        : t('verdict.advice.authorization');
    case 'CONDITIONAL':
      return contact
        ? t('verdict.advice.conditionalContact', contact)
        : t('verdict.advice.conditional');
    case 'NO_RESTRICTION':
      return t('verdict.advice.noRestriction');
    default:
      return t('verdict.advice.unknown');
  }
}

/** Franja vertical en texto corto, ya en metros sobre el terreno. */
export function verticalBandLabel(zone: EvaluatedZone): string {
  const { lowerAgl, upperAgl } = zone.vertical;
  if (lowerAgl === null && upperAgl === null) return t('verdict.band.undetermined');
  const from = lowerAgl === null ? '?' : `${fmt(Math.max(0, lowerAgl))} m`;
  const to = upperAgl === null ? t('verdict.band.noCeiling') : `${fmt(Math.max(0, upperAgl))} m`;
  return t('verdict.band.range', from, to);
}

/** Versión corta para la fila plegada de la tarjeta: "de 45 a 900 m". */
export function verticalBandShort(zone: EvaluatedZone): string {
  const { lowerAgl, upperAgl } = zone.vertical;
  if (lowerAgl === null && upperAgl === null) return t('verdict.band.shortUndetermined');
  const from = lowerAgl === null ? '?' : fmt(Math.max(0, lowerAgl));
  if (upperAgl === null) return t('verdict.band.shortFrom', from);
  return t('verdict.band.shortRange', from, fmt(Math.max(0, upperAgl)));
}

/** Franja tal y como la publica ENAIRE, sin convertir. */
export function rawBandLabel(zone: Zone): string {
  const unit = zone.uom === 'FT' ? 'ft' : 'm';
  const toUnit = (v: number) => (zone.uom === 'FT' ? v / 0.3048 : v);
  const lo = zone.lower === null ? '—' : `${fmt(toUnit(zone.lower))} ${unit} ${zone.lowerRef}`;
  const hi = zone.upper === null ? '—' : `${fmt(toUnit(zone.upper))} ${unit} ${zone.upperRef}`;
  return `${lo} → ${hi}`;
}
