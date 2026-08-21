import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useRootNavigationState, useRouter } from 'expo-router';
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
 * Zona Dron y la app abre el mapa con la mirilla puesta en ese punto: se
 * comprueba solo y además ves qué tiene alrededor. Lo que llega por el menú de
 * compartir es texto —normalmente un enlace corto—, así que hay que resolverlo
 * antes de saber a dónde ir; suele tardar medio segundo.
 *
 * Dos cosas que no son evidentes y que hay que respetar aquí:
 *
 *  - No se puede llamar a `resetShareIntent()` antes de terminar. Al hacerlo
 *    cambia el estado del hook, este efecto se vuelve a ejecutar y su limpieza
 *    cancela la navegación que venía en camino: la app se abre y no hace nada.
 *    Se resetea al final, cuando ya se ha navegado.
 *  - Hay que esperar a que la navegación esté montada. El intent puede llegar
 *    antes que el router, y entonces el `push` se pierde por el camino.
 *
 * En Expo Go no hay módulo nativo y el hook se queda quieto: esto sólo
 * funciona en la app compilada (APK o IPA).
 */
export function useSharedPointRouting() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const routerReady = Boolean(navigationState?.key);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    resetOnBackground: true,
  });
  // Un mismo intent puede llegar dos veces mientras se resuelve el enlace.
  const handling = useRef(false);

  useEffect(() => {
    if (!routerReady || !hasShareIntent || handling.current) return;
    const raw = (shareIntent?.webUrl ?? shareIntent?.text ?? '').trim();
    if (!raw) return;

    handling.current = true;
    (async () => {
      try {
        const punto = await resolveSharedPoint(raw);
        if (punto) {
          // Al mapa y no a la ficha: la mirilla queda en el punto compartido,
          // la comprobación arranca sola y de paso se ve el entorno.
          router.push({
            pathname: '/mapa',
            params: { lat: String(punto.lat), lon: String(punto.lon) },
          });
          // Cuando el punto no venía en el enlace —se ha buscado por el nombre
          // o se ha sacado del encuadre del mapa— hay que decirlo. Un punto a
          // un kilómetro es un vuelo comprobado en el sitio que no era, y eso
          // no se puede dejar pasar en silencio.
          if (punto.approximate) {
            Alert.alert(
              t('sharedPoint.approxTitle'),
              t('sharedPoint.approxBody', punto.label ?? ''),
            );
          }
          return;
        }
        // Con el texto recibido delante, un fallo se puede contar; sin él sólo
        // se puede decir "no ha funcionado".
        Alert.alert(t('sharedPoint.failedTitle'), t('sharedPoint.failedBody', raw.slice(0, 120)));
      } catch {
        Alert.alert(t('sharedPoint.failedTitle'), t('sharedPoint.failedBody', raw.slice(0, 120)));
      } finally {
        handling.current = false;
        resetShareIntent();
      }
    })();
  }, [routerReady, hasShareIntent, shareIntent, resetShareIntent, router]);

  // Nos han abierto desde el menú de compartir pero no ha llegado el contenido.
  const openedBy = Linking.useURL();
  useEffect(() => {
    if (!openedBy?.includes('dataUrl=') || hasShareIntent) return;
    const timer = setTimeout(() => {
      if (handling.current) return;
      Alert.alert(t('sharedPoint.emptyTitle'), t('sharedPoint.emptyBody'));
    }, EMPTY_SHARE_GRACE_MS);
    return () => clearTimeout(timer);
  }, [openedBy, hasShareIntent]);
}
