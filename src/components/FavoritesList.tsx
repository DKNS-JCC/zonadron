import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, shadow, space, type, verdictStyles, emphasize } from '../theme';
import { Separator } from './ui';
import { useFavorites } from '../state/FavoritesContext';
import { verdictLevelLabel } from '../logic/labels';

/**
 * Sitios guardados. A diferencia del historial (que se borra entero de una),
 * cada fila se quita suelta: son sitios elegidos a propósito, no un rastro
 * automático.
 */
export function FavoritesList({
  onOpen,
}: {
  onOpen: (lat: number, lon: number, label: string | null) => void;
}) {
  const p = usePalette();
  const { favorites, removeFavorite } = useFavorites();

  if (favorites.length === 0) return null;

  return (
    <View
      style={[
        { backgroundColor: p.surface, borderRadius: radius.lg, overflow: 'hidden' },
        shadow.chip,
      ]}
    >
      {favorites.map((f, i) => {
        const tint =
          p.scheme === 'dark' ? verdictStyles[f.lastLevel].onDark : verdictStyles[f.lastLevel].onLight;
        return (
          <View key={f.id}>
            {i > 0 ? <Separator inset={space.lg + 10 + space.md} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => onOpen(f.lat, f.lon, f.label)}
                accessibilityRole="button"
                accessibilityLabel={`${f.label}. ${verdictLevelLabel[f.lastLevel]}.`}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingLeft: space.lg,
                  paddingVertical: space.md,
                  minHeight: 60,
                  backgroundColor: pressed ? p.surfaceSunken : 'transparent',
                })}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint }} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[emphasize(type.callout), { color: p.label }]} numberOfLines={1}>
                    {f.label}
                  </Text>
                  <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
                    {verdictLevelLabel[f.lastLevel]}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => removeFavorite(f.id)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${f.label} de favoritos`}
                hitSlop={12}
                style={({ pressed }) => ({
                  paddingHorizontal: space.lg,
                  minHeight: 60,
                  justifyContent: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Ionicons name="star" size={19} color={p.tint} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}
