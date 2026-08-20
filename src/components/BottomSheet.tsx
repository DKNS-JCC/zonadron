import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette } from '../hooks/useTheme';
import { radius, space } from '../theme';
import { project, rubberband, SPRINGS } from '../ui/motion';
import { useMotionPreferences } from '../ui/accessibility';
import { Material } from './Material';
import { t } from '../i18n';

export type SheetState = 'hidden' | 'peek' | 'expanded';

/**
 * Hoja inferior.
 *
 * Tres detalles hacen que se sienta física en vez de correcta:
 *
 *  1. Al soltar, la animación continúa a la velocidad exacta que llevaba el
 *     dedo. Sin eso se nota la costura entre arrastrar y animar.
 *  2. El destino no es el punto de anclaje más cercano al sitio donde soltaste,
 *     sino el más cercano a donde el impulso habría llevado la hoja. Es lo que
 *     convierte un golpe de dedo en un lanzamiento.
 *  3. En los topes la hoja resiste de forma progresiva en vez de frenar en seco:
 *     un tope duro se lee como "se ha colgado".
 *
 * El gesto vive sólo en la cabecera para que el contenido pueda desplazarse.
 */
export function BottomSheet({
  state,
  onStateChange,
  minPeekHeight = 120,
  header,
  children,
}: {
  state: SheetState;
  onStateChange: (s: SheetState) => void;
  minPeekHeight?: number;
  header: React.ReactNode;
  children?: React.ReactNode;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useMotionPreferences();
  const screenHeight = Dimensions.get('window').height;
  const expandedHeight = Math.round(screenHeight * 0.82);

  const [headerHeight, setHeaderHeight] = useState(minPeekHeight);
  const peekHeight = Math.max(minPeekHeight, headerHeight + insets.bottom);

  const offsets = useMemo(
    () => ({
      expanded: 0,
      peek: expandedHeight - peekHeight,
      hidden: expandedHeight + 40,
    }),
    [expandedHeight, peekHeight],
  );

  const translateY = useRef(new Animated.Value(offsets.hidden)).current;
  const currentOffset = useRef(offsets.hidden);

  // El valor vivo: al interrumpir hay que arrancar de lo que se ve, no del
  // destino lógico, o se produce un salto visible.
  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      currentOffset.current = value;
    });
    return () => translateY.removeListener(id);
  }, [translateY]);

  const animateTo = useCallback(
    (next: SheetState, velocity = 0) => {
      const to = offsets[next];
      if (reduceMotion) {
        Animated.timing(translateY, { toValue: to, duration: 200, useNativeDriver: true }).start();
        return;
      }
      Animated.spring(translateY, {
        toValue: to,
        velocity,
        ...SPRINGS.sheet,
        useNativeDriver: true,
      }).start();
    },
    [offsets, translateY, reduceMotion],
  );

  useEffect(() => {
    animateTo(state);
  }, [state, animateTo]);

  const grabOffset = useRef(0);

  const pan = useRef(
    PanResponder.create({
      // Umbral pequeño antes de comprometerse con la dirección.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderGrant: () => {
        grabOffset.current = currentOffset.current;
        translateY.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const raw = grabOffset.current + g.dy;
        let next = raw;
        // Resistencia progresiva por arriba: no hay nada más allá.
        if (raw < offsets.expanded) {
          next = offsets.expanded + rubberband(raw - offsets.expanded, expandedHeight);
        } else if (raw > offsets.hidden) {
          next = offsets.hidden + rubberband(raw - offsets.hidden, expandedHeight);
        }
        translateY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        // g.vy viene en px/ms.
        const velocity = g.vy * 1000;
        const projected = currentOffset.current + project(velocity);

        const candidates: Array<[SheetState, number]> = [
          ['expanded', Math.abs(projected - offsets.expanded)],
          ['peek', Math.abs(projected - offsets.peek)],
        ];
        candidates.sort((a, b) => a[1] - b[1]);
        const target = candidates[0][0];

        onStateChange(target);
        animateTo(target, velocity);
      },
    }),
  ).current;

  return (
    <Animated.View
      pointerEvents={state === 'hidden' ? 'none' : 'auto'}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: expandedHeight,
        transform: [{ translateY }],
      }}
    >
      <Material weight="sheet" radius={radius.sheet} style={{ flex: 1 }}>
        <View {...pan.panHandlers} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          <Pressable
            onPress={() => onStateChange(state === 'expanded' ? 'peek' : 'expanded')}
            accessibilityRole="button"
            accessibilityLabel={state === 'expanded' ? t('sheet.collapse') : t('sheet.expand')}
            style={{ paddingTop: space.sm + 2, paddingBottom: space.sm }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 36,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: p.labelTertiary,
                marginBottom: space.sm,
              }}
            />
            <View style={{ paddingHorizontal: space.lg }}>{header}</View>
          </Pressable>
        </View>
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>
      </Material>
    </Animated.View>
  );
}

export const sheetHairline = StyleSheet.hairlineWidth;
