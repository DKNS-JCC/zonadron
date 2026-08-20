import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';

import { t } from '../i18n';
import { resolveSharedPoint } from '../logic/sharedPoint';

/**
 * En iOS la extensión de compartir no manda el enlace dentro del deep link:
 * lo deja en el almacén del grupo de apps y sólo despierta a la app. Si ese
 * permiso no ha sobrevivido a la firma —el caso del sideload con Apple ID
 * gratuito—, la app se abre y no llega nada. Sin esto sería un silencio
 * inexplicable, así que se espera un poco y se cuenta lo que ha pasado.
 */
const EMPTY_SHARE_GRACE_MS = 2500;

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

  // Nos han abierto desde el menú de compartir pero no ha llegado el contenido.
  const openedBy = Linking.useURL();
  useEffect(() => {
    if (!openedBy?.includes('dataUrl=') || hasShareIntent) return;
    const timer = setTimeout(() => {
      if (busy.current) return;
      Alert.alert(t('sharedPoint.emptyTitle'), t('sharedPoint.emptyBody'));
    }, EMPTY_SHARE_GRACE_MS);
    return () => clearTimeout(timer);
  }, [openedBy, hasShareIntent]);
}
