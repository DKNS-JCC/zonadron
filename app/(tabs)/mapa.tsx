import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MapFrame, type MapFrameHandle } from '../../src/components/MapFrame';
import { BottomSheet, type SheetState } from '../../src/components/BottomSheet';
import { ResultView } from '../../src/components/ResultView';
import { VerdictPill } from '../../src/components/VerdictCard';
import { Chip, SkeletonRows } from '../../src/components/ui';
import { Collapsible } from '../../src/components/motion';
import { usePalette } from '../../src/hooks/useTheme';
import { useSettings } from '../../src/state/SettingsContext';
import { buildMapHtml } from '../../src/map/mapHtml';
import { getLayerIds } from '../../src/api/enaire';
import { checkPoint } from '../../src/logic/query';
import { describePoint } from '../../src/api/geocode';
import { layerColor, layerDescription, layerLabel } from '../../src/logic/labels';
import { radius, shadow, space, type, verdictStyles } from '../../src/theme';
import type { Coords, LayerKey, QueryResult } from '../../src/types';

const ALL_LAYERS: LayerKey[] = ['aero', 'urbano', 'infraestructuras'];

/** Espera antes de consultar tras mover el mapa. Suficiente para no encadenar. */
const MOVE_DEBOUNCE_MS = 700;

export default function MapaScreen() {
  const p = usePalette();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapFrameHandle>(null);

  // Se puede llegar aquí desde un resultado: /mapa?lat=..&lon=..
  const params = useLocalSearchParams<{ lat?: string; lon?: string }>();
  const paramLat = Number(params.lat);
  const paramLon = Number(params.lon);
  const hasParams = Number.isFinite(paramLat) && Number.isFinite(paramLon);

  const { flightHeight, setFlightHeight } = useSettings();

  const [layerIds, setLayerIds] = useState<{ aero: number; urbano: number; infraestructuras: number } | null>(null);
  // La capa "urbano" de ENAIRE cubre España entera (son las FIR, ver
  // ADVISORY_LAYERS): pintada por defecto taparía todo el mapa sin aportar nada.
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    aero: true,
    urbano: false,
    infraestructuras: true,
  });
  const initialVisible = useRef(visible);
  const [legendOpen, setLegendOpen] = useState(false);

  const [result, setResult] = useState<QueryResult | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>('hidden');

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centerRef = useRef<Coords | null>(null);
  const heightRef = useRef(flightHeight);
  heightRef.current = flightHeight;

  useEffect(() => {
    let alive = true;
    getLayerIds()
      .then((ids) => alive && setLayerIds(ids))
      .catch(() => alive && setLayerIds({ aero: 2, urbano: 3, infraestructuras: 0 }));
    return () => {
      alive = false;
    };
  }, []);

  // El HTML se construye una sola vez: el tema se cambia por mensaje.
  const html = useMemo(
    () =>
      layerIds
        ? buildMapHtml({
            lat: hasParams ? paramLat : 40.4168,
            lon: hasParams ? paramLon : -3.7038,
            zoom: hasParams ? 14 : 11,
            layerIds,
            visible: initialVisible.current,
            dark: scheme === 'dark',
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layerIds],
  );

  const send = useCallback((msg: object) => {
    mapRef.current?.post(msg);
  }, []);

  useEffect(() => {
    send({ type: 'theme', dark: scheme === 'dark' });
  }, [scheme, send]);

  // Si se llega con coordenadas y el mapa ya estaba abierto, se recentra.
  useEffect(() => {
    if (hasParams) send({ type: 'center', lat: paramLat, lon: paramLon, zoom: 14 });
  }, [hasParams, paramLat, paramLon, send]);

  const query = useCallback(
    async (coords: Coords, height: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      setError(null);
      setSheet((s) => (s === 'hidden' ? 'peek' : s));
      try {
        const res = await checkPoint(coords, height, controller.signal);
        if (controller.signal.aborted) return;
        setResult(res);
        Haptics.selectionAsync().catch(() => {});
        describePoint(coords.lat, coords.lon, controller.signal)
          .then((name) => !controller.signal.aborted && setPlace(name))
          .catch(() => {});
      } catch (err) {
        if (controller.signal.aborted) return;
        setResult(null);
        setError(err instanceof Error ? err.message : 'No se ha podido consultar este punto.');
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    },
    [],
  );

  const scheduleQuery = useCallback(
    (coords: Coords) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => query(coords, heightRef.current), MOVE_DEBOUNCE_MS);
    },
    [query],
  );

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const toggleLayer = useCallback(
    (key: LayerKey) => {
      Haptics.selectionAsync().catch(() => {});
      setVisible((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        send({ type: 'layers', visible: next });
        return next;
      });
    },
    [send],
  );

  const goToMyLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      send({ type: 'center', lat: pos.coords.latitude, lon: pos.coords.longitude, zoom: 15 });
      if (pos.coords.accuracy) {
        send({
          type: 'accuracy',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          radius: pos.coords.accuracy,
        });
      }
    } catch {
      /* silencioso: el usuario puede mover el mapa a mano */
    }
  }, [send]);

  const onMessage = useCallback(
    (data: unknown) => {
      const msg = data as { type?: string; lat?: number; lon?: number };
      if (msg.type === 'movestart') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        abortRef.current?.abort();
        setBusy(true);
        return;
      }
      if ((msg.type === 'move' || msg.type === 'ready') && msg.lat != null && msg.lon != null) {
        const coords = { lat: msg.lat, lon: msg.lon };
        centerRef.current = coords;
        setPlace(null);
        scheduleQuery(coords);
      }
    },
    [scheduleQuery],
  );

  // Cambiar la altura recalcula el punto que está bajo la cruz.
  useEffect(() => {
    if (result && centerRef.current) query(centerRef.current, flightHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightHeight]);

  const tint = result
    ? p.scheme === 'dark'
      ? verdictStyles[result.verdict.level].onDark
      : verdictStyles[result.verdict.level].onLight
    : p.textMuted;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      {html ? (
        <MapFrame ref={mapRef} html={html} onMessage={onMessage} style={{ backgroundColor: p.bg }} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
          <ActivityIndicator color={p.accent} />
          <Text style={[type.caption, { color: p.textMuted }]}>Preparando el mapa oficial…</Text>
        </View>
      )}

      {/* Lectura en vivo de lo que hay bajo la cruz */}
      <View style={{ position: 'absolute', top: insets.top + space.sm, left: space.md, right: space.md, gap: space.sm }}>
        <View
          style={[
            {
              backgroundColor: p.tabBar,
              borderRadius: radius.md,
              paddingHorizontal: space.lg,
              minHeight: 48,
              borderWidth: 1,
              borderColor: p.cardBorder,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm + 2,
            },
            shadow,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={p.accent} />
          ) : (
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint }} />
          )}
          <Text style={[type.captionStrong, { color: p.text, flex: 1 }]} numberOfLines={1}>
            {busy
              ? 'Consultando el punto de la cruz…'
              : error
                ? 'No se ha podido consultar'
                : result
                  ? result.verdict.headline
                  : 'Mueve el mapa para consultar un punto'}
          </Text>
          <Pressable
            onPress={() => setLegendOpen((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Capas del mapa"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons name="layers-outline" size={21} color={p.accent} />
          </Pressable>
        </View>

        <Collapsible open={legendOpen}>
          <View
            style={[
              {
                backgroundColor: p.card,
                borderRadius: radius.md,
                padding: space.lg,
                borderWidth: 1,
                borderColor: p.cardBorder,
                gap: space.md,
              },
              shadow,
            ]}
          >
            {ALL_LAYERS.map((key) => (
              <Pressable
                key={key}
                onPress={() => toggleLayer(key)}
                accessibilityRole="switch"
                accessibilityState={{ checked: visible[key] }}
                style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}
              >
                <Ionicons
                  name={visible[key] ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={visible[key] ? layerColor[key] : p.textFaint}
                  style={{ marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[type.captionStrong, { color: p.text }]}>{layerLabel[key]}</Text>
                  <Text style={[type.caption, { color: p.textMuted, fontSize: 12 }]}>
                    {layerDescription[key]}
                  </Text>
                </View>
              </Pressable>
            ))}
            <Text style={[type.caption, { color: p.textFaint, fontSize: 12 }]}>
              El dibujo de las zonas se pide directamente al servicio de ENAIRE: es el mismo que
              verías en su visor oficial, con sus mismos colores.
            </Text>
          </View>
        </Collapsible>
      </View>

      {/* Botón de ubicación, por encima de la hoja */}
      <View
        style={{
          position: 'absolute',
          right: space.md,
          bottom: (sheet === 'hidden' ? insets.bottom + 90 : 190),
        }}
      >
        <Pressable
          onPress={goToMyLocation}
          accessibilityRole="button"
          accessibilityLabel="Centrar en mi ubicación"
          style={({ pressed }) => [
            {
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: pressed ? p.accentSoft : p.card,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: p.cardBorder,
            },
            shadow,
          ]}
        >
          <Ionicons name="locate" size={22} color={p.accent} />
        </Pressable>
      </View>

      <BottomSheet
        state={sheet}
        onStateChange={setSheet}
        minPeekHeight={140}
        header={
          result ? (
            <View style={{ gap: space.sm }}>
              <VerdictPill result={result} />
              {place ? (
                <Text style={[type.caption, { color: p.textMuted }]} numberOfLines={1}>
                  {place}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Chip label={`hasta ${result.flightHeightAgl} m`} color={p.accent} icon="swap-vertical" />
                <Text style={[type.caption, { color: p.textFaint, flex: 1 }]}>
                  {sheet === 'expanded' ? 'Desliza hacia abajo para volver al mapa' : 'Desliza hacia arriba para ver el detalle'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: space.sm, paddingBottom: space.sm }}>
              <Text style={[type.subtitle, { color: p.text }]}>
                {busy ? 'Consultando…' : error ? 'No se ha podido consultar' : 'Mueve la cruz'}
              </Text>
              <Text style={[type.caption, { color: p.textMuted }]}>
                {error ?? 'El resultado del punto bajo la cruz aparecerá aquí.'}
              </Text>
            </View>
          )
        }
      >
        <ScrollView
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl, gap: space.lg }}
          showsVerticalScrollIndicator={false}
        >
          {result ? (
            <ResultView
              result={result}
              place={place}
              showMap={false}
              onHeightChange={setFlightHeight}
              onRefresh={() => centerRef.current && query(centerRef.current, flightHeight)}
              refreshing={busy}
            />
          ) : (
            <SkeletonRows rows={3} />
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
