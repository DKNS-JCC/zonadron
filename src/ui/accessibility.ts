/**
 * Preferencias de accesibilidad del sistema.
 *
 * "Menos movimiento" no significa ningún aviso: significa un equivalente más
 * suave y no vestibular. Se sustituyen los desplazamientos y los muelles por
 * cruces de opacidad cortos y se quitan los rebotes, pero se conservan los
 * cambios de opacidad y color que ayudan a entender lo que pasa.
 *
 * "Menos transparencia" vuelve opacas las superficies translúcidas.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export interface MotionPreferences {
  reduceMotion: boolean;
  reduceTransparency: boolean;
}

export function useMotionPreferences(): MotionPreferences {
  const [prefs, setPrefs] = useState<MotionPreferences>({
    reduceMotion: false,
    reduceTransparency: false,
  });

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setPrefs((p) => ({ ...p, reduceMotion: v })))
      .catch(() => {});
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((v) => alive && setPrefs((p) => ({ ...p, reduceTransparency: v })))
      .catch(() => {});

    const motionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setPrefs((p) => ({ ...p, reduceMotion: v })),
    );
    const transparencySub = AccessibilityInfo.addEventListener?.(
      'reduceTransparencyChanged',
      (v: boolean) => setPrefs((p) => ({ ...p, reduceTransparency: v })),
    );

    return () => {
      alive = false;
      motionSub?.remove?.();
      transparencySub?.remove?.();
    };
  }, []);

  return prefs;
}
