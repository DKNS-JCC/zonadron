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
  /** Código CODIIGE de SIOSE, o null si no ha respondido / no hay dato. */
  siose: number | null;
}

export interface UrbanContext extends UrbanEvidence {
  level: UrbanLevel;
  supuesto: UrbanCase | null;
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

/**
 * Cruza las dos fuentes. Es una función pura a propósito: es la única parte
 * con criterio propio y tiene que poder comprobarse sin red.
 */
export function classifyUrban(evidence: UrbanEvidence): { level: UrbanLevel; supuesto: UrbanCase | null } {
  const { catastro } = evidence;
  const family = sioseFamily(evidence.siose);

  if (catastro === 'sin-servicio' && family === null) {
    return { level: 'sin-datos', supuesto: null };
  }

  const urbanaCatastro = catastro === 'urbana';

  // Un parque urbano es el supuesto c) aunque la parcela sea de titularidad
  // pública y el Catastro no diga nada de ella. Si además la parcela es
  // urbana, estás en la ciudad y punto: llamarle "zona verde" a la plaza del
  // ayuntamiento confunde, aunque SIOSE la clasifique así.
  if (family === 'zona-verde') {
    return { level: urbanaCatastro ? 'urbano' : 'parque', supuesto: 'c' };
  }

  const nucleo = family === 'nucleo';
  const construido = family === 'construido';

  if (urbanaCatastro && (nucleo || construido)) {
    return { level: 'urbano', supuesto: nucleo ? 'a' : 'b' };
  }

  // Sin parcela catastral (una calle, un camino, la playa) el suelo manda: si
  // SIOSE dice casco o ensanche, estás en el casco aunque pises asfalto.
  if (catastro === 'sin-parcela' && nucleo) return { level: 'urbano', supuesto: 'a' };

  // Una sola fuente: hay indicio, no certeza.
  if (urbanaCatastro || nucleo || construido) {
    return { level: 'probable', supuesto: nucleo ? 'a' : construido ? 'b' : null };
  }

  if (catastro === 'sin-servicio' && family === 'infraestructura') {
    return { level: 'sin-datos', supuesto: null };
  }

  return { level: 'no-detectado', supuesto: null };
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

function sioseUrl(lat: number, lon: number): string {
  // Una caja diminuta alrededor del punto y se pregunta por su píxel central.
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
  });
  return `${SIOSE_URL}?${params}`;
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
  catastro: 'sin-servicio',
  siose: null,
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

  const [catastroXml, sioseBody] = await Promise.all([
    fetchText(`${CATASTRO_URL}?SRS=EPSG:4326&Coordenada_X=${coords.lon}&Coordenada_Y=${coords.lat}`, signal),
    fetchText(sioseUrl(coords.lat, coords.lon), signal),
  ]);

  const catastro = parseCatastro(catastroXml);
  const siose = parseSiose(sioseBody);
  const { level, supuesto } = classifyUrban({ catastro: catastro.kind, siose: siose.code });

  const context: UrbanContext = {
    level,
    supuesto,
    catastro: catastro.kind,
    siose: siose.code,
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
