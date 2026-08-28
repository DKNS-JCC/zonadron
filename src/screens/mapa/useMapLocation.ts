import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  FALLBACK_CENTER,
  ensureLocationPermission,
  getPreciseFix,
  getQuickFix,
  loadRememberedCoords,
  rememberCoords,
  type Fix,
} from '../../logic/location';
import type { Coords } from '../../types';

/**
 * Grados que tiene que girar la brújula para molestarse en repintar. El sensor
 * dispara decenas de veces por segundo y cada aviso cruza el puente hasta el
 * WebView; por debajo de esto el cono no se mueve de forma apreciable.
 */
const HEADING_STEP_DEG = 2;

export interface MapCenter {
  lat: number;
  lon: number;
  zoom: number;
}

/**
 * Centro del mapa, quién manda sobre él y el punto azul de «estás aquí».
 *
 * Se resuelve en tres escalones (última posición guardada → fix cacheado del
 * sistema → fix preciso, ver src/logic/location.ts) para poder construir el
 * mapa ya, sin esperar al GPS. Mientras nadie haya tocado el mapa, cada fix
 * que llega lo recentra; en cuanto el usuario paneas a mano, se acabaron los
 * recentrados automáticos — `notifyUserMoved` es lo que marca ese cambio de
 * mando, y hay que llamarlo desde el `movestart` del mapa.
 *
 * Aparte del encuadre, el hook mantiene vivo el marcador de posición: la
 * posición se sigue con `watchPositionAsync` y la orientación con la brújula,
 * y las dos se mandan juntas al mapa en el mensaje 'me'. Seguir la posición NO
 * recentra el mapa: de eso sigue mandando `autoCenter`.
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

  // Última posición y orientación conocidas. Se guardan por separado porque
  // llegan de dos sensores distintos, cada uno a su ritmo, pero el mapa las
  // quiere juntas: el punto y su cono son un solo marcador.
  const fixRef = useRef<Fix | null>(null);
  const headingRef = useRef<number | null>(null);

  /** Manda al mapa dónde estás y hacia dónde miras, con lo que se sepa de cada. */
  const pushMe = useCallback(() => {
    const fix = fixRef.current;
    if (!fix) return;
    send({
      type: 'me',
      lat: fix.coords.lat,
      lon: fix.coords.lon,
      accuracy: fix.accuracy,
      heading: headingRef.current,
    });
  }, [send]);

  const updateFix = useCallback(
    (fix: Fix) => {
      fixRef.current = fix;
      pushMe();
    },
    [pushMe],
  );

  const centerOn = useCallback(
    (coords: Coords, zoom: number) => {
      programmaticUntil.current = Date.now() + 1500;
      send({ type: 'center', lat: coords.lat, lon: coords.lon, zoom });
    },
    [send],
  );

  useEffect(() => {
    let alive = true;
    let posSub: Location.LocationSubscription | null = null;
    let headSub: Location.LocationSubscription | null = null;

    (async () => {
      // Con coordenadas en la URL el encuadre ya está decidido, pero el punto
      // azul se sigue queriendo: saber dónde estás respecto al sitio que te
      // han compartido es justo lo que hace falta ahí.
      if (!hasParams) {
        const remembered = await loadRememberedCoords();
        if (!alive) return;
        // Sin nada guardado se encuadra España entera: es más honesto que
        // plantar al usuario en Madrid como si supiéramos que está ahí.
        setInitialCenter(
          remembered
            ? { lat: remembered.lat, lon: remembered.lon, zoom: 13 }
            : { lat: FALLBACK_CENTER.lat, lon: FALLBACK_CENTER.lon, zoom: 6 },
        );
      }

      const granted = await ensureLocationPermission();
      if (!alive || !granted) return;

      const quick = await getQuickFix();
      if (!alive) return;
      if (quick) {
        updateFix(quick);
        if (autoCenter.current) centerOn(quick.coords, 14);
      }

      try {
        const precise = await getPreciseFix();
        if (!alive) return;
        rememberCoords(precise.coords);
        updateFix(precise);
        if (autoCenter.current) centerOn(precise.coords, 15);
      } catch {
        /* el usuario siempre puede mover el mapa a mano */
      }

      // De aquí en adelante el seguimiento es sólo para el marcador: el
      // encuadre ya está resuelto y no se vuelve a tocar por su cuenta.
      try {
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 3 },
          (pos) =>
            updateFix({
              coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
              accuracy: pos.coords.accuracy ?? null,
            }),
        );
        // La suscripción pudo llegar tarde a su propia limpieza.
        if (alive) posSub = sub;
        else sub.remove();
      } catch {
        /* sin seguimiento: el punto se queda en el último fix */
      }

      try {
        const sub = await Location.watchHeadingAsync((h) => {
          // trueHeading vale -1 mientras el sistema no sabe la declinación
          // magnética; hasta entonces el rumbo magnético es lo mejor que hay.
          const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (!Number.isFinite(deg) || deg < 0) return;
          if (headingRef.current !== null && Math.abs(deg - headingRef.current) < HEADING_STEP_DEG) {
            return;
          }
          headingRef.current = deg;
          pushMe();
        });
        if (alive) headSub = sub;
        else sub.remove();
      } catch {
        /* móvil sin brújula: el punto se queda sin cono, y ya está */
      }
    })();

    return () => {
      alive = false;
      posSub?.remove();
      headSub?.remove();
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
    if (quick) {
      updateFix(quick);
      centerOn(quick.coords, 15);
    }
    try {
      const precise = await getPreciseFix();
      rememberCoords(precise.coords);
      updateFix(precise);
      centerOn(precise.coords, 15);
    } catch {
      /* silencioso: el usuario puede mover el mapa a mano */
    }
  }, [centerOn, updateFix]);

  /** Llamar en cada 'movestart' del mapa: distingue tu gesto del nuestro. */
  const notifyUserMoved = useCallback(() => {
    if (Date.now() > programmaticUntil.current) autoCenter.current = false;
  }, []);

  return { initialCenter, goToMyLocation, notifyUserMoved, resyncMe: pushMe };
}
