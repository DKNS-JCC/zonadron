import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Animaciones hechas con la API `Animated` del propio React Native, sin
 * dependencias extra y sin `LayoutAnimation` (que no es fiable con la nueva
 * arquitectura en Android).
 */

const DURATION = 220;
const EASE = Easing.out(Easing.cubic);

/**
 * Contenido que se despliega y se pliega.
 *
 * La primera versión animaba la ALTURA del contenedor y medía el contenido con
 * `onLayout` desde dentro de un contenedor recortado a 0 px. En Android con la
 * nueva arquitectura ese hijo reporta altura 0, así que la animación se
 * ejecutaba pero no aparecía nada: el desplegable quedaba vacío.
 *
 * Ahora el contenido simplemente se monta y entra con opacidad y un pequeño
 * desplazamiento. No depende de medir nada, así que no se puede romper.
 */
export function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    const animation = Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: open ? DURATION : 150,
      easing: EASE,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
    return () => animation.stop();
  }, [open, anim]);

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={{
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Entrada suave: sube 12 px y aparece. Para tarjetas de resultado. */
export function FadeInUp({
  children,
  delay = 0,
  distance = 12,
  style,
  /** Cambiar esta clave vuelve a lanzar la animación. */
  animationKey,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
  animationKey?: string | number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 280,
      delay,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [anim, delay, animationKey]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Flecha que rota en vez de cambiar de icono. */
export function Chevron({
  open,
  color,
  size = 18,
}: {
  open: boolean;
  color: string;
  size?: number;
}) {
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: DURATION,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

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

/** Pulso suave para los esqueletos de carga. */
export function Pulse({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return <Animated.View style={{ opacity: anim }}>{children}</Animated.View>;
}
