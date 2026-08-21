/**
 * Apoyar el proyecto.
 *
 * La app es gratis, no lleva anuncios, no tiene servidor y no rastrea a nadie.
 * Eso no se paga solo —hay una cuota de desarrollador, y sobre todo horas—, así
 * que hay una puerta abierta para quien quiera invitar a un café. Nada más.
 *
 * Dos reglas que no se saltan:
 *
 *  - **Donar no desbloquea nada.** Todo lo que hace la app la hace para todo el
 *    mundo. Aparte de ser lo decente en una herramienta de seguridad —el que no
 *    paga no puede tener peor información sobre dónde puede volar—, es lo que
 *    exigen las reglas de pago de Google Play: en cuanto un pago da acceso a
 *    algo dentro de la app deja de ser una donación y tiene que pasar por la
 *    facturación de Play. Si algún día se venden extras (temas, distintivo),
 *    será por ahí y en su sitio, no por este enlace.
 *  - **Sin URL no hay botón.** Mientras esta constante esté vacía, la tarjeta no
 *    se enseña: antes que un botón de donar que lleva a una página que no
 *    existe, mejor ninguno.
 */

/**
 * Dónde se puede invitar a un café: GitHub Sponsors, Ko-fi, lo que sea.
 * Vacío = la tarjeta no aparece en Ajustes.
 */
export const SUPPORT_URL = '';

/** ¿Hay sitio al que mandar a quien quiera apoyar? */
export function supportAvailable(): boolean {
  return SUPPORT_URL.trim().length > 0;
}
