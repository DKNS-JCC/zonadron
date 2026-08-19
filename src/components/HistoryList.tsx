import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, shadow, space, type, verdictStyles, emphasize } from '../theme';
import { Separator } from './ui';
import { timeAgo, useHistory } from '../state/HistoryContext';

const LEVEL_TEXT: Record<string, string> = {
  LIBRE: 'Puedes volar',
  CONDICIONES: 'Con condiciones',
  AUTORIZACION: 'Necesitas autorización',
  PROHIBIDO: 'No puedes volar',
  DESCONOCIDO: 'Sin comprobar del todo',
};

/**
 * Últimos puntos consultados. Es lo que hace que abrir la app tenga sentido a
 * los cero segundos: los sitios donde vuelas se repiten.
 *
 * Forma de lista agrupada: las filas se separan con una línea finísima sangrada
 * hasta donde empieza el texto, no con un borde alrededor de cada una.
 */
export function HistoryList({
  onOpen,
}: {
  onOpen: (lat: number, lon: number, label: string | null) => void;
}) {
  const p = usePalette();
  const { entries, clear } = useHistory();

  if (entries.length === 0) return null;

  return (
    <View
      style={[
        {
          backgroundColor: p.surface,
          borderRadius: radius.lg,
          overflow: 'hidden',
        },
        shadow.chip,
      ]}
    >
      {entries.map((e, i) => {
        const tint =
          p.scheme === 'dark' ? verdictStyles[e.level].onDark : verdictStyles[e.level].onLight;
        return (
          <View key={e.id}>
            {i > 0 ? <Separator inset={space.lg + 10 + space.md} /> : null}
            <Pressable
              onPress={() => onOpen(e.lat, e.lon, e.label)}
              accessibilityRole="button"
              accessibilityLabel={`${e.label ?? 'Punto guardado'}. ${LEVEL_TEXT[e.level]}. Consultado ${timeAgo(e.at)}.`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                minHeight: 60,
                backgroundColor: pressed ? p.surfaceSunken : 'transparent',
              })}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint }} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[emphasize(type.callout), { color: p.label }]} numberOfLines={1}>
                  {e.label ?? `${e.lat.toFixed(4)}, ${e.lon.toFixed(4)}`}
                </Text>
                <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
                  {LEVEL_TEXT[e.level]} · a {e.height} m · {timeAgo(e.at)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={p.labelTertiary} />
            </Pressable>
          </View>
        );
      })}
      <Separator />
      <Pressable
        onPress={clear}
        accessibilityRole="button"
        style={({ pressed }) => ({
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          backgroundColor: pressed ? p.surfaceSunken : 'transparent',
        })}
      >
        <Text style={[type.subheadline, { color: p.labelSecondary }]}>Borrar historial</Text>
      </Pressable>
    </View>
  );
}
