import React from 'react';
import { Alert, Linking, Pressable, Share, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenScroll } from '../../src/components/Screen';
import {
  Card,
  EmptyState,
  GhostButton,
  InfoRow,
  PrimaryButton,
  SectionTitle,
} from '../../src/components/ui';
import { Field } from '../../src/components/Field';
import { HeightControl } from '../../src/components/HeightControl';
import { usePalette } from '../../src/hooks/useTheme';
import { useFavorites } from '../../src/state/FavoritesContext';
import { useSettings } from '../../src/state/SettingsContext';
import { timeAgo } from '../../src/state/HistoryContext';
import { favoriteCoords, favoriteName } from '../../src/logic/favorites';
import { verdictLevelLabel } from '../../src/logic/labels';
import { buildFavoriteShareText, drivingDirectionsUrl } from '../../src/logic/share';
import { emphasize, space, systemColor, type } from '../../src/theme';
import { t } from '../../src/i18n';

/**
 * Ficha de un sitio guardado.
 *
 * Una coordenada sola no vale de nada dentro de un mes. Aquí es donde el punto
 * se convierte en un sitio: el nombre con el que lo reconoces, la nota de cómo
 * se llega y qué vigilar, y la altura a la que sueles volar ahí.
 *
 * Se guarda según se escribe, igual que la ficha de un dron: no hay botón de
 * guardar que puedas dejarte sin pulsar con el dron ya en la mano.
 */
export default function FavoritoScreen() {
  const p = usePalette();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getFavorite, updateFavorite, removeFavorite } = useFavorites();
  const { flightHeight } = useSettings();

  const fav = getFavorite(id);

  if (!fav) {
    return (
      <>
        <Stack.Screen options={{ title: t('favorite.title'), headerShown: true }} />
        <ScreenScroll>
          <EmptyState icon="star-outline" title={t('favorite.gone')} />
        </ScreenScroll>
      </>
    );
  }

  const name = favoriteName(fav);

  const confirmDelete = () => {
    Alert.alert(t('favorite.remove'), t('favorite.removeConfirm', name), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeFavorite(fav.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: name, headerShown: true }} />
      <ScreenScroll>
        {/* Lo tuyo ------------------------------------------------------ */}
        <View style={{ gap: space.md }}>
          <SectionTitle>{t('favorite.section.yours')}</SectionTitle>
          <Card>
            <View style={{ gap: space.md }}>
              <Field
                label={t('favorite.field.name')}
                value={fav.name ?? ''}
                onChange={(value) => updateFavorite(fav.id, { name: value })}
                placeholder={fav.label || t('favorite.field.namePlaceholder')}
                hint={t('favorite.field.nameHint')}
                autoCapitalize="sentences"
              />
              <Field
                label={t('favorite.field.note')}
                value={fav.note ?? ''}
                onChange={(value) => updateFavorite(fav.id, { note: value })}
                placeholder={t('favorite.field.notePlaceholder')}
                hint={t('favorite.field.noteHint')}
                autoCapitalize="sentences"
                multiline
              />
              <Text style={[type.caption, { color: p.labelTertiary }]}>
                {t('favorite.savedNote')}
              </Text>
            </View>
          </Card>
        </View>

        {/* Altura propia del sitio -------------------------------------- */}
        <View style={{ gap: space.md }}>
          <SectionTitle>{t('favorite.section.height')}</SectionTitle>
          <Card>
            <View style={{ gap: space.md }}>
              <Text style={[type.footnote, { color: p.labelSecondary }]}>
                {fav.heightM
                  ? t('favorite.heightSet', fav.heightM)
                  : t('favorite.heightUnset', flightHeight)}
              </Text>
              {fav.heightM ? (
                <>
                  <HeightControl
                    value={fav.heightM}
                    onChange={(h) => updateFavorite(fav.id, { heightM: h })}
                  />
                  <GhostButton
                    label={t('favorite.heightClear')}
                    icon="refresh-outline"
                    onPress={() => updateFavorite(fav.id, { heightM: undefined })}
                  />
                </>
              ) : (
                <GhostButton
                  label={t('favorite.heightUse')}
                  icon="swap-vertical"
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    updateFavorite(fav.id, { heightM: flightHeight });
                  }}
                />
              )}
            </View>
          </Card>
        </View>

        {/* El punto ----------------------------------------------------- */}
        <View style={{ gap: space.md }}>
          <SectionTitle>{t('favorite.section.point')}</SectionTitle>
          <Card>
            <InfoRow label={t('favorite.coords')} value={favoriteCoords(fav)} />
            <InfoRow
              label={t('favorite.lastCheckLabel')}
              value={t(
                'favorite.lastCheck',
                verdictLevelLabel(fav.lastLevel),
                timeAgo(fav.lastCheckedAt),
              )}
            />
            <InfoRow label={t('favorite.savedAt')} value={timeAgo(fav.savedAt)} />
          </Card>

          <PrimaryButton
            label={t('favorite.check')}
            icon="navigate-circle-outline"
            onPress={() =>
              router.push({
                pathname: '/resultado',
                params: { lat: String(fav.lat), lon: String(fav.lon), label: name },
              })
            }
          />

          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <GhostButton
                label={t('favorite.directions')}
                icon="car-outline"
                onPress={() =>
                  Linking.openURL(drivingDirectionsUrl(fav.lat, fav.lon)).catch(() => {})
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <GhostButton
                label={t('favorite.share')}
                icon="share-outline"
                onPress={() => {
                  Share.share({ message: buildFavoriteShareText(fav) }).catch(() => {});
                }}
              />
            </View>
          </View>
        </View>

        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          style={({ pressed }) => ({
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={[emphasize(type.callout), { color: systemColor('red', p) }]}>
            {t('favorite.remove')}
          </Text>
        </Pressable>
      </ScreenScroll>
    </>
  );
}
