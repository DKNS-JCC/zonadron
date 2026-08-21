/**
 * Identificadores internos.
 *
 * No se enseñan nunca: sólo sirven para enlazar un documento con su dron y un
 * archivo con su ficha. La hora por delante los deja ordenados por antigüedad
 * de forma natural, y las seis letras del final evitan que dos cosas creadas
 * en el mismo milisegundo se pisen.
 */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
