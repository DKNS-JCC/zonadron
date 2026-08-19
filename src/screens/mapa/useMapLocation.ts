import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FALLBACK_CENTER,
  ensureLocationPermission,
  getPreciseFix,
  getQuickFix,
  loadRememberedCoords,
  rememberCoords,
} from '../../logic/location';
import type { Coords } from '../../types';

export interface MapCenter {
  lat: number;
  lon: number;
  zoom: number;
}

/**
 * Centro del mapa y quién manda sobre él.
 *
 * Se resuelve en tres escalones (última posición guardada → fix cacheado del
 * sistema → fix preciso, ver src/logic/location.ts) para poder construir el
 * mapa ya, sin esperar al GPS. Mientras nadie haya tocado el mapa, cada fix
 * que llega lo recentra; en cuanto el usuario paneas a mano, se acabaron los
 * recentrados automáticos — `notifyUserMoved` es lo que marca ese cambio de
 * mando, y hay que llamarlo desde el `movestart` del mapa.
 */
export function useMapLocation(
  send: (msg: object) => void,
  hasParams: boolean,
  paramLat: number,
  paramLon: number,
) {
  const [initialCenter, setInitialCenter] = useState<MapCenter | null>(
    hasParams ? { lat: paramLat, lon: paramLon, zoom: 14 } : null,
  );
  const autoCenter = useRef(!hasParams);
  // El mapa avisa de 'movestart' tanto si mueves tú como si movemos nosotros
  // con `centerOn`; esta ventana es lo que distingue una cosa de la otra.
  const programmaticUntil = useRef(0);

  const centerOn = useCallback(
    (coords: Coords, zoom: number) => {
      programmaticUntil.current = Date.now() + 1500;
      send({ type: 'center', lat: coords.lat, lon: coords.lon, zoom });
    },
    [send],
  );

  useEffect(() => {
    if (hasParams) return;
    let alive = true;
    (async () => {
      const remembered = await loadRememberedCoords();
      if (!alive) return;
      // Sin nada guardado se encuadra España entera: es más honesto que
      // plantar al usuario en Madrid como si supiéramos que está ahí.
      setInitialCenter(
        remembered
          ? { lat: remembered.lat, lon: remembered.lon, zoom: 13 }
          : { lat: FALLBACK_CENTER.lat, lon: FALLBACK_CENTER.lon, zoom: 6 },
      );

      const granted = await ensureLocationPermission();
      if (!alive || !granted) return;

      const quick = await getQuickFix();
      if (!alive) return;
      if (quick && autoCenter.current) centerOn(quick.coords, 14);

      try {
        const precise = await getPreciseFix();
        if (!alive) return;
        rememberCoords(precise.coords);
        if (autoCenter.current) centerOn(precise.coords, 15);
        if (precise.accuracy) {
          send({
            type: 'accuracy',
            lat: precise.coords.lat,
            lon: precise.coords.lon,
            radius: precise.accuracy,
          });
        }
      } catch {
        /* el usuario siempre puede mover el mapa a mano */
      }
    })();
    return () => {
      alive = false;
    };
    // Sólo al arrancar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si se llega con coordenadas y el mapa ya estaba abierto, se recentra.
  useEffect(() => {
    if (hasParams) send({ type: 'center', lat: paramLat, lon: paramLon, zoom: 14 });
  }, [hasParams, paramLat, paramLon, send]);

  /** El botón "centrar en mi ubicación": mismo patrón rápido→preciso. */
  const goToMyLocation = useCallback(async () => {
    const granted = await ensureLocationPermission();
    if (!granted) return;
    const quick = await getQuickFix();
    if (quick) centerOn(quick.coords, 15);
    try {
      const precise = await getPreciseFix();
      rememberCoords(precise.coords);
      centerOn(precise.coords, 15);
      if (precise.accuracy) {
        send({
          type: 'accuracy',
          lat: precise.coords.lat,
          lon: precise.coords.lon,
          radius: precise.accuracy,
        });
      }
    } catch {
      /* silencioso: el usuario puede mover el mapa a mano */
    }
  }, [send, centerOn]);

  /** Llamar en cada 'movestart' del mapa: distingue tu gesto del nuestro. */
  const notifyUserMoved = useCallback(() => {
    if (Date.now() > programmaticUntil.current) autoCenter.current = false;
  }, []);

  return { initialCenter, goToMyLocation, notifyUserMoved };
}
