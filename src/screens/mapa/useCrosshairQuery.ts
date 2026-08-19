import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { SheetState } from '../../components/BottomSheet';
import { describePoint } from '../../api/geocode';
import { checkPoint } from '../../logic/query';
import type { Coords, QueryResult } from '../../types';

/** Espera antes de consultar tras mover el mapa. Suficiente para no encadenar. */
const MOVE_DEBOUNCE_MS = 700;

/**
 * Qué hay bajo la cruz del mapa, y su estado de consulta.
 *
 * Cada vez que el mapa se mueve se consulta el punto con un poco de retraso
 * (para no encadenar una petición por cada fotograma del gesto), y si cambia
 * la altura de vuelo se repite la consulta sobre el mismo punto sin que el
 * usuario tenga que volver a moverse.
 */
export function useCrosshairQuery(flightHeight: number) {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>('hidden');

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centerRef = useRef<Coords | null>(null);
  const heightRef = useRef(flightHeight);
  heightRef.current = flightHeight;

  const query = useCallback(async (coords: Coords, height: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setSheet((s) => (s === 'hidden' ? 'peek' : s));
    try {
      const res = await checkPoint(coords, height, controller.signal);
      if (controller.signal.aborted) return;
      setResult(res);
      Haptics.selectionAsync().catch(() => {});
      describePoint(coords.lat, coords.lon, controller.signal)
        .then((name) => !controller.signal.aborted && setPlace(name))
        .catch(() => {});
    } catch (err) {
      if (controller.signal.aborted) return;
      setResult(null);
      setError(err instanceof Error ? err.message : 'No se ha podido consultar este punto.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, []);

  const scheduleQuery = useCallback(
    (coords: Coords) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => query(coords, heightRef.current), MOVE_DEBOUNCE_MS);
    },
    [query],
  );

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Cambiar la altura recalcula el punto que está bajo la cruz.
  useEffect(() => {
    if (result && centerRef.current) query(centerRef.current, flightHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightHeight]);

  /** Llamar en cada 'movestart' del mapa: cancela lo pendiente y marca ocupado. */
  const onMoveStart = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    setBusy(true);
  }, []);

  /** Llamar en cada 'move'/'ready' del mapa con el nuevo centro. */
  const onMapMoved = useCallback(
    (coords: Coords) => {
      centerRef.current = coords;
      setPlace(null);
      scheduleQuery(coords);
    },
    [scheduleQuery],
  );

  return { result, place, busy, error, sheet, setSheet, centerRef, query, onMoveStart, onMapMoved };
}
