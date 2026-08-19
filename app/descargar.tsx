import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapFrame, type MapFrameHandle } from '../src/components/MapFrame';
import { Banner, PrimaryButton } from '../src/components/ui';
import { Material } from '../src/components/Material';
import { PressableScale } from '../src/components/motion';
import { usePalette, useScheme } from '../src/hooks/useTheme';
import { buildMapHtml } from '../src/map/mapHtml';
import { getLayerIds } from '../src/api/enaire';
import { describePoint } from '../src/api/geocode';
import {
  buildPack,
  DEFAULT_RADIUS_KM,
  getPackMeta,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  type BuildProgress,
} from '../src/offline/pack';
import { radius as r, space, tabular, type, emphasize } from '../src/theme';

const FALLBACK_IDS = { aero: 2, urbano: 3, infraestructuras: 0 };

const STEP_LABEL: Record<BuildProgress['step'], string> = {
  zonas: 'Descargando las zonas de ENAIRE…',
  elevacion: 'Descargando la elevación del terreno…',
  guardando: 'Guardando en el móvil…',
};

/**
 * Elegir qué zona descargar.
 *
 * El círculo se queda quieto en el centro y lo que se mueve es el mapa: es la
 * forma que menos se pelea con los dedos y la que ya usa la pantalla de mapa
 * para elegir un punto.
 */
export default function DescargarScreen() {
  const p = usePalette();
  const scheme = useScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapFrameHandle>(null);

  const [layerIds, setLayerIds] = useState<typeof FALLBACK_IDS | null>(null);
  const [start, setStart] = useState<{ lat: number; lon: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  // El panel cambia de alto según el estado, así que el botón de ubicación se
  // coloca midiéndolo en vez de con un número fijo.
  const [panelHeight, setPanelHeight] = useState(240);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Punto de partida: la zona ya descargada, o donde estés, o Madrid.
  useEffect(() => {
    let alive = true;
    (async () => {
      const meta = await getPackMeta().catch(() => null);
      if (meta && alive) {
        setStart(meta.center);
        setRadiusKm(meta.radiusKm);
        return;
      }
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          if (alive) {
            setStart({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            return;
          }
        }
      } catch {
        /* seguimos con el punto por defecto */
      }
      if (alive) setStart({ lat: 40.4168, lon: -3.7038 });
    })();
    getLayerIds()
      .then((ids) => alive && setLayerIds(ids))
      .catch(() => alive && setLayerIds(FALLBACK_IDS));
    return () => {
      alive = false;
      abortRef.current?.abort();
    };
  }, []);

  const html = useMemo(
    () =>
      layerIds && start
        ? buildMapHtml({
            lat: start.lat,
            lon: start.lon,
            zoom: 9,
            layerIds,
            visible: { aero: true, urbano: false, infraestructuras: true },
            dark: scheme === 'dark',
          })
        : null,
    // El HTML se construye una vez: el círculo y el tema van por mensajes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layerIds, start !== null],
  );

  const send = useCallback((msg: object) => mapRef.current?.post(msg), []);

  // El círculo sigue al centro del mapa; aquí sólo se manda el radio.
  useEffect(() => {
    send({ type: 'circle', radiusM: radiusKm * 1000 });
  }, [radiusKm, send]);

  // El HTML se construye una vez, así que el cambio de aspecto va por mensaje.
  useEffect(() => {
    send({ type: 'theme', dark: scheme === 'dark' });
  }, [scheme, send]);

  const onMessage = useCallback(
    (data: unknown) => {
      const msg = data as { type?: string; lat?: number; lon?: number };
      if ((msg.type === 'ready' || msg.type === 'move') && msg.lat != null && msg.lon != null) {
        setCenter({ lat: msg.lat, lon: msg.lon });
        if (msg.type === 'ready') send({ type: 'circle', radiusM: radiusKm * 1000 });
      }
    },
    [radiusKm, send],
  );

  const goToMyLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      send({ type: 'center', lat: pos.coords.latitude, lon: pos.coords.longitude, zoom: 10 });
    } catch {
      /* silencioso */
    }
  }, [send]);

  const download = useCallback(async () => {
    if (!center) return;
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ step: 'zonas', pct: 0 });
    try {
      const label =
        (await describePoint(center.lat, center.lon).catch(() => null)) ?? 'Zona descargada';
      await buildPack(center, label, radiusKm, setProgress, controller.signal);
      if (controller.signal.aborted) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof Error ? `No se ha podido descargar: ${err.message}` : 'No se ha podido descargar.',
      );
      setProgress(null);
    }
  }, [center, radiusKm, router]);

  const side = radiusKm * 2;
  const busy = progress !== null;

  return (
    <>
      <Stack.Screen options={{ title: 'Elegir zona', headerShown: true }} />
      <View style={{ flex: 1, backgroundColor: p.background }}>
        {html ? (
          <MapFrame ref={mapRef} html={html} onMessage={onMessage} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[type.footnote, { color: p.labelSecondary }]}>Preparando el mapa…</Text>
          </View>
        )}

        {/* Ayuda flotante */}
        <View style={{ position: 'absolute', top: space.md, left: space.md, right: space.md }}>
          <Material weight="chrome" radius={r.pill}>
            <View
              style={{
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
              }}
            >
              <Ionicons name="hand-left-outline" size={16} color={p.labelSecondary} />
              <Text style={[type.footnote, { color: p.label, flex: 1 }]}>
                Mueve el mapa para colocar el círculo donde vayas a volar.
              </Text>
            </View>
          </Material>
        </View>

        <View style={{ position: 'absolute', right: space.md, bottom: panelHeight + space.md }}>
          <Material weight="chrome" radius={24}>
            <PressableScale
              onPress={goToMyLocation}
              accessibilityRole="button"
              accessibilityLabel="Centrar en mi ubicación"
              style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="locate" size={22} color={p.tint} />
            </PressableScale>
          </Material>
        </View>

        {/* Panel inferior */}
        <View
          onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        >
        <Material weight="sheet" radius={r.sheet}>
        <View
          style={{
              paddingHorizontal: space.lg,
              paddingTop: space.lg,
              paddingBottom: insets.bottom + space.lg,
              gap: space.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
            <Text style={[type.largeTitle, tabular, { color: p.label }]}>{radiusKm}</Text>
            <Text style={[emphasize(type.title3), { color: p.label }]}>km de radio</Text>
            <Text style={[type.footnote, tabular, { color: p.labelSecondary, flex: 1, textAlign: 'right' }]}>
              {side} × {side} km
            </Text>
          </View>

          <Slider
            value={radiusKm}
            onValueChange={(v) => setRadiusKm(Math.round(v))}
            onSlidingComplete={() => Haptics.selectionAsync().catch(() => {})}
            minimumValue={MIN_RADIUS_KM}
            maximumValue={MAX_RADIUS_KM}
            step={1}
            minimumTrackTintColor={p.tint}
            maximumTrackTintColor={p.skeleton}
            thumbTintColor={p.tint}
            disabled={busy}
            accessibilityLabel={`Radio de descarga: ${radiusKm} kilómetros`}
            style={{ height: 40 }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[type.caption2, tabular, { color: p.labelTertiary }]}>{MIN_RADIUS_KM} km</Text>
            <Text style={[type.caption2, tabular, { color: p.labelTertiary }]}>{MAX_RADIUS_KM} km</Text>
          </View>

          {progress ? (
            <View style={{ gap: space.sm }}>
              <Text style={[type.footnote, { color: p.labelSecondary }]}>{STEP_LABEL[progress.step]}</Text>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: p.skeleton, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${Math.round(progress.pct * 100)}%`,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: p.tint,
                  }}
                />
              </View>
            </View>
          ) : (
            <PrimaryButton
              label={center ? 'Descargar esta zona' : 'Mueve el mapa…'}
              icon="cloud-download-outline"
              onPress={download}
              disabled={!center}
            />
          )}

          {error ? <Banner tone="warn">{error}</Banner> : null}

          <Text style={[type.caption, { color: p.labelTertiary }]}>
            Cuanto más grande, más tarda y más ocupa. Un radio de 25 km suele quedarse por debajo de
            3 MB. Sustituye a la zona que tuvieras descargada.
          </Text>
        </View>
        </Material>
        </View>
      </View>
    </>
  );
}
