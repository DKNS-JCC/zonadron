/**
 * Movimiento.
 *
 * Traducción a React Native de los criterios de la guía de diseño de Apple
 * (charlas de la WWDC, sobre todo "Designing Fluid Interfaces").
 *
 * La idea de fondo: una interfaz se siente viva cuando el movimiento arranca del
 * valor que hay ahora mismo en pantalla, hereda la velocidad del dedo, proyecta
 * el impulso hacia delante y se puede agarrar y revertir en cualquier instante.
 * El muelle es la herramienta que lo permite, porque por definición es
 * interrumpible y sabe de velocidad; una animación de duración fija, no.
 *
 * Apple no habla de masa/rigidez/amortiguación, sino de dos parámetros:
 *   - Amortiguación (damping ratio): 1,0 = sin rebote; por debajo, rebota.
 *   - Respuesta (response): en segundos, lo rápido que llega. NO es duración:
 *     un muelle no tiene duración fija, su reposo emerge de los parámetros.
 *
 * React Native pide rigidez y amortiguación físicas, así que se convierten:
 *   ω = 2π / respuesta ; rigidez = ω² ; amortiguación = 2·ζ·ω   (masa = 1)
 */

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

/** Muelle a partir de la respuesta (s) y la amortiguación (0–1) de Apple. */
export function spring(response: number, dampingRatio: number): SpringConfig {
  const omega = (2 * Math.PI) / response;
  return {
    stiffness: omega * omega,
    damping: 2 * dampingRatio * omega,
    mass: 1,
  };
}

/**
 * Muelles de la casa. Por defecto, amortiguación 1,0: nada rebota salvo que el
 * gesto haya traído impulso. Un menú que sólo aparece no debe rebotar; una
 * tarjeta que has lanzado con el dedo, sí.
 *
 * Los valores de MOVE, ROTATE y SHEET son los que Apple publica.
 */
export const SPRINGS = {
  /** Presiones y realces: tiene que ir por delante del dedo. */
  press: spring(0.15, 1.0),
  /** Cambios de interfaz corrientes: desplegar, aparecer, colocar. */
  ui: spring(0.35, 1.0),
  /** Reposicionar algo (Apple: PiP). */
  move: spring(0.4, 1.0),
  /** Rotaciones. */
  rotate: spring(0.4, 0.8),
  /** Cajones y hojas: llevan impulso, así que rebotan un poco. */
  sheet: spring(0.3, 0.8),
  /** Sueltas con impulso: rebote leve porque el gesto lo traía. */
  flick: spring(0.4, 0.8),
} as const;

/**
 * Dónde acabaría el movimiento si lo dejas correr, a partir de la velocidad de
 * suelta. Es la función exacta de Apple (decaimiento exponencial), no la del
 * libro de física: se proyecta el punto de reposo y se ancla al destino más
 * cercano a ESE punto, no al más cercano al punto de suelta. Es lo que hace que
 * un golpe de dedo se sienta como un lanzamiento.
 *
 * @param velocity píxeles por segundo
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Resistencia progresiva en los bordes. Un tope duro se lee como "se ha
 * colgado"; la resistencia creciente se lee como "responde, pero aquí se acabó".
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Velocidad relativa, para las APIs que la piden normalizada. */
export function relativeVelocity(velocity: number, target: number, current: number): number {
  const distance = target - current;
  return distance === 0 ? 0 : velocity / distance;
}

/** Duraciones de los cruces de opacidad cuando el usuario pide menos movimiento. */
export const REDUCED_FADE_MS = 200;
