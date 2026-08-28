import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScroll } from '../src/components/Screen';
import { ResultView } from '../src/components/ResultView';
import { Banner, Card, GhostButton, SkeletonRows } from '../src/components/ui';
import { Appear } from '../src/components/motion';
import { usePalette } from '../src/hooks/useTheme';
import { useSettings } from '../src/state/SettingsContext';
import { useHistory } from '../src/state/HistoryContext';
import { useFavorites } from '../src/state/FavoritesContext';
import { checkPoint } from '../src/logic/query';
import { describePoint } from '../src/api/geocode';
import { verdictLevelLabel } from '../src/logic/labels';
import { t } from '../src/i18n';
import { space, systemColor, type } from '../src/theme';
import type { QueryResult, VerdictLevel } from '../src/types';

export default function ResultadoScreen() {
  const p = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lon?: string; label?: string }>();
  const { flightHeight, setFlightHeight } = useSettings();
  const { remember } = useHistory();
  const { checkForChange, favoriteAt, updateFavorite, ready: favoritesReady } = useFavorites();

  const lat = Number(params.lat);
  const lon = Number(params.lon);
  const valid = Number.isFinite(lat) && Number.isFinite(lon);

  /**
   * Si este punto está guardado y le has puesto altura propia, se comprueba con
   * ella. Es la razón de que exista esa altura: llegar al sitio, abrirlo y que
   * ya esté a los 30 m a los que vuelas ahí, sin tocar nada.
   */
  const saved = valid ? favoriteAt(lat, lon) : null;
  const startHeight = saved?.heightM ?? flightHeight;

  const [result, setResult] = useState<QueryResult | null>(null);
  const [place, setPlace] = useState<string | null>(params.label ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Si este punto es un favorito y el veredicto ya no es el que había cuando
  // se guardó, aquí se queda el nivel de entonces para poder avisar.
  const [changedFrom, setChangedFrom] = useState<VerdictLevel | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const placeRef = useRef<string | null>(params.label ?? null);

  const run = useCallback(
    async (height: number) => {
      if (!valid) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      setChangedFrom(null);
      try {
        const res = await checkPoint({ lat, lon }, height, controller.signal);
        if (controller.signal.aborted) return;
        setResult(res);
        remember(res, placeRef.current);
        setChangedFrom(checkForChange(res));
      } catch (err) {
        if (controller.signal.aborted) return;
        setResult(null);
        setError(err instanceof Error ? err.message : t('point.unexpectedError'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [lat, lon, valid, remember, checkForChange],
  );

  // Se espera a que carguen los favoritos antes de la primera consulta: sin eso
  // el sitio se comprobaría con la altura general y habría que repetirlo entero
  // medio segundo después. La lectura es de disco local y tarda un suspiro.
  useEffect(() => {
    if (!favoritesReady) return;
    run(startHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, favoritesReady]);

  // Nombre del sitio: se cancela junto con la pantalla para no tocar el estado
  // de un componente ya desmontado.
  useEffect(() => {
    if (!valid || params.label) return;
    const controller = new AbortController();
    describePoint(lat, lon, controller.signal)
      .then((name) => {
        if (controller.signal.aborted) return;
        placeRef.current = name;
        setPlace(name);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [lat, lon, valid, params.label]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** La altura con la que está hecho lo que se ve: es la que hay que repetir. */
  const currentHeight = result?.flightHeightAgl ?? startHeight;

  if (!valid) {
    return (
      <ScreenScroll>
        <Card>
          <Text style={[type.callout, { color: p.label }]}>{t('point.invalidCoords')}</Text>
        </Card>
      </ScreenScroll>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: place ?? t('point.title') }} />
      <ScreenScroll
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => run(currentHeight)} tintColor={p.tint} />
        }
      >
        {loading && !result ? (
          <Card>
            <SkeletonRows rows={4} />
          </Card>
        ) : null}

        {error ? (
          <Appear>
            <Card>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                <Ionicons
                  name="alert-circle"
                  size={22}
                  color={systemColor('red', p)}
                  style={{ marginTop: 1 }}
                />
                <View style={{ flex: 1, gap: space.md }}>
                  <Text style={[type.callout, { color: p.label }]}>{error}</Text>
                  <GhostButton
                    label={t('point.retry')}
                    icon="refresh"
                    onPress={() => run(currentHeight)}
                  />
                </View>
              </View>
            </Card>
          </Appear>
        ) : null}

        {result && changedFrom ? (
          <Banner tone="warn" icon="star">
            {t(
              'point.favoriteChanged',
              verdictLevelLabel(changedFrom),
              verdictLevelLabel(result.verdict.level),
            )}
          </Banner>
        ) : null}

        {result ? (
          <ResultView
            result={result}
            place={place}
            onHeightChange={(h) => {
              // En un sitio con altura propia, la altura que se toca es la
              // suya: cambiar la general desde aquí le movería el ajuste a
              // toda la app por tocar un sitio concreto.
              if (saved?.heightM) updateFavorite(saved.id, { heightM: h });
              else setFlightHeight(h);
              run(h);
            }}
            onRefresh={() => run(currentHeight)}
            refreshing={loading}
            onOpenMap={() =>
              router.push({ pathname: '/mapa', params: { lat: String(lat), lon: String(lon) } })
            }
          />
        ) : null}
      </ScreenScroll>
    </>
  );
}
