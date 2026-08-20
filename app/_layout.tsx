import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider, useSettings } from '../src/state/SettingsContext';
import { HistoryProvider } from '../src/state/HistoryContext';
import { FavoritesProvider } from '../src/state/FavoritesContext';
import { FlightLogProvider } from '../src/state/FlightLogContext';
import { usePalette, useScheme } from '../src/hooks/useTheme';
import { useSharedPointRouting } from '../src/hooks/useSharedPointRouting';
import { t } from '../src/i18n';

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
  const { locale } = useSettings();
  // Compartir una chincheta desde Maps abre directamente su resultado. Va aquí
  // dentro porque necesita el router, y con la app ya montada.
  useSharedPointRouting();

  return (
    // Cambiar de idioma rehace la navegación entera. Suena drástico, pero un
    // veredicto ya calculado lleva su texto dentro (ver `verdict.ts`): sin
    // volver a montar, la pantalla se quedaría con frases del idioma anterior
    // hasta la siguiente consulta, que es peor que empezar de cero.
    <React.Fragment key={locale}>
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
          options={{ presentation: 'modal', headerShown: true, title: t('download.title') }}
        />
        <Stack.Screen name="luz" options={{ headerShown: true, title: t('light.title') }} />
        <Stack.Screen name="diario" options={{ headerShown: true, title: t('log.title') }} />
        <Stack.Screen name="normas" options={{ headerShown: true, title: t('rules.title') }} />
      </Stack>
    </React.Fragment>
  );
}
