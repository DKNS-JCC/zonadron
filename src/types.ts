/**
 * Modelo de datos alineado con ED-318 (Technical Specification for the
 * Provision of UAS Geographical Zones and U-space data), que es el formato en
 * el que ENAIRE publica las Zonas Geográficas UAS de España.
 *
 * Fuente oficial: https://aip.enaire.es/AIP/UAS-es.html
 */

/** Tipo de restricción de la zona (campo `type` en ED-318). */
export type ZoneType =
  | 'PROHIBITED'
  | 'REQ_AUTHORIZATION'
  | 'CONDITIONAL'
  | 'NO_RESTRICTION'
  | 'UNKNOWN';

/** Referencia vertical de los límites de la zona (campo `*Reference`). */
export type VerticalRef = 'AGL' | 'AMSL' | 'W84' | 'UNKNOWN';

/** Capas publicadas por ENAIRE en el servicio SRV_UAS_ZG_data_V2. */
export type LayerKey = 'aero' | 'urbano' | 'infraestructuras';

/** Atributos crudos tal y como los devuelve el servicio de ENAIRE. */
export interface RawZoneAttributes {
  identifier?: string | null;
  name?: string | null;
  country?: string | null;
  type?: string | null;
  reasons?: string | null;
  otherReasonInfo?: string | null;
  restrictionConditions?: string | null;
  message?: string | null;
  description?: string | null;
  variant?: string | null;
  region?: string | null;
  extendedProperties?: string | null;
  purpose?: string | null;
  regulationExemption?: string | null;
  lower?: number | null;
  lowerReference?: string | null;
  upper?: number | null;
  upperReference?: string | null;
  uom?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  siteURL?: string | null;
  service?: string | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  day?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  limitedApplicability?: string | null;
  updateDateTime?: string | null;
  creationDateTime?: string | null;
  OBJECTID?: number | null;
  [key: string]: unknown;
}

/** Zona ya normalizada y lista para usar en la interfaz. */
export interface Zone {
  /** Clave única estable dentro de una consulta. */
  key: string;
  layer: LayerKey;
  identifier: string;
  /** Nombre legible; si ENAIRE no publica uno, se deriva de la capa. */
  title: string;
  type: ZoneType;
  reasons: string[];
  /** Texto oficial de ENAIRE, ya convertido de HTML a texto plano. */
  officialText: string;
  /**
   * true cuando la zona no es una restricción localizada sino un aviso general
   * que ENAIRE publica cubriendo todo el FIR. Ver `ADVISORY_LAYERS` en
   * `src/api/enaire.ts` para el detalle y la justificación.
   */
  advisory: boolean;
  /** Texto oficial original en HTML, por si se quiere mostrar tal cual. */
  officialHtml: string;
  /**
   * Elevación del punto de referencia del aeródromo (m sobre el nivel del mar)
   * cuando la zona mide sus alturas desde ahí y no desde el suelo. Ver
   * `src/logic/reference.ts`.
   */
  referenceElevation: number | null;
  /** El texto dice que se mide desde el ARP pero no publica su elevación. */
  referenceElevationMissing: boolean;
  lower: number | null;
  lowerRef: VerticalRef;
  upper: number | null;
  upperRef: VerticalRef;
  /** Unidad original ('M' o 'FT'); los límites se guardan ya en metros. */
  uom: 'M' | 'FT' | 'UNKNOWN';
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    url?: string;
  };
  applicability: {
    startDateTime?: string;
    endDateTime?: string;
    day?: string;
    startTime?: string;
    endTime?: string;
    limited?: string;
  };
  updatedAt?: string;
  raw: RawZoneAttributes;
}

/** Resultado del cálculo vertical de una zona frente a un vuelo concreto. */
export interface ZoneVerticalCheck {
  /** Suelo de la zona convertido a metros sobre el terreno (AGL). null = desconocido. */
  lowerAgl: number | null;
  /** Techo de la zona convertido a metros sobre el terreno (AGL). null = sin techo. */
  upperAgl: number | null;
  /** true si el volumen del vuelo (0 → altura prevista) corta la franja de la zona. */
  affects: boolean;
  /** true si la conversión ha necesitado la elevación del terreno. */
  usedTerrain: boolean;
  /** true si las alturas se han medido desde el punto de referencia del aeródromo. */
  usedReferencePoint: boolean;
  /** Motivo legible de por qué afecta o no. */
  explanation: string;
}

export interface EvaluatedZone extends Zone {
  vertical: ZoneVerticalCheck;
  /** Estado temporal de la zona: permanente, activa ahora, o activa solo a ratos. */
  timing: 'PERMANENTE' | 'ACTIVA_AHORA' | 'PROGRAMADA' | 'CADUCADA';
  timingNote?: string;
}

export type VerdictLevel = 'LIBRE' | 'CONDICIONES' | 'AUTORIZACION' | 'PROHIBIDO' | 'DESCONOCIDO';

export interface Verdict {
  level: VerdictLevel;
  /** Titular corto, en lenguaje llano. */
  headline: string;
  /** Explicación de una o dos frases. */
  summary: string;
  affecting: EvaluatedZone[];
  /** Zonas que existen en el punto pero que no afectan a la altura prevista. */
  notAffecting: EvaluatedZone[];
  /** Avisos generales de ENAIRE que cubren todo el país (no deciden el veredicto). */
  advisories: EvaluatedZone[];
  /**
   * Hasta qué altura puedes subir sin pedir permiso a nadie, en metros sobre el
   * terreno. null = no se ha podido determinar.
   */
  maxFreeHeight: MaxFreeHeight;
  /** true si alguna capa oficial no respondió: el resultado no es concluyente. */
  incomplete: boolean;
  /** Capas que no respondieron. */
  failedLayers: LayerKey[];
}

export interface MaxFreeHeight {
  /** Metros sobre el terreno, o null si no se puede determinar con seguridad. */
  metres: number | null;
  /** Qué zona pone ese techo (null si el límite es el legal de 120 m). */
  limitedBy: string | null;
  /** true si el techo lo marca el límite legal de la categoría abierta. */
  legalLimit: boolean;
  /** Frase lista para mostrar. */
  label: string;
}

export interface Coords {
  lat: number;
  lon: number;
}

export interface QueryResult {
  coords: Coords;
  /** Elevación del terreno en metros sobre el nivel del mar. */
  terrainElevation: number | null;
  terrainSource: string | null;
  /** Altura de vuelo prevista, en metros sobre el terreno. */
  flightHeightAgl: number;
  zones: EvaluatedZone[];
  verdict: Verdict;
  queriedAt: string;
  /** Capas que no respondieron, para poder avisar de que el dato es parcial. */
  failedLayers: LayerKey[];
  /** true si se ha resuelto con el paquete descargado, sin conexión. */
  offline?: boolean;
  /** Fecha de descarga del paquete usado, si el resultado es sin conexión. */
  offlinePackDate?: string;
  /** Incertidumbre de la elevación usada (m). Sólo en modo sin cobertura. */
  elevationUncertaintyM?: number;
  /**
   * NOTAM sobre el punto. undefined: no se ha intentado consultar (modo sin
   * cobertura, donde no se guardan porque cambian a diario). null: se
   * intentó y falló. Array (posiblemente vacío): consulta correcta.
   * No condicionan `verdict` — su horario es texto libre y no se interpreta,
   * ver src/api/notam.ts — pero si hay alguno en vigor tiene que poder verse
   * sin tener que llegar hasta el final de la pantalla.
   */
  notams?: import('./api/notam').Notam[] | null;
}
