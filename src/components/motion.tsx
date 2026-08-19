import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REDUCED_FADE_MS, SPRINGS } from '../ui/motion';
import { useMotionPreferences } from '../ui/accessibility';

/**
 * Movimiento de la interfaz.
 *
 * Todo lo que el usuario puede tocar se mueve con muelles, no con animaciones de
 * duración fija: un muelle arranca del valor que hay en pantalla y se puede
 * reinterpretar a mitad de camino, que es lo que hace falta para que nada se
 * sienta bloqueado.
 *
 * Si el sistema pide menos movimiento, se cambia por un cruce de opacidad corto.
 */

/** Contenido que se despliega y se pliega. */
export function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  const { reduceMotion } = useMotionPreferences();
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    const animation = reduceMotion
      ? Animated.timing(anim, {
          toValue: open ? 1 : 0,
          duration: REDUCED_FADE_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      : Animated.spring(anim, { toValue: open ? 1 : 0, ...SPRINGS.ui, useNativeDriver: true });

    animation.start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
    return () => animation.stop();
  }, [open, anim, reduceMotion]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={{
        opacity: anim,
        transform: reduceMotion
          ? []
          : [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Entrada de un elemento nuevo. Sube unos píxeles y aparece: el movimiento
 * apunta hacia donde va la cosa, no interpola a ciegas.
 */
export function Appear({
  children,
  delay = 0,
  distance = 10,
  style,
  animationKey,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
  animationKey?: string | number;
}) {
  const { reduceMotion } = useMotionPreferences();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    const animation = reduceMotion
      ? Animated.timing(anim, {
          toValue: 1,
          duration: REDUCED_FADE_MS,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      : Animated.spring(anim, { toValue: 1, delay, ...SPRINGS.ui, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [anim, delay, animationKey, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: reduceMotion
            ? []
            : [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Flecha que gira en lugar de cambiar de icono. */
export function Chevron({ open, color, size = 17 }: { open: boolean; color: string; size?: number }) {
  const { reduceMotion } = useMotionPreferences();
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    const animation = reduceMotion
      ? Animated.timing(anim, { toValue: open ? 1 : 0, duration: REDUCED_FADE_MS, useNativeDriver: true })
      : Animated.spring(anim, { toValue: open ? 1 : 0, ...SPRINGS.rotate, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [open, anim, reduceMotion]);

  return (
    <Animated.View
      style={{
        transform: [
          { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
        ],
      }}
    >
      <Ionicons name="chevron-forward" size={size} color={color} />
    </Animated.View>
  );
}

/**
 * Pulsable con realce inmediato.
 *
 * El realce ocurre al APOYAR el dedo, no al soltar: esperar al toque de salida
 * se siente muerto. Y se confirma al soltar, con holgura alrededor para perdonar
 * el pulso.
 */
export function PressableScale({
  children,
  scaleTo = 0.97,
  dimTo = 0.75,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableProps & {
  children: React.ReactNode;
  scaleTo?: number;
  dimTo?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  const { reduceMotion } = useMotionPreferences();
  const anim = useRef(new Animated.Value(0)).current;

  const to = useCallback(
    (value: number) => {
      Animated.spring(anim, { toValue: value, ...SPRINGS.press, useNativeDriver: true }).start();
    },
    [anim],
  );

  const transform = useMemo(
    () =>
      reduceMotion
        ? []
        : [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }) }],
    [anim, reduceMotion, scaleTo],
  );

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        to(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(0);
        onPressOut?.(e);
      }}
    >
      <Animated.View
        style={[
          style as ViewStyle,
          {
            transform,
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, dimTo] }),
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** Latido suave de los esqueletos de carga. */
export function Pulse({ children }: { children: React.ReactNode }) {
  const { reduceMotion } = useMotionPreferences();
  const anim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(0.8);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.5, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, reduceMotion]);

  return <Animated.View style={{ opacity: anim }}>{children}</Animated.View>;
}

/** Contenedor que reserva sitio sin animar nada. */
export function Static({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={style}>{children}</View>;
}
