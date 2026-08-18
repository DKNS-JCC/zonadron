import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider } from '../src/state/SettingsContext';
import { HistoryProvider } from '../src/state/HistoryContext';
import { darkPalette, lightPalette } from '../src/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? darkPalette : lightPalette;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <HistoryProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: palette.bg },
            headerTintColor: palette.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: palette.bg },
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
        </Stack>
        </HistoryProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
