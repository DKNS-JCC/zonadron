import React from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette } from '../hooks/useTheme';
import { space } from '../theme';

/**
 * Pantalla con scroll.
 *
 * El contenido pasa por debajo de la barra de pestañas translúcida, así que hay
 * que reservarle sitio al final: la barra flota, no recorta la pantalla.
 */
export function ScreenScroll({
  children,
  contentContainerStyle,
  ...rest
}: ScrollViewProps & { children: React.ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <ScrollView
        {...rest}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          {
            paddingHorizontal: space.lg,
            paddingTop: insets.top + space.md,
            paddingBottom: insets.bottom + 96,
            gap: space.xl,
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}
