import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { t } from '../i18n';
import { emphasize, radius, space, type } from '../theme';
import type { FavoriteEntry } from '../state/FavoritesContext';
import { Card, GhostButton } from './ui';

/**
 * Tus notas del sitio, en la pantalla de resultado.
 *
 * Es donde las notas se cobran: llegas al sitio, abres el punto guardado y lo
 * primero que ves después del veredicto es tu propio recordatorio de dónde se
 * aparca o de que hay un tendido al norte. Guardadas en una ficha que hay que
 * ir a buscar no las leería nadie.
 *
 * Si el sitio está guardado pero aún no tiene notas, se enseña la invitación a
 * ponerlas: es la única forma de que se sepa que existen.
 */
export function FavoriteNoteCard({ favorite }: { favorite: FavoriteEntry }) {
  const p = usePalette();
  const router = useRouter();

  const note = (favorite.note ?? '').trim();

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Ionicons name="reader-outline" size={16} color={p.labelSecondary} />
        <Text style={[emphasize(type.footnote), { color: p.labelSecondary, flex: 1 }]}>
          {t('result.favoriteNote')}
        </Text>
      </View>

      {note ? (
        <View
          style={{
            backgroundColor: p.surfaceSunken,
            borderRadius: radius.md,
            padding: space.md,
            marginTop: space.md,
          }}
        >
          <Text style={[type.callout, { color: p.label }]}>{note}</Text>
        </View>
      ) : (
        <Text style={[type.callout, { color: p.labelSecondary, marginTop: space.md }]}>
          {t('favorite.field.noteHint')}
        </Text>
      )}

      {favorite.heightM ? (
        <Text style={[type.caption, { color: p.labelTertiary, marginTop: space.sm }]}>
          {t('result.favoriteHeightNote', favorite.heightM)}
        </Text>
      ) : null}

      <View style={{ marginTop: space.md }}>
        <GhostButton
          label={t('result.favoriteEdit')}
          icon="create-outline"
          onPress={() => router.push({ pathname: '/favorito/[id]', params: { id: favorite.id } })}
        />
      </View>
    </Card>
  );
}
