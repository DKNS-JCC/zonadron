import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, shadow, space, type, verdictStyles, emphasize } from '../theme';
import { Separator } from './ui';
import { useFavorites } from '../state/FavoritesContext';
import { favoriteName, favoriteNotePreview, favoritePlaceLine } from '../logic/favorites';
import { verdictLevelLabel } from '../logic/labels';
import { t } from '../i18n';

/**
 * Sitios guardados. A diferencia del historial (que se borra entero de una),
 * cada uno tiene su ficha: nombre propio, notas y altura habitual.
 *
 * La fila enseña lo que se necesita para elegir sin abrir nada: cómo lo llamas
 * tú, cómo lo llama el mapa, el último veredicto y la primera línea de tus
 * notas —que suele ser justo el dato que hace falta antes de coger el coche—.
 * Tocar la fila comprueba el sitio; el lápiz abre su ficha, que es también
 * desde donde se quita: quitarlo de un toque perdía nombre y notas sin avisar.
 */
export function FavoritesList({
  onOpen,
}: {
  onOpen: (lat: number, lon: number, label: string | null) => void;
}) {
  const p = usePalette();
  const router = useRouter();
  const { favorites } = useFavorites();

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
        const name = favoriteName(f);
        const place = favoritePlaceLine(f);
        const note = favoriteNotePreview(f);
        return (
          <View key={f.id}>
            {i > 0 ? <Separator inset={space.lg + 10 + space.md} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => onOpen(f.lat, f.lon, name)}
                accessibilityRole="button"
                accessibilityLabel={t('favorites.a11y', name, verdictLevelLabel(f.lastLevel))}
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
                    {name}
                  </Text>
                  <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
                    {verdictLevelLabel(f.lastLevel)}
                    {f.heightM ? ` · ${f.heightM} m` : ''}
                    {place ? ` · ${place}` : ''}
                  </Text>
                  {note ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                      <Ionicons name="reader-outline" size={12} color={p.labelTertiary} />
                      <Text
                        style={[type.caption, { color: p.labelTertiary, flex: 1 }]}
                        numberOfLines={1}
                      >
                        {note}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/favorito/[id]', params: { id: f.id } })}
                accessibilityRole="button"
                accessibilityLabel={t('favorites.editA11y', name)}
                hitSlop={12}
                style={({ pressed }) => ({
                  paddingHorizontal: space.lg,
                  minHeight: 60,
                  justifyContent: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Ionicons name="create-outline" size={20} color={p.tint} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}
