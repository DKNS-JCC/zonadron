import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { useMotionPreferences } from '../ui/accessibility';
import { REDUCED_FADE_MS } from '../ui/motion';
import { space, type } from '../theme';
import { t } from '../i18n';
import { NO_TAPS, registerTap, type TapState } from '../logic/secret';

/**
 * La fila de la versión, en Ajustes. Y un despegue escondido detrás.
 *
 * Toca siete veces seguidas y un dron cruza la fila con una frase. Nada más: no cambia un
 * ajuste, no toca el veredicto, no guarda nada y no aparece en ninguna parte
 * hasta que alguien lo busca a propósito. En una app donde el usuario decide si
 * es legal despegar, un huevo de pascua sólo puede ser eso — decorado. Cualquier
 * cosa que rozara una altura, una zona o un permiso no tendría ninguna gracia.
 *
 * Siete toques y no tres porque tres se dan sin querer. La cuenta vive en
 * `logic/secret.ts` y está probada aparte: que esté escondido de verdad es lo
 * único de esto que puede fallar de forma molesta.
 */

/** Lo que dura el vuelo de punta a punta. */
const FLIGHT_MS = 2600;

export function SecretTakeoff({ version }: { version: string }) {
  const p = usePalette();
  const { reduceMotion } = useMotionPreferences();
  const { width } = useWindowDimensions();

  const [flying, setFlying] = useState(false);
  const taps = useRef<TapState>(NO_TAPS);
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const launch = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setFlying(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      // Con "menos movimiento" no cruza nada la pantalla: el premio es el texto,
      // que aparece con un fundido corto. Se conserva el huevo sin marear.
      duration: reduceMotion ? REDUCED_FADE_MS : FLIGHT_MS,
      easing: reduceMotion ? Easing.linear : Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlying(false), reduceMotion ? 2200 : FLIGHT_MS);
  }, [progress, reduceMotion]);

  const onPress = useCallback(() => {
    const { state, launch: despega } = registerTap(taps.current, Date.now());
    taps.current = state;
    if (despega && !flying) launch();
  }, [flying, launch]);

  // Sale por la izquierda y se va por la derecha, con la fila entera de pista.
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-48, width + 48],
  });
  // Un dron no vuela recto: sube, corrige y baja.
  const translateY = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [6, -7, 2, -5, 4],
  });
  // Y se inclina hacia donde va.
  const rotate = progress.interpolate({
    inputRange: [0, 0.2, 0.6, 1],
    outputRange: ['0deg', '-12deg', '6deg', '-4deg'],
  });

  return (
    <Pressable
      onPress={onPress}
      // Sin `accessibilityRole` ni pista: la fila sigue siendo informativa y no
      // se anuncia como un botón que no lleva a ninguna parte.
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.lg,
        minHeight: 52,
      }}
    >
      <Ionicons name="information-circle-outline" size={22} color={p.labelTertiary} />
      <Text style={[type.footnote, { color: p.labelTertiary, flex: 1 }]}>
        {flying ? t('settings.secret') : t('settings.version', version)}
      </Text>

      {flying && !reduceMotion ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            // La fila recorta el vuelo: el dron entra y sale por sus bordes en
            // vez de pasearse por encima del resto de los ajustes.
            overflow: 'hidden',
          }}
        >
          <Animated.View style={{ transform: [{ translateX }, { translateY }, { rotate }] }}>
            {/* Ionicons no tiene dron; el cuadricóptero sale de la misma
                familia de @expo/vector-icons, así que no añade dependencias. */}
            <MaterialCommunityIcons name="quadcopter" size={22} color={p.tint} />
          </Animated.View>
        </View>
      ) : null}
    </Pressable>
  );
}
