/**
 * Cliente educado de Open-Meteo.
 *
 * El límite por minuto de la API gratuita se cuenta por COORDENADAS, no por
 * peticiones. Medido contra la API real: seis peticiones de 100 puntos pasan y
 * la séptima recibe 429 con «Minutely API request limit exceeded», siempre a
 * los 600 puntos exactos.
 *
 * Esto importaba mucho aquí: la rejilla de elevación de un paquete de 25 km son
 * ~2.650 puntos, o sea 27 peticiones. Lanzadas seguidas se agotaba el minuto en
 * la séptima y la descarga moría con «no se pudo descargar la elevación», con
 * cualquier conexión y por muchas veces que se reintentara — porque el contador
 * tarda un minuto en resetearse y los reintentos esperaban 2,6 segundos.
 *
 * Por eso el ritmo se lleva con un presupuesto de ventana móvil en vez de con
 * una pausa fija entre llamadas, y un 429 se espera de verdad: un minuto.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Coordenadas por minuto que nos permitimos. El límite medido son 600; se deja
 * margen para las consultas sueltas de un punto (elevación del terreno al
 * consultar, meteorología) que van por su cuenta y también cuentan.
 */
export const MINUTE_BUDGET = 550;

/**
 * Reserva para las consultas sueltas de un punto. El límite real son 600 y el
 * presupuesto 550: esos 50 son de las consultas interactivas, para que una
 * descarga de miles de puntos no deje sin elevación a quien está mirando el
 * mapa. Sin esto, descargar una zona apagaba el terreno de toda la app.
 */
const INTERACTIVE_HEADROOM = 50;

/** Peso máximo que se considera "una consulta suelta". */
const INTERACTIVE_WEIGHT = 2;

/** Ventana del límite, más un pelín de margen por el reloj. */
const WINDOW_MS = 60_000;
const WINDOW_SLACK_MS = 1_500;

/** Separación mínima entre llamadas, por educación. */
const MIN_GAP_MS = 180;
let lastCall = 0;

/** Lo gastado en la ventana móvil: cada entrada es una petición y su peso. */
let spent: { at: number; weight: number }[] = [];

function trim(now: number) {
  spent = spent.filter((s) => now - s.at < WINDOW_MS);
}

function usedNow(): number {
  const now = Date.now();
  trim(now);
  return spent.reduce((a, s) => a + s.weight, 0);
}

/** Cuánto habría que esperar para que quepan `weight` coordenadas más. */
function waitFor(weight: number): number {
  const now = Date.now();
  trim(now);
  const used = spent.reduce((a, s) => a + s.weight, 0);
  const cap = weight <= INTERACTIVE_WEIGHT ? MINUTE_BUDGET + INTERACTIVE_HEADROOM : MINUTE_BUDGET;
  // Si no hay nada en vuelo no se espera aunque el peso supere el presupuesto:
  // esperar no lo haría caber, y bloquearía para siempre.
  if (used + weight <= cap || spent.length === 0) return 0;
  const oldest = spent[0].at;
  return Math.max(250, WINDOW_MS - (now - oldest) + WINDOW_SLACK_MS);
}

/**
 * Da por agotado el minuto entero. Se llama al recibir un 429: la API no manda
 * cabecera `Retry-After`, así que lo único que se puede hacer es esperar a que
 * pase la ventana.
 */
function markExhausted() {
  spent = [{ at: Date.now(), weight: MINUTE_BUDGET }];
}

/** Reserva presupuesto, esperando lo que haga falta. */
async function reserve(
  weight: number,
  signal?: AbortSignal,
  onWait?: (remainingMs: number, totalMs: number) => void,
  maxWaitMs?: number,
): Promise<void> {
  for (;;) {
    if (signal?.aborted) throw new Error('cancelado');
    const wait = waitFor(weight);
    if (maxWaitMs !== undefined && wait > maxWaitMs) throw new RateLimitError('minute');
    if (wait === 0) {
      const since = Date.now() - lastCall;
      if (since < MIN_GAP_MS) await sleep(MIN_GAP_MS - since);
      lastCall = Date.now();
      spent.push({ at: Date.now(), weight });
      return;
    }
    // Se duerme a trocitos para poder atender la cancelación sin esperar el
    // minuto entero (una descarga que no se puede parar es una descarga rota)
    // y, de paso, para ir contando lo que queda.
    const until = Date.now() + wait;
    onWait?.(wait, wait);
    while (Date.now() < until) {
      if (signal?.aborted) throw new Error('cancelado');
      await sleep(Math.min(400, until - Date.now()));
      onWait?.(Math.max(0, until - Date.now()), wait);
    }
  }
}

export interface OpenMeteoOptions {
  signal?: AbortSignal;
  /** Coordenadas que pide esta llamada. Es lo que cuenta para el límite. */
  weight?: number;
  attempts?: number;
  /**
   * Tope de espera por el presupuesto. Una consulta interactiva pone 0: más
   * vale resolverla por otra vía al momento que dejar al usuario mirando el
   * mapa un minuto. La descarga no lo pone, porque ahí esperar es el trabajo.
   */
  maxWaitMs?: number;
  /**
   * Se llama repetidamente mientras se espera al límite, con lo que queda y lo
   * que dura la espera entera. Sirve para que la barra de progreso siga
   * moviéndose: la espera es tiempo conocido, así que avanzar durante ella no
   * es simular nada.
   */
  onWait?: (remainingMs: number, totalMs: number) => void;
}

/**
 * Tope alcanzado. `scope` importa mucho: el del minuto se pasa esperando, el de
 * la hora o el del día no. Insistir contra esos dos es exactamente el error que
 * tenía la versión anterior — reintentar algo que no se va a arreglar solo.
 */
export class RateLimitError extends Error {
  constructor(readonly scope: 'minute' | 'hour' | 'day') {
    super(`Open-Meteo: límite por ${scope}`);
    this.name = 'RateLimitError';
  }
}

function limitScope(body: string): 'minute' | 'hour' | 'day' {
  if (/hourly/i.test(body)) return 'hour';
  if (/daily/i.test(body)) return 'day';
  return 'minute';
}

/** GET con presupuesto, reintentos y espera real ante un 429. */
export async function openMeteoJson(url: string, options: OpenMeteoOptions = {}): Promise<any> {
  const { signal, weight = 1, attempts = 5, onWait, maxWaitMs } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) throw new Error('cancelado');
    await reserve(weight, signal, onWait, maxWaitMs);
    try {
      const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
      if (res.status === 429) {
        const scope = limitScope(await res.text().catch(() => ''));
        // El del minuto se espera; los otros dos no se arreglan insistiendo.
        if (scope !== 'minute') throw new RateLimitError(scope);
        markExhausted();
        throw new RateLimitError('minute');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Open-Meteo devuelve 200 con {error:true} en algunos casos.
      if (json?.error) throw new Error(String(json.reason ?? 'Open-Meteo ha rechazado la petición'));
      return json;
    } catch (err) {
      lastError = err;
      if (signal?.aborted) throw err;
      // Hora o día: no hay nada que esperar dentro de esta descarga.
      if (err instanceof RateLimitError && err.scope !== 'minute') throw err;
      if (attempt === attempts - 1) break;
      // El del minuto ya se cobró en el presupuesto y `reserve` esperará en la
      // siguiente vuelta; el resto son fallos de red y basta con poco.
      if (!(err instanceof RateLimitError)) {
        await sleep(600 * (attempt + 1));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Open-Meteo no responde');
}

/** Máximo de coordenadas por petición que admite la API. */
export const MAX_POINTS_PER_CALL = 100;

export interface ElevationProgress {
  /**
   * Avance, 0-1. Durante una espera al límite avanza interpolando por tiempo
   * dentro del tramo que se va a pedir a continuación: la espera dura lo que
   * dura y se sabe, así que la barra no tiene por qué quedarse clavada.
   */
  pct: number;
  /** Segundos que se estima que queda, contando las esperas pendientes. */
  etaSeconds: number;
}

/**
 * Elevaciones de una lista de puntos.
 *
 * A `MINUTE_BUDGET` coordenadas por minuto, una rejilla de 25 km tarda unos
 * cuatro minutos. Es lento, pero es lo que da la fuente gratuita: antes esto no
 * tardaba cuatro minutos, simplemente fallaba a los cinco segundos.
 */
export type ElevationFailure = 'hour' | 'day' | 'network';

export interface ElevationResult {
  values: number[] | null;
  /** Por qué no hay valores. Sirve para decírselo al usuario en cristiano. */
  reason?: ElevationFailure;
}

export async function elevations(
  points: { lat: number; lon: number }[],
  signal?: AbortSignal,
  onProgress?: (p: ElevationProgress) => void,
): Promise<ElevationResult> {
  const out: number[] = [];
  // Marca de agua: el progreso no puede bajar nunca. Si tras esperar el minuto
  // la API responde otro 429 (su contador y el nuestro no arrancan a la vez),
  // se abre una segunda espera con los mismos puntos hechos, y la interpolación
  // volvería a empezar desde abajo.
  let highWater = 0;
  const report = (pct: number, etaSeconds: number) => {
    highWater = Math.max(highWater, pct);
    onProgress?.({ pct: highWater, etaSeconds });
  };

  for (let i = 0; i < points.length; i += MAX_POINTS_PER_CALL) {
    const chunk = points.slice(i, i + MAX_POINTS_PER_CALL);
    const la = chunk.map((p) => p.lat.toFixed(5)).join(',');
    const lo = chunk.map((p) => p.lon.toFixed(5)).join(',');
    try {
      const json = await openMeteoJson(
        `https://api.open-meteo.com/v1/elevation?latitude=${la}&longitude=${lo}`,
        {
          signal,
          weight: chunk.length,
          onWait: (remainingMs, totalMs) => {
            const base = out.length / points.length;
            // Lo que entrará cuando se abra el minuto no es esta petición sola:
            // es un presupuesto entero de golpe. Interpolar sobre el tramo
            // pequeño dejaba la barra gateando y luego pegando un salto.
            const burst = Math.min(points.length - out.length, MINUTE_BUDGET);
            const span = burst / points.length;
            const done = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
            // Tope del 90% del tramo: el 100% es de cuando el dato está.
            report(
              base + span * Math.min(1, Math.max(0, done)) * 0.9,
              etaFor(points.length, out.length, remainingMs),
            );
          },
        },
      );
      if (!Array.isArray(json?.elevation) || json.elevation.length !== chunk.length) {
        return { values: null, reason: 'network' };
      }
      out.push(...json.elevation.map((v: unknown) => Number(v)));
      report(out.length / points.length, etaFor(points.length, out.length, 0));
    } catch (err) {
      if (signal?.aborted) throw err;
      if (err instanceof RateLimitError && err.scope !== 'minute') {
        return { values: null, reason: err.scope };
      }
      return { values: null, reason: 'network' };
    }
  }
  return { values: out };
}

/**
 * Lo que queda: la espera en curso, más lo que tarden los puntos que aún no
 * caben en este minuto. Los que sí caben salen sin esperar y no suman.
 */
function etaFor(total: number, done: number, remainingWaitMs: number): number {
  const pending = Math.max(0, total - done);
  const libresAhora = Math.max(0, MINUTE_BUDGET - usedNow());
  const traslaEspera = Math.max(0, pending - libresAhora - MAX_POINTS_PER_CALL);
  return Math.round(remainingWaitMs / 1000 + (traslaEspera / MINUTE_BUDGET) * 60);
}
