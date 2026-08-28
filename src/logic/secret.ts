/**
 * La cuenta de toques del despegue escondido de Ajustes.
 *
 * Vive aparte del componente por una razón concreta: es la única parte del
 * huevo de pascua que puede salir mal de forma molesta. Si la cuenta se
 * disparase con los toques normales de alguien trasteando en Ajustes, dejaría
 * de estar escondido; y si no se reiniciara, siete toques repartidos a lo largo
 * de una tarde lo destaparían solo. Aquí es una función pura y se puede
 * comprobar de verdad — ver `tests/secret.test.ts`.
 */

/** Toques seguidos que hacen falta. Tres se dan sin querer; siete, no. */
export const SECRET_TAPS = 7;

/** Si pasa más de esto entre dos toques, la cuenta vuelve a empezar. */
export const SECRET_RESET_MS = 2500;

export interface TapState {
  count: number;
  lastAt: number;
}

export const NO_TAPS: TapState = { count: 0, lastAt: 0 };

/**
 * Registra un toque y dice si toca despegar.
 *
 * Al acertar la cuenta vuelve a cero, para que el siguiente despegue exija los
 * siete otra vez en vez de encadenarse con cada toque suelto.
 */
export function registerTap(state: TapState, now: number): { state: TapState; launch: boolean } {
  const seguido = now - state.lastAt <= SECRET_RESET_MS;
  const count = seguido ? state.count + 1 : 1;

  if (count >= SECRET_TAPS) {
    return { state: { count: 0, lastAt: now }, launch: true };
  }
  return { state: { count, lastAt: now }, launch: false };
}
