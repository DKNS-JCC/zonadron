/**
 * ¿Estoy en entorno urbano?
 *
 * ENAIRE no lo dice: su capa urbana es un aviso que cubre toda España y que
 * literalmente te manda comprobarlo a ti. El art. 40 del RD 517/2024 sí define
 * qué es un entorno urbano —núcleo consolidado, área residencial/comercial/
 * industrial con servicios, o área recreativa de acceso público— y le cuelga
 * obligaciones concretas. Esto intenta responder a esa pregunta cruzando dos
 * fuentes oficiales:
 *
 *  - CATASTRO (OVC, `Consulta_RCCOOR`): dice si la parcela bajo tus pies es
 *    urbana o rústica, y da la dirección. Es el dato más fresco que hay.
 *  - SIOSE (WMS del IGN, `GetFeatureInfo`): dice qué ocupa el suelo — casco,
 *    ensanche, cultivo, playa… Cubre toda España pero es del año 2015.
 *
 * Las dos van en paralelo y responden en décimas de segundo. Ninguna de las
 * dos, ni juntas, determinan legalmente nada: el supuesto b) del art. 40 exige
 * accesos rodados, viales pavimentados, saneamiento y alumbrado público, y eso
 * no está en ningún dato público. Por eso aquí no existe un "no es urbano"
 * rotundo: como mucho "no lo hemos detectado", que es lo único cierto.
 *
 * Navarra y el País Vasco quedan fuera a propósito: tienen catastro foral y el
 * servicio del Catastro no responde ahí, así que preferimos decir que no hay
 * datos antes que dar media respuesta.
 */

import { t } from '../i18n';
import type { Coords } from '../types';

export const CATASTRO_SOURCE = 'Dirección General del Catastro';
export const SIOSE_SOURCE = 'SIOSE · IGN';

/** Comunidades con catastro propio, donde no tenemos la mitad de los datos. */
export const REGIONS_WITHOUT_DATA = ['ES-PV', 'ES-NC'];

/**
 * Qué hemos podido averiguar.
 *
 *  - `urbano`     las dos fuentes coinciden: entorno urbano.
 *  - `probable`   sólo una lo ve. Puede ser una casa suelta en el campo o una
 *                 urbanización que SIOSE todavía no conoce.
 *  - `parque`     zona verde urbana: es el supuesto c) del art. 40.
 *  - `no-detectado` ninguna fuente ve suelo urbano aquí.
 *  - `sin-region` Navarra o País Vasco.
 *  - `sin-datos`  los servicios no han respondido.
 */
export type UrbanLevel = 'urbano' | 'probable' | 'parque' | 'no-detectado' | 'sin-region' | 'sin-datos';

/** Supuesto del art. 40.1 que encaja con lo encontrado. */
export type UrbanCase = 'a' | 'b' | 'c';

export type CatastroKind = 'urbana' | 'rustica' | 'sin-parcela' | 'sin-servicio';

export interface UrbanEvidence {
  catastro: CatastroKind;
  /** Código CODIIGE de SIOSE bajo el punto, o null si no hay dato. */
  siose: number | null;
  /**
   * Códigos de lo que hay alrededor, a unos 40 m. Sin esto, una avenida en
   * mitad de una ciudad sale como "red viaria" y la app diría que no ha
   * detectado entorno urbano — que es justo el error que no puede cometer.
   */
  around: number[];
}

export interface UrbanContext extends UrbanEvidence {
  level: UrbanLevel;
  supuesto: UrbanCase | null;
  /** La decisión se ha apoyado en lo que rodea al punto, no en el punto. */
  surrounded: boolean;
  /** Dirección catastral tal cual la publica el Catastro. */
  direccion: string | null;
  /** Etiqueta de SIOSE tal cual: "Casco", "Cultivo herbáceo"… */
  cobertura: string | null;
}

/* ------------------------------------------------------------------ */
/* Clasificación                                                       */
/* ------------------------------------------------------------------ */

/**
 * Familias de códigos CODIIGE. Los rangos están comprobados contra el servicio
 * en puntos conocidos (casco 111, ensanche 112, discontinuo 113, zona verde
 * urbana 114, dotacional 140, red viaria 161, aeropuerto 163, cultivo 210,
 * bosque 311, playa 351); el resto sigue la estructura de la nomenclatura, en
 * la que el grupo 1 son superficies artificiales.
 */
function sioseFamily(code: number | null): 'nucleo' | 'zona-verde' | 'construido' | 'infraestructura' | 'natural' | null {
  if (code === null || !Number.isFinite(code)) return null;
  if (code === 114) return 'zona-verde';
  if (code >= 110 && code < 120) return 'nucleo';
  if (code >= 120 && code < 150) return 'construido';
  // Carreteras, ferrocarril, puertos y aeropuertos son suelo artificial, pero
  // una autovía en mitad del campo no es un entorno urbano. No decide.
  if (code >= 150 && code < 200) return 'infraestructura';
  return 'natural';
}

export interface UrbanVerdict {
  level: UrbanLevel;
  supuesto: UrbanCase | null;
  surrounded: boolean;
}

/**
 * Cruza lo que dicen las fuentes. Es una función pura a propósito: es la única
 * parte con criterio propio y tiene que poder comprobarse sin red.
 *
 * La regla, en una frase: estás en entorno urbano si el suelo que pisas es
 * urbano, o si lo que te rodea lo es. Lo segundo hace falta porque las calles
 * y las avenidas se clasifican como red viaria: sin mirar alrededor, el centro
 * de Salamanca no sería una ciudad.
 */
export function classifyUrban(evidence: UrbanEvidence): UrbanVerdict {
  const { catastro } = evidence;
  const family = sioseFamily(evidence.siose);
  const around = (evidence.around ?? []).map(sioseFamily);

  if (catastro === 'sin-servicio' && family === null && around.length === 0) {
    return { level: 'sin-datos', supuesto: null, surrounded: false };
  }

  const urbanAround = around.filter((f) => f === 'nucleo' || f === 'construido');
  // Dos polígonos urbanos y al menos la mitad de la muestra: un edificio suelto
  // junto a una carretera no convierte el campo en ciudad.
  const surrounded = urbanAround.length >= 2 && urbanAround.length * 2 >= around.length;
  const nucleoAround = around.filter((f) => f === 'nucleo').length;

  const urbanaCatastro = catastro === 'urbana';
  const nucleo = family === 'nucleo';
  const construido = family === 'construido';
  const suelourbano = nucleo || construido;

  const supuesto: UrbanCase = nucleo || (surrounded && nucleoAround * 2 >= urbanAround.length) ? 'a' : 'b';

  // Un parque urbano es el supuesto c). Si además la parcela es urbana o está
  // rodeado de ciudad, estás en la ciudad y punto: llamarle "zona verde" a la
  // plaza del ayuntamiento confunde, aunque SIOSE la clasifique así.
  if (family === 'zona-verde') {
    const dentro = urbanaCatastro || surrounded;
    return { level: dentro ? 'urbano' : 'parque', supuesto: 'c', surrounded };
  }

  // El suelo dice casco o ensanche y no hay parcela que consultar —una calle,
  // una plaza—: eso ya es estar dentro del núcleo, sin más comprobaciones.
  if (nucleo && (catastro === 'sin-parcela' || catastro === 'sin-servicio')) {
    return { level: 'urbano', supuesto: 'a', surrounded: false };
  }

  // Dos señales de acuerdo: el suelo y el catastro, o el suelo y el vecindario.
  if ((suelourbano || surrounded) && (urbanaCatastro || (suelourbano && surrounded))) {
    return { level: 'urbano', supuesto, surrounded: surrounded && !suelourbano };
  }

  // Una sola señal: hay indicio, no certeza.
  if (urbanaCatastro || suelourbano || surrounded) {
    return {
      level: 'probable',
      supuesto: suelourbano || surrounded ? supuesto : null,
      surrounded: surrounded && !suelourbano,
    };
  }

  if (catastro === 'sin-servicio' && family === 'infraestructura') {
    return { level: 'sin-datos', supuesto: null, surrounded: false };
  }

  return { level: 'no-detectado', supuesto: null, surrounded: false };
}

/* ------------------------------------------------------------------ */
/* Fuentes                                                             */
/* ------------------------------------------------------------------ */

const CATASTRO_URL =
  // HTTPS a propósito: Android bloquea el tráfico en claro en release y iOS
  // lo bloquea con ATS, así que por http la tarjeta fallaría sólo en el móvil.
  'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR';
const SIOSE_URL = 'https://servicios.idee.es/wms-inspire/ocupacion-suelo';

/** Los servicios oficiales son rápidos, pero no vamos a esperarlos eternamente. */
const TIMEOUT_MS = 9000;

async function fetchText(url: string, signal: AbortSignal | undefined): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: '*/*' } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Una parcela rústica se publica como "Polígono 27 Parcela 2 …" y una urbana
 * con su calle y su número. Es la distinción que hace el propio Catastro.
 */
export function parseCatastro(xml: string | null): { kind: CatastroKind; direccion: string | null } {
  if (!xml) return { kind: 'sin-servicio', direccion: null };
  // <cuerr> distinto de 0 significa que no hay parcela en esas coordenadas.
  const ldt = /<ldt>([\s\S]*?)<\/ldt>/.exec(xml)?.[1]?.trim() ?? '';
  if (!ldt) return { kind: 'sin-parcela', direccion: null };
  if (/^pol[íi]gono\s/i.test(ldt)) return { kind: 'rustica', direccion: ldt };
  return { kind: 'urbana', direccion: ldt };
}

/** Ocupación del suelo en el punto exacto, del servicio INSPIRE del IGN. */
export function parseSiose(body: string | null): { code: number | null; label: string | null } {
  if (!body) return { code: null, label: null };
  try {
    const json = JSON.parse(body);
    const props = json?.features?.[0]?.properties;
    if (!props) return { code: null, label: null };
    const code = Number(props.codiige);
    return {
      code: Number.isFinite(code) ? code : null,
      label: typeof props.codiige_valor === 'string' ? props.codiige_valor : null,
    };
  } catch {
    return { code: null, label: null };
  }
}

/**
 * Consulta al WMS. Sin `buffer` responde por el píxel exacto; con él, por todo
 * lo que haya en ese radio de píxeles — unos 40 m con esta caja — que es como
 * se mira el vecindario sin lanzar cuatro peticiones.
 */
function sioseUrl(lat: number, lon: number, buffer?: number): string {
  const d = 0.0004;
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetFeatureInfo',
    layers: 'LC.LandCoverSurfaces',
    query_layers: 'LC.LandCoverSurfaces',
    crs: 'EPSG:4326',
    bbox: `${lat - d},${lon - d},${lat + d},${lon + d}`,
    width: '51',
    height: '51',
    i: '25',
    j: '25',
    info_format: 'application/json',
    feature_count: buffer ? '8' : '1',
    ...(buffer ? { buffer: String(buffer) } : {}),
  });
  return `${SIOSE_URL}?${params}`;
}

/** Todos los códigos de una respuesta con varios polígonos. */
export function parseSioseAround(body: string | null): number[] {
  if (!body) return [];
  try {
    const json = JSON.parse(body);
    const features = Array.isArray(json?.features) ? json.features : [];
    return features
      .map((f: { properties?: { codiige?: unknown } }) => Number(f?.properties?.codiige))
      .filter((code: number) => Number.isFinite(code));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Consulta                                                            */
/* ------------------------------------------------------------------ */

/**
 * Caché por celda de ~11 m. Lo urbano no depende de la altura de vuelo, y
 * cambiarla relanza la consulta entera: sin esto, subir de 30 a 120 m volvería
 * a molestar a dos servicios oficiales para nada.
 */
const cache = new Map<string, UrbanContext>();

const SIN_REGION: UrbanContext = {
  level: 'sin-region',
  supuesto: null,
  surrounded: false,
  catastro: 'sin-servicio',
  siose: null,
  around: [],
  direccion: null,
  cobertura: null,
};

export async function checkUrbanContext(
  coords: Coords,
  regionIso: string | null,
  signal?: AbortSignal,
): Promise<UrbanContext> {
  if (regionIso && REGIONS_WITHOUT_DATA.includes(regionIso)) return SIN_REGION;

  const key = `${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  // Las tres a la vez: tardan lo que la más lenta, unas décimas de segundo.
  const [catastroXml, sioseBody, aroundBody] = await Promise.all([
    fetchText(`${CATASTRO_URL}?SRS=EPSG:4326&Coordenada_X=${coords.lon}&Coordenada_Y=${coords.lat}`, signal),
    fetchText(sioseUrl(coords.lat, coords.lon), signal),
    fetchText(sioseUrl(coords.lat, coords.lon, 25), signal),
  ]);

  const catastro = parseCatastro(catastroXml);
  const siose = parseSiose(sioseBody);
  const around = parseSioseAround(aroundBody);
  const { level, supuesto, surrounded } = classifyUrban({
    catastro: catastro.kind,
    siose: siose.code,
    around,
  });

  const context: UrbanContext = {
    level,
    supuesto,
    surrounded,
    catastro: catastro.kind,
    siose: siose.code,
    around,
    direccion: catastro.direccion,
    cobertura: siose.label,
  };
  // Un fallo de red no se cachea: la próxima vez puede haber cobertura.
  if (level !== 'sin-datos') cache.set(key, context);
  return context;
}

/** Texto del supuesto del art. 40 que aplica, para enseñarlo tal cual. */
export function urbanCaseLabel(supuesto: UrbanCase | null): string | null {
  if (supuesto === 'a') return t('urban.case.a');
  if (supuesto === 'b') return t('urban.case.b');
  if (supuesto === 'c') return t('urban.case.c');
  return null;
}
