import React from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScroll } from '../src/components/Screen';
import { EmptyState, GhostButton, ScreenTitle, Separator } from '../src/components/ui';
import { usePalette } from '../src/hooks/useTheme';
import { useFlightLog } from '../src/state/FlightLogContext';
import { buildFlightLogText } from '../src/logic/share';
import { verdictLevelLabel } from '../src/logic/labels';
import { radius, shadow, space, tabular, type, verdictStyles, emphasize } from '../src/theme';

export default function DiarioScreen() {
  const p = usePalette();
  const { entries, removeEntry, clear } = useFlightLog();

  const exportLog = () => {
    Share.share({ message: buildFlightLogText(entries) }).catch(() => {});
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Diario de vuelos', headerShown: true }} />
      <ScreenScroll>
        <ScreenTitle
          title="Diario de vuelos"
          subtitle="Registro personal de dónde y cuándo has volado. No sustituye al libro de operaciones oficial que exige AESA, pero te ahorra reconstruirlo de memoria."
        />

        {entries.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="Todavía no has registrado ningún vuelo"
            subtitle={'Desde el resultado de cualquier consulta, toca "Registrar vuelo" después de volar.'}
          />
        ) : (
          <>
            <GhostButton label="Exportar diario" icon="share-outline" onPress={exportLog} />

            <View
              style={[
                { backgroundColor: p.surface, borderRadius: radius.lg, overflow: 'hidden' },
                shadow.chip,
              ]}
            >
              {entries.map((e, i) => {
                const tint =
                  p.scheme === 'dark' ? verdictStyles[e.verdictLevel].onDark : verdictStyles[e.verdictLevel].onLight;
                const when = new Date(e.loggedAt).toLocaleString('es-ES', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });
                return (
                  <View key={e.id}>
                    {i > 0 ? <Separator inset={space.lg} /> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: space.lg, gap: space.md }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint, marginTop: 6 }} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[emphasize(type.callout), { color: p.label }]} numberOfLines={1}>
                          {e.label ?? `${e.lat.toFixed(4)}, ${e.lon.toFixed(4)}`}
                        </Text>
                        <Text style={[type.footnote, { color: p.labelSecondary }]}>
                          {verdictLevelLabel[e.verdictLevel]} · {e.heightAgl} m · {e.droneLabel}
                        </Text>
                        <Text style={[type.caption, tabular, { color: p.labelTertiary }]}>{when}</Text>
                      </View>
                      <Pressable
                        onPress={() => removeEntry(e.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Borrar esta entrada del diario"
                        hitSlop={12}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
                      >
                        <Ionicons name="trash-outline" size={18} color={p.labelTertiary} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable
              onPress={clear}
              accessibilityRole="button"
              style={({ pressed }) => ({
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                backgroundColor: pressed ? p.surfaceSunken : 'transparent',
                borderRadius: radius.md,
              })}
            >
              <Text style={[type.subheadline, { color: p.labelSecondary }]}>Borrar todo el diario</Text>
            </Pressable>
          </>
        )}
      </ScreenScroll>
    </>
  );
}
