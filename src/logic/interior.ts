/**
 * Comunicación previa al Ministerio del Interior.
 *
 * Volar en entorno urbano obliga a comunicárselo al Ministerio del Interior
 * con al menos cinco días naturales de antelación (RD 517/2024, art. 40).
 *
 * Este módulo no genera nada, y es a propósito. Hubo aquí un relleno del
 * impreso oficial —cuatro páginas y setenta y tres casillas— que se quitó
 * cuando quedó claro que el Ministerio tiene su propia plataforma y funciona
 * mejor: en una sola comunicación entran todas las operaciones de cinco días,
 * recuerda los pilotos y las aeronaves de las veces anteriores, y se puede
 * comunicar en representación de otro. Competir con eso desde una app era
 * mantener ochocientas líneas y una plantilla de 335 KB para hacerlo peor.
 *
 * Así que la app se limita a llevarte allí.
 *
 * Ojo con la primera URL: es la aplicación en sí, y una visita sin sesión
 * rebota a la portada de la Sede —comprobado— porque el trámite exige
 * identificarse con certificado o Cl@ve. Por eso se ofrece también la página
 * del Ministerio que lo explica, que es estable y no pide nada para leerla.
 */

export const INTERIOR_FORM_URL = 'https://drones.ses.mir.es/drones-web/comunicacion';

export const INTERIOR_INFO_URL =
  'https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/comunicacion-operaciones-de-aeronaves-pilotadas-por-control-remoto-uas/';
