import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider } from '../src/state/SettingsContext';
import { HistoryProvider } from '../src/state/HistoryContext';
import { FavoritesProvider } from '../src/state/FavoritesContext';
import { FlightLogProvider } from '../src/state/FlightLogContext';
import { usePalette, useScheme } from '../src/hooks/useTheme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <HistoryProvider>
          <FavoritesProvider>
            <FlightLogProvider>
              {/* El aspecto se lee de los ajustes, así que la pila de navegación
                  tiene que ir por dentro del proveedor para enterarse del cambio. */}
              <Navegacion />
            </FlightLogProvider>
          </FavoritesProvider>
        </HistoryProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function Navegacion() {
  const palette = usePalette();
  const scheme = useScheme();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.label,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="resultado"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="descargar"
          options={{ presentation: 'modal', headerShown: true, title: 'Elegir zona' }}
        />
        <Stack.Screen name="luz" options={{ headerShown: true, title: 'Luz y sombras' }} />
        <Stack.Screen name="diario" options={{ headerShown: true, title: 'Diario de vuelos' }} />
        <Stack.Screen name="normas" options={{ headerShown: true, title: 'Normas y fuentes' }} />
      </Stack>
    </>
  );
}
