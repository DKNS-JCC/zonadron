import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, type, verdictStyles } from '../theme';
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
      style={{
        backgroundColor: p.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: p.cardBorder,
        overflow: 'hidden',
      }}
    >
      {entries.map((e, i) => {
        const tint =
          p.scheme === 'dark'
            ? verdictStyles[e.level].onDark
            : verdictStyles[e.level].onLight;
        return (
          <Pressable
            key={e.id}
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
              backgroundColor: pressed ? p.accentSoft : 'transparent',
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: p.divider,
            })}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint }} />
            <View style={{ flex: 1 }}>
              <Text style={[type.bodyStrong, { color: p.text }]} numberOfLines={1}>
                {e.label ?? `${e.lat.toFixed(4)}, ${e.lon.toFixed(4)}`}
              </Text>
              <Text style={[type.caption, { color: p.textMuted }]} numberOfLines={1}>
                {LEVEL_TEXT[e.level]} · a {e.height} m · {timeAgo(e.at)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={p.textFaint} />
          </Pressable>
        );
      })}
      <Pressable
        onPress={clear}
        accessibilityRole="button"
        style={({ pressed }) => ({
          alignItems: 'center',
          paddingVertical: space.md,
          borderTopWidth: 1,
          borderTopColor: p.divider,
          backgroundColor: pressed ? p.accentSoft : 'transparent',
        })}
      >
        <Text style={[type.caption, { color: p.textFaint }]}>Borrar historial</Text>
      </Pressable>
    </View>
  );
}
