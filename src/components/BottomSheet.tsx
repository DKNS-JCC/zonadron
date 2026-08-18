import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette } from '../hooks/useTheme';
import { radius, shadowStrong, space } from '../theme';

export type SheetState = 'hidden' | 'peek' | 'expanded';

/**
 * Hoja inferior mínima, hecha con `Animated` y `PanResponder` del propio React
 * Native. No se usa ninguna librería de gestos: la hoja sólo tiene dos posiciones
 * y no necesita más.
 *
 * El gesto vive únicamente en la cabecera (el asa), para que el contenido de
 * dentro pueda hacer scroll con normalidad.
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
  /** Suelo por si la cabecera aún no se ha medido. */
  minPeekHeight?: number;
  header: React.ReactNode;
  children?: React.ReactNode;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const expandedHeight = Math.round(screenHeight * 0.82);

  // La posición plegada se ajusta a la altura real de la cabecera, para que no
  // asome un trozo del contenido de dentro por debajo.
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

  const animateTo = useCallback(
    (next: SheetState) => {
      const to = offsets[next];
      currentOffset.current = to;
      Animated.spring(translateY, {
        toValue: to,
        useNativeDriver: true,
        damping: 26,
        stiffness: 240,
        mass: 0.9,
      }).start();
    },
    [offsets, translateY],
  );

  useEffect(() => {
    animateTo(state);
  }, [state, animateTo]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => {
        const next = Math.min(
          offsets.hidden,
          Math.max(offsets.expanded, currentOffset.current + g.dy),
        );
        translateY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const projected = currentOffset.current + g.dy + g.vy * 90;
        const distances: Array<[SheetState, number]> = [
          ['expanded', Math.abs(projected - offsets.expanded)],
          ['peek', Math.abs(projected - offsets.peek)],
        ];
        distances.sort((a, b) => a[1] - b[1]);
        onStateChange(distances[0][0]);
        animateTo(distances[0][0]);
      },
    }),
  ).current;

  return (
    <Animated.View
      pointerEvents={state === 'hidden' ? 'none' : 'auto'}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: expandedHeight,
          backgroundColor: p.bgElevated,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: p.cardBorder,
          transform: [{ translateY }],
          overflow: 'hidden',
        },
        shadowStrong,
      ]}
    >
      <View {...pan.panHandlers} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <Pressable
          onPress={() => onStateChange(state === 'expanded' ? 'peek' : 'expanded')}
          accessibilityRole="button"
          accessibilityLabel={state === 'expanded' ? 'Plegar el detalle' : 'Ver el detalle'}
          style={{ paddingTop: space.sm + 2, paddingBottom: space.sm }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: p.cardBorder,
              marginBottom: space.sm,
            }}
          />
          <View style={{ paddingHorizontal: space.lg }}>{header}</View>
        </Pressable>
      </View>
      <View style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>
    </Animated.View>
  );
}
