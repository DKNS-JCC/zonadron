import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenScroll } from '../../src/components/Screen';
import { Card, GhostButton, ScreenTitle, SectionTitle } from '../../src/components/ui';
import { FavoritesList } from '../../src/components/FavoritesList';
import { usePalette } from '../../src/hooks/useTheme';
import { useFavorites } from '../../src/state/FavoritesContext';
import { useFlightLog } from '../../src/state/FlightLogContext';
import { verdictLevelLabel } from '../../src/logic/labels';
import { timeAgo } from '../../src/state/HistoryContext';
import { space, type } from '../../src/theme';
import { t } from '../../src/i18n';

/**
 * Cuaderno: los sitios que te importan y lo que has volado, en un sitio —
 * antes repartido entre la pestaña de Buscar (favoritos) y Ajustes (diario).
 * Las Normas, que antes eran su propia pestaña, se abren desde aquí: es
 * contenido de referencia que se consulta de vez en cuando, no algo que
 * necesite un hueco fijo en la barra.
 */
export default function CuadernoScreen() {
  const p = usePalette();
  const router = useRouter();
  const { favorites } = useFavorites();
  const { entries: flights } = useFlightLog();

  const open = (lat: number, lon: number, label: string | null) => {
    router.push({
      pathname: '/resultado',
      params: { lat: String(lat), lon: String(lon), ...(label ? { label } : {}) },
    });
  };

  const lastFlight = flights[0] ?? null;

  return (
    <ScreenScroll>
      <ScreenTitle
        title={t('notebook.title')}
        subtitle={t('notebook.subtitle')}
      />

      <View style={{ gap: space.md }}>
        <SectionTitle>{t('notebook.favorites')}</SectionTitle>
        {favorites.length > 0 ? (
          <FavoritesList onOpen={open} />
        ) : (
          <Card>
            <Text style={[type.callout, { color: p.labelSecondary }]}>
              {t('notebook.favoritesEmpty')}
            </Text>
          </Card>
        )}
      </View>

      <View style={{ gap: space.md }}>
        <SectionTitle>{t('notebook.logTitle')}</SectionTitle>
        <Card>
          {lastFlight ? (
            <>
              <Text style={[type.callout, { color: p.label }]}>
                {t('notebook.logCount', flights.length)}
              </Text>
              <Text style={[type.footnote, { color: p.labelSecondary, marginTop: 2 }]}>
                {t(
                  'notebook.logLast',
                  lastFlight.label ??
                    `${lastFlight.lat.toFixed(4)}, ${lastFlight.lon.toFixed(4)}`,
                  verdictLevelLabel(lastFlight.verdictLevel),
                  timeAgo(lastFlight.loggedAt),
                )}
              </Text>
            </>
          ) : (
            <Text style={[type.callout, { color: p.labelSecondary }]}>
              {t('notebook.logEmpty')}
            </Text>
          )}
          <View style={{ marginTop: space.md }}>
            <GhostButton
              label={flights.length > 0 ? t('notebook.openLogFull') : t('notebook.openLog')}
              icon="book-outline"
              onPress={() => router.push('/diario')}
            />
          </View>
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionTitle>{t('notebook.rulesTitle')}</SectionTitle>
        <Card>
          <Text style={[type.callout, { color: p.labelSecondary }]}>
            {t('notebook.rulesBody')}
          </Text>
          <View style={{ marginTop: space.md }}>
            <GhostButton
              label={t('notebook.rulesButton')}
              icon="shield-checkmark-outline"
              onPress={() => router.push('/normas')}
            />
          </View>
        </Card>
      </View>
    </ScreenScroll>
  );
}
