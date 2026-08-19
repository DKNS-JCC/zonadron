import { useCallback, useState, type RefObject } from 'react';
import * as Haptics from 'expo-haptics';
import { findNearestFlyable, type NearestFlyableResult } from '../../offline/nearest';
import { loadPack } from '../../offline/pack';
import type { Coords } from '../../types';

/** Metros hasta el kilómetro, y a partir de ahí en kilómetros con un decimal. */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1).replace('.', ',')} km`;
}

type PhotoState =
  | { state: 'buscando' }
  | { state: 'sin-paquete' }
  | { state: 'listo'; target: Coords; result: NearestFlyableResult }
  | null;

/**
 * "Quiero fotografiar esto": marca un objetivo y busca desde dónde se puede
 * volar sin pedir autorización. Necesita el paquete descargado porque la
 * búsqueda mira miles de puntos, y eso no se le puede preguntar a ENAIRE uno
 * a uno.
 */
export function usePhotoTarget(
  send: (msg: object) => void,
  centerRef: RefObject<Coords | null>,
  flightHeight: number,
) {
  const [photo, setPhoto] = useState<PhotoState>(null);

  const markPhotoTarget = useCallback(async () => {
    const target = centerRef.current;
    if (!target) return;
    Haptics.selectionAsync().catch(() => {});
    setPhoto({ state: 'buscando' });
    send({ type: 'target', target: { lat: target.lat, lon: target.lon }, spot: null, label: '' });

    const pack = await loadPack();
    if (!pack) {
      setPhoto({ state: 'sin-paquete' });
      return;
    }

    const result = findNearestFlyable(pack, target, flightHeight, 6, 64);
    setPhoto({ state: 'listo', target, result });

    const spot = result.best ?? result.anyHeight;
    if (spot && !result.targetIsFlyable) {
      send({
        type: 'target',
        target: { lat: target.lat, lon: target.lon },
        spot: { lat: spot.coords.lat, lon: spot.coords.lon },
        label: formatDistance(spot.distanceM),
      });
    }
  }, [send, centerRef, flightHeight]);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
    send({ type: 'targetOff' });
  }, [send]);

  return { photo, markPhotoTarget, clearPhoto };
}
