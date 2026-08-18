import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, RefreshControl, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScroll } from '../../src/components/Screen';
import { ResultView } from '../../src/components/ResultView';
import { HeightControl } from '../../src/components/HeightControl';
import {
  Banner,
  Card,
  EmptyState,
  GhostButton,
  IconButton,
  PrimaryButton,
  SectionTitle,
  SkeletonRows,
} from '../../src/components/ui';
import { FadeInUp } from '../../src/components/motion';
import { HistoryList } from '../../src/components/HistoryList';
import { usePalette } from '../../src/hooks/useTheme';
import { useSettings } from '../../src/state/SettingsContext';
import { useHistory } from '../../src/state/HistoryContext';
import { checkPoint } from '../../src/logic/query';
import { describePoint } from '../../src/api/geocode';
import { space, type } from '../../src/theme';
import type { Coords, QueryResult } from '../../src/types';

type Phase = 'idle' | 'locating' | 'querying' | 'done' | 'error';

/** A partir de aquí un resultado deja de ser de fiar: las zonas y los NOTAM cambian. */
const STALE_MS = 10 * 60 * 1000;

export default function HomeScreen() {
  const p = usePalette();
  const router = useRouter();
  const { flightHeight, setFlightHeight, ready } = useSettings();
  const { remember } = useHistory();

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const lastCoords = useRef<Coords | null>(null);
  const placeRef = useRef<string | null>(null);

  const runQuery = useCallback(
    async (coords: Coords, height: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPhase('querying');
      setError(null);
      setStale(false);
      try {
        const res = await checkPoint(coords, height, controller.signal);
        if (controller.signal.aborted) return;
        setResult(res);
        setPhase('done');
        remember(res, placeRef.current);
        if (Platform.OS !== 'web') {
          const notify =
            res.verdict.level === 'PROHIBIDO' || res.verdict.level === 'AUTORIZACION'
              ? Haptics.NotificationFeedbackType.Warning
              : res.verdict.level === 'DESCONOCIDO'
                ? Haptics.NotificationFeedbackType.Error
                : Haptics.NotificationFeedbackType.Success;
          Haptics.notificationAsync(notify).catch(() => {});
        }
        describePoint(coords.lat, coords.lon, controller.signal)
          .then((name) => {
            if (controller.signal.aborted) return;
            placeRef.current = name;
            setPlace(name);
          })
          .catch(() => {});
      } catch (err) {
        if (controller.signal.aborted) return;
        // Un resultado viejo en pantalla junto a un error es peor que ningún
        // resultado: el usuario creería que el verde corresponde a lo que ve.
        setResult(null);
        setError(err instanceof Error ? err.message : 'Error inesperado');
        setPhase('error');
      }
    },
    [remember],
  );

  const locateAndCheck = useCallback(async () => {
    setPhase('locating');
    setError(null);
    setPlace(null);
    placeRef.current = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(
          'Necesito acceso a tu ubicación para comprobar dónde estás. Puedes activarlo en los ajustes del móvil, o usar las pestañas Mapa y Buscar para consultar un punto a mano.',
        );
        setPhase('error');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords: Coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      lastCoords.current = coords;
      setAccuracy(pos.coords.accuracy ?? null);
      await runQuery(coords, flightHeight);
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se ha podido obtener tu ubicación: ${err.message}`
          : 'No se ha podido obtener tu ubicación.',
      );
      setPhase('error');
    }
  }, [flightHeight, runQuery]);

  // Consulta automática al abrir si ya hay permiso concedido.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => {
        if (alive && status === 'granted') locateAndCheck();
      })
      .catch(() => {});
    return () => {
      alive = false;
      abortRef.current?.abort();
    };
    // Sólo al arrancar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // La altura se puede cambiar desde otras pantallas: si no coincide con la del
  // resultado que hay en pantalla, se recalcula. Antes convivían en la misma
  // pantalla una altura y un veredicto que no se correspondían.
  useEffect(() => {
    if (result && lastCoords.current && result.flightHeightAgl !== flightHeight) {
      runQuery(lastCoords.current, flightHeight);
    }
  }, [flightHeight, result, runQuery]);

  // Un resultado guardado no vale para siempre: al volver a la app se marca.
  useEffect(() => {
    const check = () => {
      if (!result) return;
      setStale(Date.now() - new Date(result.queriedAt).getTime() > STALE_MS);
    };
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    const timer = setInterval(check, 60000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [result]);

  const busy = phase === 'locating' || phase === 'querying';

  return (
    <ScreenScroll
      refreshControl={
        <RefreshControl refreshing={busy} onRefresh={locateAndCheck} tintColor={p.accent} />
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Text style={[type.title, { color: p.text, flex: 1 }]}>¿Puedo volar aquí?</Text>
        {result ? (
          <IconButton icon="locate" label="Comprobar mi ubicación otra vez" onPress={locateAndCheck} />
        ) : null}
      </View>

      {!result && !busy ? (
        <Text style={[type.body, { color: p.textMuted, marginTop: -space.sm }]}>
          Comprueba tu punto exacto contra las Zonas Geográficas UAS oficiales de ENAIRE.
        </Text>
      ) : null}

      {!result ? (
        <PrimaryButton
          label={
            busy
              ? phase === 'locating'
                ? 'Buscando tu posición…'
                : 'Consultando a ENAIRE…'
              : 'Comprobar mi ubicación'
          }
          icon="locate"
          onPress={locateAndCheck}
          loading={busy}
        />
      ) : null}

      {stale && result ? (
        <Banner tone="warn" icon="time-outline">
          Este resultado tiene más de 10 minutos. Si te has movido o ha pasado un rato, vuelve a
          comprobarlo antes de despegar.
        </Banner>
      ) : null}

      {phase === 'error' && error ? (
        <FadeInUp>
          <Card>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <Ionicons name="alert-circle" size={22} color="#BE2318" style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: space.md }}>
                <Text style={[type.body, { color: p.text }]}>{error}</Text>
                <GhostButton label="Reintentar" icon="refresh" onPress={locateAndCheck} />
              </View>
            </View>
          </Card>
        </FadeInUp>
      ) : null}

      {busy && !result ? (
        <Card>
          <SkeletonRows rows={3} />
        </Card>
      ) : null}

      {result ? (
        <>
          {accuracy !== null && accuracy > 50 ? (
            <Banner tone="warn">
              Tu posición tiene una precisión de ±{Math.round(accuracy)} m. Si estás cerca del borde
              de una zona, confirma el punto en el mapa.
            </Banner>
          ) : null}
          <ResultView
            result={result}
            place={place}
            onHeightChange={setFlightHeight}
            onRefresh={locateAndCheck}
            refreshing={busy}
            onOpenMap={() =>
              router.push({
                pathname: '/mapa',
                params: {
                  lat: String(result.coords.lat),
                  lon: String(result.coords.lon),
                },
              })
            }
          />
        </>
      ) : null}

      {!result && !busy ? (
        <>
          <Card>
            <SectionTitle>Altura de vuelo</SectionTitle>
            <HeightControl value={flightHeight} onChange={setFlightHeight} />
            <Text style={[type.caption, { color: p.textFaint, marginTop: space.md }]}>
              Metros sobre el terreno. Las zonas que empiezan por encima de esta altura no cuentan:
              cambiarla cambia la respuesta de verdad.
            </Text>
          </Card>

          <HistoryEmptyOrList onOpen={(lat, lon, label) =>
            router.push({ pathname: '/resultado', params: { lat: String(lat), lon: String(lon), ...(label ? { label } : {}) } })
          } />
        </>
      ) : null}
    </ScreenScroll>
  );
}

function HistoryEmptyOrList({
  onOpen,
}: {
  onOpen: (lat: number, lon: number, label: string | null) => void;
}) {
  const { entries } = useHistory();
  if (entries.length === 0) {
    return (
      <EmptyState
        icon="navigate-circle-outline"
        title="Aún no has consultado ningún punto"
        subtitle="Pulsa el botón de arriba para saber si puedes despegar donde estás, o busca un sitio concreto."
      />
    );
  }
  return (
    <View style={{ gap: space.md }}>
      <SectionTitle>Últimas consultas</SectionTitle>
      <HistoryList onOpen={onOpen} />
    </View>
  );
}
