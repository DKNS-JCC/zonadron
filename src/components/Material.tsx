import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { usePalette } from '../hooks/useTheme';
import { materialIntensity, radius, shadow, type MaterialWeight } from '../theme';
import { useMotionPreferences } from '../ui/accessibility';

/**
 * Materiales translúcidos.
 *
 * Las barras, los paneles flotantes y las hojas son una capa funcional que flota
 * sobre el contenido, no una franja opaca que se come el sitio: el contenido
 * pasa por debajo y se transparenta.
 *
 * El peso del material marca la jerarquía. Una superficie grande debe leerse más
 * gruesa que una pastilla pequeña: más desenfoque y sombra más profunda.
 *
 * Si el sistema pide menos transparencia, el material se vuelve sólido.
 */
export function Material({
  weight = 'panel',
  style,
  children,
  radius: r = radius.lg,
}: {
  weight?: MaterialWeight;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
  radius?: number;
}) {
  const p = usePalette();
  const { reduceTransparency } = useMotionPreferences();

  const shadowStyle =
    weight === 'sheet' ? shadow.sheet : weight === 'chrome' ? shadow.chip : shadow.panel;

  // Android no tiene un desenfoque del sistema que se pueda poner por encima de
  // un WebView sin arriesgar a que salga en negro o congelado. Y aquí lo que se
  // lee encima del material decide si vuelas o no: antes que una translucidez
  // bonita que a veces falla, una superficie casi sólida que siempre se lee.
  if (reduceTransparency || Platform.OS === 'android') {
    return (
      <View
        style={[
          {
            backgroundColor: reduceTransparency ? p.surface : p.surface + 'F2',
            borderRadius: r,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.border,
          },
          shadowStyle,
          style as ViewStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[{ borderRadius: r, overflow: 'hidden' }, shadowStyle, style as ViewStyle]}>
      <BlurView
        intensity={materialIntensity[weight]}
        tint={p.scheme === 'dark' ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
        style={StyleSheet.absoluteFill}
      />
      {/* Filo superior claro: es la luz cogiendo el canto del material. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: r,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.scheme === 'dark' ? '#FFFFFF1F' : '#FFFFFF80',
          },
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

/**
 * Borde de desvanecido donde el contenido pasa por debajo de la interfaz
 * flotante. Sustituye a la línea de 1 px bajo una cabecera fija: se difumina
 * justo donde hay solape, y sólo ahí.
 */
export function ScrollEdge({
  height = 24,
  position = 'bottom',
}: {
  height?: number;
  position?: 'top' | 'bottom';
}) {
  const p = usePalette();
  const solid = p.background;
  const transparent = p.scheme === 'dark' ? '#00000000' : '#F2F2F700';

  return (
    <LinearGradient
      colors={position === 'bottom' ? [transparent, solid] : [solid, transparent]}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height,
        [position]: 0,
      } as ViewStyle}
      pointerEvents="none"
    />
  );
}

/** Velo de oscurecimiento para el fondo de una tarea modal. */
export function Scrim({ visible }: { visible: boolean }) {
  const p = usePalette();
  if (!visible) return null;
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: p.scrim }]}
      pointerEvents="none"
    />
  );
}

export const supportsBlur = Platform.OS !== 'web' || true;
