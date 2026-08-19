import { useEffect, useState } from 'react';
import { getProtectedAreasAt, type ProtectedArea } from '../api/protected';
import type { Coords } from '../types';

/**
 * Espacios protegidos de un punto, consultados una sola vez y compartidos.
 *
 * Vive aquí arriba y no dentro de su tarjeta porque hay dos sitios que
 * necesitan el dato: la tarjeta en sí y el veredicto, que tiene que dejar de
 * pintarse en verde de «todo correcto» cuando estás dentro de un parque.
 *
 * `undefined` mientras carga, `null` si no se ha podido consultar, y un array
 * (posiblemente vacío) si la consulta fue bien: son tres cosas distintas y la
 * interfaz las cuenta distinto.
 */
export function useProtectedAreas(coords: Coords): ProtectedArea[] | null | undefined {
  const [areas, setAreas] = useState<ProtectedArea[] | null | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    setAreas(undefined);
    getProtectedAreasAt(coords.lat, coords.lon, controller.signal).then(
      (a) => !controller.signal.aborted && setAreas(a),
    );
    return () => controller.abort();
  }, [coords.lat, coords.lon]);

  return areas;
}
