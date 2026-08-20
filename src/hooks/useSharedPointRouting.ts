import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';

import { t } from '../i18n';
import { resolveSharedPoint } from '../logic/sharedPoint';

/**
 * Compartir una chincheta con Zona Dron.
 *
 * Abres el sitio en Google Maps o en Apple Maps, le das a compartir, eliges
 * Zona Dron y la app se abre con ese punto ya comprobado. Lo que llega es
 * texto —normalmente un enlace corto—, así que hay que resolverlo antes de
 * saber a dónde ir; suele tardar medio segundo.
 *
 * En Expo Go no hay módulo nativo y el hook se queda quieto: esto sólo
 * funciona en la app compilada (APK o IPA).
 */
export function useSharedPointRouting() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    resetOnBackground: true,
  });
  // Un mismo intent puede llegar dos veces mientras se resuelve el enlace.
  const busy = useRef(false);

  useEffect(() => {
    if (!hasShareIntent || busy.current) return;
    const raw = (shareIntent?.webUrl ?? shareIntent?.text ?? '').trim();
    if (!raw) return;

    busy.current = true;
    resetShareIntent();

    let alive = true;
    resolveSharedPoint(raw)
      .then((punto) => {
        if (!alive) return;
        if (!punto) {
          Alert.alert(t('sharedPoint.failedTitle'), t('sharedPoint.failedBody'));
          return;
        }
        router.push({
          pathname: '/resultado',
          params: {
            lat: String(punto.lat),
            lon: String(punto.lon),
            ...(punto.label ? { label: punto.label } : {}),
          },
        });
      })
      .finally(() => {
        busy.current = false;
      });

    return () => {
      alive = false;
    };
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);
}
