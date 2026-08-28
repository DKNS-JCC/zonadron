import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { usePalette } from '../hooks/useTheme';
import { space, type } from '../theme';
import { remainingLabel, stepLabel } from '../offline/downloadTask';
import type { BuildProgress } from '../offline/pack';

/**
 * La barra de la descarga, con lo que está haciendo y lo que queda.
 *
 * Se anima en vez de saltar de golpe. Importa más de lo que parece: la mayor
 * parte de la descarga es esperar a que la fuente de elevación deje pedir más,
 * y una barra clavada un minuto se lee como una app colgada. El avance durante
 * la espera no es un adorno — la espera dura un tiempo conocido, así que el
 * progreso que se pinta durante ella es tan real como el resto.
 *
 * Vive suelta porque la enseñan dos sitios: la pantalla de descarga y la
 * tarjeta de Ajustes mientras baja en segundo plano.
 */
export function DownloadProgress({ progress }: { progress: BuildProgress }) {
  const p = usePalette();
  const width = useRef(new Animated.Value(0)).current;
  const shown = useRef(0);

  useEffect(() => {
    // Nunca hacia atrás: el reparto por fases ya es monótono, pero una
    // respuesta que llegue a destiempo no debe encoger la barra.
    const next = Math.max(shown.current, Math.min(1, progress.pct));
    shown.current = next;
    Animated.timing(width, {
      toValue: next,
      duration: 450,
      easing: Easing.out(Easing.quad),
      // El ancho no se puede animar en el hilo nativo.
      useNativeDriver: false,
    }).start();
  }, [progress.pct, width]);

  const remaining = remainingLabel(progress);

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
        <Text style={[type.footnote, { color: p.labelSecondary, flex: 1 }]} numberOfLines={1}>
          {stepLabel(progress)}
        </Text>
        {remaining ? (
          <Text style={[type.caption, { color: p.labelTertiary }]}>{remaining}</Text>
        ) : null}
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: p.skeleton, overflow: 'hidden' }}>
        <Animated.View
          style={{
            width: width.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
            height: 6,
            borderRadius: 3,
            backgroundColor: p.tint,
          }}
        />
      </View>
    </View>
  );
}
