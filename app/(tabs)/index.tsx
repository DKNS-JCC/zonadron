import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, RefreshControl, Text, View } from 'react-native';
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
import { Appear } from '../../src/components/motion';
import { HistoryList } from '../../src/components/HistoryList';
import { usePalette } from '../../src/hooks/useTheme';
import { useSettings } from '../../src/state/SettingsContext';
import { useHistory } from '../../src/state/HistoryContext';
import { checkPoint } from '../../src/logic/query';
import {
  REFINE_THRESHOLD_M,
  VERDICT_MAX_ACCURACY_M,
  distanceM,
  ensureLocationPermission,
  getPreciseFix,
  getQuickFix,
  hasLocationPermission,
  rememberCoords,
} from '../../src/logic/location';
import { describePoint } from '../../src/api/geocode';
import { space, systemColor, type } from '../../src/theme';
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

  /**
   * Consulta un punto y pinta el resultado. En modo `silent` no toca el estado
   * de carga ni borra lo que hay: es el refinado que corre por detrás cuando ya
   * hay un veredicto en pantalla y sólo queremos sustituirlo si mejora.
   */
  const runQuery = useCallback(
    async (coords: Coords, height: number, silent = false) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!silent) setPhase('querying');
      setError(null);
      setStale(false);
      try {
        const res = await checkPoint(coords, height, controller.signal);
        if (controller.signal.aborted) return;
        setResult(res);
        setPhase('done');
        remember(res, placeRef.current);
        // El refinado no vuelve a vibrar: es el mismo sitio, ya avisamos.
        if (Platform.OS !== 'web' && !silent) {
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
        // Si falla el refinado, lo que hay en pantalla sigue siendo válido —es
        // el mismo punto, medido algo peor—, así que se calla y no se toca nada.
        if (silent) return;
        // Un resultado viejo en pantalla junto a un error es peor que ningún
        // resultado: el usuario creería que el verde corresponde a lo que ve.
        setResult(null);
        setError(err instanceof Error ? err.message : 'Error inesperado');
        setPhase('error');
      }
    },
    [remember],
  );

  /**
   * Localiza y consulta. El fix cacheado del sistema, si es lo bastante fino,
   * arranca la consulta a ENAIRE de inmediato en vez de esperar al GPS: así la
   * ida y vuelta a la red se solapa con el tiempo que tarda en fijar posición.
   * Cuando llega el fix bueno se recalcula, pero sólo si te has movido de sitio
   * —repetir la consulta por veinte metros sería gastar red para nada.
   */
  const locateAndCheck = useCallback(async () => {
    setPhase('locating');
    setError(null);
    setPlace(null);
    placeRef.current = null;

    const granted = await ensureLocationPermission();
    if (!granted) {
      setError(
        'Necesito acceso a tu ubicación para comprobar dónde estás. Puedes activarlo en los ajustes del móvil, o usar las pestañas Mapa y Buscar para consultar un punto a mano.',
      );
      setPhase('error');
      return;
    }

    const quick = await getQuickFix();
    const quickIsUsable =
      quick !== null && quick.accuracy !== null && quick.accuracy <= VERDICT_MAX_ACCURACY_M;
    if (quick && quickIsUsable) {
      lastCoords.current = quick.coords;
      setAccuracy(quick.accuracy);
      runQuery(quick.coords, flightHeight);
    }

    try {
      const precise = await getPreciseFix();
      rememberCoords(precise.coords);
      const moved =
        !quickIsUsable || !quick || distanceM(quick.coords, precise.coords) > REFINE_THRESHOLD_M;
      lastCoords.current = precise.coords;
      setAccuracy(precise.accuracy);
      // Con un veredicto ya en pantalla el refinado es silencioso: no vuelve a
      // salir la rueda ni parpadea nada, el resultado se sustituye y ya está.
      if (moved) await runQuery(precise.coords, flightHeight, quickIsUsable);
    } catch (err) {
      // Si el fix rápido ya lanzó la consulta, no se pisa con un error: hay algo
      // en pantalla y es correcto.
      if (quickIsUsable) return;
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
    hasLocationPermission()
      .then((granted) => {
        if (alive && granted) locateAndCheck();
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
        <RefreshControl refreshing={busy} onRefresh={locateAndCheck} tintColor={p.tint} />
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md, paddingHorizontal: space.xs }}>
        <Text style={[type.largeTitle, { color: p.label, flex: 1 }]}>¿Puedo volar aquí?</Text>
        {result ? (
          <IconButton icon="locate" label="Comprobar mi ubicación otra vez" onPress={locateAndCheck} />
        ) : null}
      </View>

      {!result && !busy ? (
        <Text
          style={[
            type.subheadline,
            { color: p.labelSecondary, marginTop: -space.sm, paddingHorizontal: space.xs },
          ]}
        >
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
                <GhostButton label="Reintentar" icon="refresh" onPress={locateAndCheck} />
              </View>
            </View>
          </Card>
        </Appear>
      ) : null}

      {busy && !result ? (
        <Card>
          <SkeletonRows rows={3} />
        </Card>
      ) : null}

      {result ? (
        <>
          <ResultView
            result={result}
            place={place}
            accuracy={accuracy}
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
            <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.md }]}>
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
