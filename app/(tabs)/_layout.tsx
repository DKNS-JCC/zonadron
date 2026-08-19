import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette } from '../../src/hooks/useTheme';
import { useMotionPreferences } from '../../src/ui/accessibility';
import { materialIntensity, type } from '../../src/theme';

/**
 * Barra de pestañas.
 *
 * Es una capa translúcida flotante con el contenido pasando por debajo, no una
 * franja opaca que se coma un trozo fijo de pantalla. El nombre de cada pestaña
 * dice lo que hay dentro — "Volar aquí", "Normas" — en vez de un paraguas vago
 * tipo "Inicio": la concreción es lo que hace que se pueda predecir.
 */
export default function TabsLayout() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { reduceTransparency } = useMotionPreferences();

  // +6px extra para despegar la barra del control de gestos del sistema, que si no queda pegado encima.
  const bottomInset = (Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8)) + 6;
  // En Android el desenfoque del sistema no es fiable por encima de un WebView
  // (el mapa), así que la barra se resuelve con una superficie casi sólida.
  const solidBar = reduceTransparency || Platform.OS === 'android';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.tint,
        tabBarInactiveTintColor: p.labelTertiary,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: solidBar ? (reduceTransparency ? p.surface : p.surface + 'F2') : 'transparent',
          height: 52 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarBackground: solidBar
          ? () => (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.separator },
                ]}
              />
            )
          : () => (
              <View style={StyleSheet.absoluteFill}>
                <BlurView
                  intensity={materialIntensity.chrome}
                  tint={p.scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
                  style={StyleSheet.absoluteFill}
                />
                {/* Filo superior: la luz cogiendo el canto del material. */}
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: p.separator,
                  }}
                />
              </View>
            ),
        tabBarLabelStyle: { ...type.caption2, fontWeight: '500', marginTop: 2 },
        tabBarItemStyle: { paddingTop: 2 },
        sceneStyle: { backgroundColor: p.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Volar aquí',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'locate' : 'locate-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cuaderno"
        options={{
          title: 'Cuaderno',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={23} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
