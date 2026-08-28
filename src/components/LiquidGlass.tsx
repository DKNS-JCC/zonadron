import React from 'react';
import type { ViewStyle } from 'react-native';
import { radius as radii } from '../theme';
import { Material } from './Material';

/** En iOS y web no hay módulo nativo que valga: el desenfoque ya funciona. */
export const HAS_NATIVE_GLASS = false;

/**
 * Cristal para iOS y web: el material de siempre.
 *
 * En esas dos plataformas el desenfoque ya funciona (el del sistema en iOS,
 * `backdrop-filter` en el navegador), así que no hay nada que arreglar. El
 * experimento con la librería nativa vive sólo en `LiquidGlass.android.tsx`,
 * que es el archivo que Metro elige en Android — y así la librería, que es
 * sólo de Android, no se importa nunca donde no existe.
 */
export function LiquidGlass({
  children,
  radius: r = radii.lg,
  style,
}: {
  children?: React.ReactNode;
  radius?: number;
  style?: ViewStyle;
}) {
  return (
    <Material weight="chrome" radius={r} style={style}>
      {children}
    </Material>
  );
}
