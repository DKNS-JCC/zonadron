import { useCallback, useEffect, useRef, useState } from 'react';
import { getNotamsIn, type NotamArea } from '../../api/notam';
import { notamReachable } from '../../logic/notam';
import type { MapView } from './useMapLayers';

/**
 * Las áreas de los NOTAM que hay a la vista.
 *
 * Los NOTAM son avisos temporales y son los que te pillan por sorpresa (ver
 * src/api/notam.ts). Hasta ahora sólo se veían poniendo la cruz justo encima
 * de uno; esto los dibuja enteros, para poder esquivarlos antes de llegar.
 *
 * Dos cosas que este hook hace y conviene tener claras:
 *
 *  - Filtra por altura. Uno de cada diez NOTAM arranca a niveles de vuelo
 *    donde un dron no llega; ver `notamReachable` en src/logic/notam.ts, que
 *    es quien decide. Los descartados se cuentan (`hidden`) porque ocultar
 *    cosas sin decirlo es de las peores costumbres que puede tener una app de
 *    seguridad.
 *  - Vuelve a filtrar, sin volver a pedir nada, cuando cambias la altura de
 *    vuelo o cuando llega la elevación del terreno: la lista cruda se guarda
 *    tal cual y el filtro se aplica encima.
 */

/** Espera tras mover el mapa, igual que la consulta de la cruz. */
const MOVE_DEBOUNCE_MS = 700;

/**
 * Por debajo de este zoom no se piden. Al alejarte, los polígonos se
 * amontonan hasta ser una mancha, y la mancha no dice nada útil.
 */
const MIN_ZOOM = 8;

/** Margen alrededor de lo que se ve, para que al mover no aparezcan de golpe. */
const BOUNDS_PADDING = 1.25;

export type NotamState = 'off' | 'cargando' | 'on' | 'lejos' | 'error';

/** Lo que mide un píxel en grados a ese zoom: la tolerancia de simplificado. */
function pixelDegrees(zoom: number): number {
  return 360 / (256 * Math.pow(2, zoom));
}

export function useNotamAreas(
  send: (msg: object) => void,
  enabled: boolean,
  flightHeight: number,
  terrainElevation: number | null,
) {
  const [state, setState] = useState<NotamState>('off');
  const [shown, setShown] = useState(0);
  const [hidden, setHidden] = useState(0);

  // La última respuesta sin filtrar: filtrar de nuevo no cuesta una petición.
  const rawRef = useRef<NotamArea[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewRef = useRef<MapView | null>(null);
  // Los tres viven en refs porque el filtro se aplica desde callbacks que no
  // se vuelven a crear en cada render.
  const heightRef = useRef(flightHeight);
  heightRef.current = flightHeight;
  const terrainRef = useRef(terrainElevation);
  terrainRef.current = terrainElevation;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  /** Pinta lo que haya en `rawRef` que pueda alcanzarte, y cuenta el resto. */
  const paint = useCallback(() => {
    const reachable = rawRef.current.filter((n) =>
      notamReachable(n, heightRef.current, terrainRef.current),
    );
    send({
      type: 'notams',
      areas: reachable.map((n) => ({ rings: n.rings, activeNow: n.activeNow })),
    });
    setShown(reachable.length);
    setHidden(rawRef.current.length - reachable.length);
  }, [send]);

  const fetchAreas = useCallback(
    async (view: MapView) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState('cargando');

      // Alto y ancho del trozo de mundo que se ve, a ojo desde el zoom.
      const spanLat = (360 / Math.pow(2, view.zoom)) * BOUNDS_PADDING;
      const spanLon = spanLat / Math.max(0.2, Math.cos((view.lat * Math.PI) / 180));

      try {
        const areas = await getNotamsIn(
          {
            minLat: view.lat - spanLat / 2,
            maxLat: view.lat + spanLat / 2,
            minLon: view.lon - spanLon / 2,
            maxLon: view.lon + spanLon / 2,
          },
          pixelDegrees(view.zoom),
          controller.signal,
        );
        if (controller.signal.aborted) return;
        rawRef.current = areas;
        paint();
        setState('on');
      } catch {
        if (controller.signal.aborted) return;
        // Sin NOTAM en el mapa no se puede insinuar que no los haya: se dice
        // que no se han podido traer y se quita lo que hubiera pintado.
        rawRef.current = [];
        send({ type: 'notamsOff' });
        setShown(0);
        setHidden(0);
        setState('error');
      }
    },
    [paint, send],
  );

  /** Llamar en cada 'move'/'ready' del mapa. */
  const onViewChanged = useCallback(
    (view: MapView) => {
      viewRef.current = view;
      if (!enabledRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (view.zoom < MIN_ZOOM) {
        rawRef.current = [];
        send({ type: 'notamsOff' });
        setShown(0);
        setHidden(0);
        setState('lejos');
        return;
      }
      debounceRef.current = setTimeout(() => fetchAreas(view), MOVE_DEBOUNCE_MS);
    },
    [fetchAreas, send],
  );

  // Encender y apagar la capa desde la leyenda.
  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      rawRef.current = [];
      send({ type: 'notamsOff' });
      setShown(0);
      setHidden(0);
      setState('off');
      return;
    }
    if (viewRef.current) onViewChanged(viewRef.current);
  }, [enabled, send, onViewChanged]);

  // Otra altura de vuelo, u otra elevación del terreno, es otro filtro — pero
  // los mismos NOTAM: se repinta sin volver a pedirlos.
  useEffect(() => {
    if (enabled && rawRef.current.length > 0) paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightHeight, terrainElevation]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return { state, shown, hidden, onViewChanged };
}
