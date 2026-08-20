import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Material } from '../../components/Material';
import { GhostButton, IconButton } from '../../components/ui';
import { usePalette } from '../../hooks/useTheme';
import { space, tabular, type, verdictTint } from '../../theme';
import { formatDistance } from './usePhotoTarget';
import type { NearestFlyableResult } from '../../offline/nearest';
import type { Coords } from '../../types';
import { t } from '../../i18n';

type PhotoState =
  | { state: 'buscando' }
  | { state: 'sin-paquete' }
  | { state: 'listo'; target: Coords; result: NearestFlyableResult }
  | null;

/**
 * Resultado de "quiero fotografiar esto": el punto más cercano desde el que
 * se puede volar sin autorización, con distancia y rumbo. JSX puro, todo el
 * estado viene de usePhotoTarget.
 */
export function PhotoTargetPanel({
  photo,
  flightHeight,
  onClear,
}: {
  photo: PhotoState;
  flightHeight: number;
  onClear: () => void;
}) {
  const p = usePalette();
  const router = useRouter();

  if (!photo) return null;

  return (
    <Material weight="panel" radius={16}>
      <View style={{ padding: space.lg, gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="camera" size={15} color={p.labelSecondary} />
          <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase', flex: 1 }]}>
            {t('photo.title')}
          </Text>
          <IconButton
            icon="close"
            label={t('photo.clear')}
            onPress={onClear}
            color={p.labelTertiary}
          />
        </View>

        {photo.state === 'buscando' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <ActivityIndicator size="small" color={p.labelSecondary} />
            <Text style={[type.callout, { color: p.label }]}>{t('photo.searching')}</Text>
          </View>
        ) : photo.state === 'sin-paquete' ? (
          <Text style={[type.callout, { color: p.label }]}>{t('photo.needsPack')}</Text>
        ) : photo.result.targetIsFlyable ? (
          <>
            <Text style={[type.title3, { color: verdictTint('LIBRE', p) }]}>
              {t('photo.flyFromTarget')}
            </Text>
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              {t('photo.flyFromTargetNote')}
            </Text>
          </>
        ) : photo.result.best || photo.result.anyHeight ? (
          (() => {
            const spot = photo.result.best ?? photo.result.anyHeight!;
            const exact = Boolean(photo.result.best);
            return (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={[type.largeTitle, tabular, { color: p.label }]}>
                    {formatDistance(spot.distanceM)}
                  </Text>
                  <Text style={[type.title3, { color: p.labelSecondary }]}>{spot.bearing}</Text>
                </View>
                <Text style={[type.footnote, { color: p.labelSecondary }]}>
                  {t('photo.spotHeight', spot.freeHeightM)}
                  {exact ? t('photo.spotExact') : t('photo.spotLess', flightHeight)}
                  {spot.distanceM > 500 ? t('photo.spotFar') : ''}
                </Text>
                <GhostButton
                  label={t('photo.openSpot')}
                  icon="arrow-forward"
                  onPress={() =>
                    router.push({
                      pathname: '/resultado',
                      params: { lat: String(spot.coords.lat), lon: String(spot.coords.lon) },
                    })
                  }
                />
              </>
            );
          })()
        ) : (
          <Text style={[type.callout, { color: p.label }]}>
            {t('photo.nothing', photo.result.searchedKm)}
          </Text>
        )}
      </View>
    </Material>
  );
}
