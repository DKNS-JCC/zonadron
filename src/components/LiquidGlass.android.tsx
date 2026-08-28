import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { usePalette } from '../hooks/useTheme';
import { useMotionPreferences } from '../ui/accessibility';
import { radius as radii, shadow } from '../theme';
import { Material } from './Material';

/**
 * EXPERIMENTO — cristal de verdad en Android.
 *
 * `Material` se queda en una superficie casi sólida en Android porque el
 * desenfoque del sistema no existe ahí y el de expo-blur trabaja copiando la
 * jerarquía de vistas, que es justo lo que no sabe leer un WebView (el mapa).
 *
 * Esta librería lo hace de otra manera: captura la ventana ya compuesta con
 * `PixelCopy`, o sea lo que se está viendo de verdad en pantalla, WebView
 * incluido. Por eso aquí sí puede salir bien.
 *
 * A cambio, para no fotografiarse a sí misma, dibuja sus hijos en OTRA raíz de
 * React. Eso tiene una consecuencia que manda sobre dónde se puede usar: los
 * hijos pierden el contexto del árbol principal (tema, ajustes, área segura).
 * Sirve, entonces, para contenido que ya llega resuelto —un icono con su color
 * ya calculado— y NO para paneles que leen contexto por dentro. De momento
 * sólo lo usan los botones redondos del mapa.
 *
 * Para volverlo a apagar basta con poner `false` aquí: se cae al material de
 * siempre y no hay que recompilar nada.
 */
const LIQUID_GLASS = true;

/**
 * Cuánto desenfoque, en dp. El valor por defecto de la librería (4) casi no se
 * nota sobre un mapa lleno de detalle.
 */
const BLUR_DP = 12;

/**
 * La librería se carga a mano y con red debajo.
 *
 * `ExpoLiquidGlassNativeView` llama a `requireNativeViewManager` nada más
 * importarse, y eso revienta —al importar, no al pintar— en cuanto el binario
 * instalado no trae el módulo. Con un `import` normal, ese fallo se lleva por
 * delante la pantalla entera del mapa.
 *
 * Y no es un caso raro: pasa con la app anterior aún instalada, y pasaría con
 * una actualización de sólo-JS que llegue antes que su binario. Ninguna de las
 * dos cosas puede dejarte sin poder mirar si se vuela o no. Si el módulo no
 * está, esto se entera aquí y se sigue con el material de siempre.
 */
const NativeGlass: React.ComponentType<any> | null = (() => {
  if (!LIQUID_GLASS) return null;
  try {
    return require('expo-liquid-glass-native').ExpoLiquidGlassNativeView ?? null;
  } catch {
    return null;
  }
})();

/** ¿Trae el binario el módulo nativo del cristal? Para poder decirlo en Ajustes. */
export const HAS_NATIVE_GLASS = NativeGlass !== null;

export function LiquidGlass({
  children,
  radius: r = radii.lg,
  style,
}: {
  children?: React.ReactNode;
  radius?: number;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const { reduceTransparency } = useMotionPreferences();

  // "Menos transparencia" manda por encima del experimento: si el sistema pide
  // superficies opacas, no se le discute.
  if (!NativeGlass || reduceTransparency) {
    return (
      <Material weight="chrome" radius={r} style={style}>
        {children}
      </Material>
    );
  }

  return (
    <View style={[{ borderRadius: r }, shadow.chip as ViewStyle, style]}>
      <NativeGlass
        tint={p.surface}
        // #AARRGGBB: un velo del color de la superficie para que el texto de
        // encima se lea aunque debajo haya satélite.
        surfaceColor={'#26' + p.surface.replace('#', '')}
        blurRadius={BLUR_DP}
        cornerRadius={r}
        lensX={r}
        lensY={r}
        useRealtimeCapture
        style={StyleSheet.flatten([{ borderRadius: r, overflow: 'hidden' }])}
      >
        {children}
      </NativeGlass>
    </View>
  );
}
