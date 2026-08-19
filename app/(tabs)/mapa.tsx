import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapFrame, type MapFrameHandle } from '../../src/components/MapFrame';
import { BottomSheet, type SheetState } from '../../src/components/BottomSheet';
import { ResultView } from '../../src/components/ResultView';
import { VerdictPill } from '../../src/components/VerdictCard';
import { Chip, GhostButton, IconButton, Separator, SkeletonRows } from '../../src/components/ui';
import { Collapsible, PressableScale } from '../../src/components/motion';
import { Material } from '../../src/components/Material';
import { usePalette, useScheme } from '../../src/hooks/useTheme';
import { useSettings } from '../../src/state/SettingsContext';
import { buildMapHtml } from '../../src/map/mapHtml';
import { getLayerIds } from '../../src/api/enaire';
import { checkPoint } from '../../src/logic/query';
import { describePoint } from '../../src/api/geocode';
import { layerColor, layerDescription, layerLabel } from '../../src/logic/labels';
import { computeCoverageGrid, coverageColor, COVERAGE_LEGEND } from '../../src/offline/coverage';
import { findNearestFlyable, type NearestFlyableResult } from '../../src/offline/nearest';
import { loadPack } from '../../src/offline/pack';
import { BASEMAPS } from '../../src/state/SettingsContext';
import { radius, shadow, space, tabular, type, verdictStyles, verdictTint, emphasize } from '../../src/theme';
import type { Coords, LayerKey, QueryResult } from '../../src/types';

const ALL_LAYERS: LayerKey[] = ['aero', 'urbano', 'infraestructuras'];

/** Metros hasta el kilómetro, y a partir de ahí en kilómetros con un decimal. */
function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Espera antes de consultar tras mover el mapa. Suficiente para no encadenar. */
const MOVE_DEBOUNCE_MS = 700;

export default function MapaScreen() {
  const p = usePalette();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapFrameHandle>(null);

  // Se puede llegar aquí desde un resultado: /mapa?lat=..&lon=..
  const params = useLocalSearchParams<{ lat?: string; lon?: string }>();
  const paramLat = Number(params.lat);
  const paramLon = Number(params.lon);
  const hasParams = Number.isFinite(paramLat) && Number.isFinite(paramLon);

  const { flightHeight, setFlightHeight, showCoverage, basemap, setBasemap } = useSettings();

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
  const [coverageState, setCoverageState] = useState<'off' | 'calculando' | 'on' | 'sin-paquete'>('off');
  const [photo, setPhoto] = useState<
    | { state: 'buscando' }
    | { state: 'sin-paquete' }
    | { state: 'listo'; target: Coords; result: NearestFlyableResult }
    | null
  >(null);
  const viewRef = useRef<{ lat: number; lon: number; zoom: number } | null>(null);

  // Centro inicial del mapa: se resuelve con la ubicación del usuario antes de
  // pintar nada. Madrid sólo entra como último recurso si no hay permiso o falla el GPS.
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lon: number; zoom: number } | null>(
    hasParams ? { lat: paramLat, lon: paramLon, zoom: 14 } : null,
  );

  useEffect(() => {
    if (hasParams) return;
    let alive = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (alive) setInitialCenter({ lat: 40.4168, lon: -3.7038, zoom: 11 });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (alive) setInitialCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude, zoom: 14 });
      } catch {
        if (alive) setInitialCenter({ lat: 40.4168, lon: -3.7038, zoom: 11 });
      }
    })();
    return () => {
      alive = false;
    };
    // Sólo al arrancar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      layerIds && initialCenter
        ? buildMapHtml({
            lat: initialCenter.lat,
            lon: initialCenter.lon,
            zoom: initialCenter.zoom,
            layerIds,
            visible: initialVisible.current,
            dark: scheme === 'dark',
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layerIds, initialCenter],
  );

  const send = useCallback((msg: object) => {
    mapRef.current?.post(msg);
  }, []);

  useEffect(() => {
    send({ type: 'theme', dark: scheme === 'dark' });
  }, [scheme, send]);

  useEffect(() => {
    send({ type: 'basemap', base: basemap });
  }, [basemap, send]);

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

  /**
   * Pinta la altura libre de cada celda del área visible. Se calcula con el
   * paquete descargado: sin él no hay geometría en el móvil y no se puede.
   */
  const paintCoverage = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;
    setCoverageState('calculando');
    const pack = await loadPack();
    if (!pack) {
      setCoverageState('sin-paquete');
      send({ type: 'coverageOff' });
      return;
    }
    // Área visible aproximada a partir del centro y el zoom.
    const spanLat = 360 / Math.pow(2, view.zoom) * 1.2;
    const spanLon = spanLat / Math.cos((view.lat * Math.PI) / 180);
    const area = {
      minLat: view.lat - spanLat / 2,
      maxLat: view.lat + spanLat / 2,
      minLon: view.lon - spanLon / 2,
      maxLon: view.lon + spanLon / 2,
    };
    const grid = computeCoverageGrid(pack, area, 48);
    if (grid.bbox.maxLat <= grid.bbox.minLat || grid.bbox.maxLon <= grid.bbox.minLon) {
      setCoverageState('sin-paquete');
      send({ type: 'coverageOff' });
      return;
    }
    send({
      type: 'coverage',
      bbox: grid.bbox,
      rows: grid.rows,
      cols: grid.cols,
      colors: grid.values.map(coverageColor),
    });
    setCoverageState('on');
  }, [send]);

  useEffect(() => {
    if (!showCoverage) {
      send({ type: 'coverageOff' });
      setCoverageState('off');
    }
  }, [showCoverage, send]);

  /**
   * Marca lo que quieres fotografiar y busca desde dónde puedes volar sin
   * pedir permiso. Necesita el paquete descargado: la búsqueda mira miles de
   * puntos y eso no se le puede preguntar a ENAIRE uno a uno.
   */
  const markPhotoTarget = useCallback(async () => {
    const target = centerRef.current;
    if (!target) return;
    Haptics.selectionAsync().catch(() => {});
    setPhoto({ state: 'buscando' });
    send({ type: 'target', target: { lat: target.lat, lon: target.lon }, spot: null, label: '' });

    const pack = await loadPack();
    if (!pack) {
      setPhoto({ state: 'sin-paquete' });
      return;
    }

    const result = findNearestFlyable(pack, target, heightRef.current, 6, 64);
    setPhoto({ state: 'listo', target, result });

    const spot = result.best ?? result.anyHeight;
    if (spot && !result.targetIsFlyable) {
      send({
        type: 'target',
        target: { lat: target.lat, lon: target.lon },
        spot: { lat: spot.coords.lat, lon: spot.coords.lon },
        label: formatDistance(spot.distanceM),
      });
    }
  }, [send]);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
    send({ type: 'targetOff' });
  }, [send]);

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
        viewRef.current = { lat: msg.lat, lon: msg.lon, zoom: (msg as any).zoom ?? 12 };
        setPlace(null);
        scheduleQuery(coords);
        if (showCoverage) paintCoverage();
      }
    },
    [scheduleQuery, showCoverage, paintCoverage],
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
    : p.labelSecondary;

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      {html ? (
        <MapFrame ref={mapRef} html={html} onMessage={onMessage} style={{ backgroundColor: p.background }} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
          <ActivityIndicator color={p.tint} />
          <Text style={[type.footnote, { color: p.labelSecondary }]}>
            {initialCenter ? 'Preparando el mapa oficial…' : 'Localizándote…'}
          </Text>
        </View>
      )}

      {/* Lectura en vivo de lo que hay bajo la cruz */}
      <View style={{ position: 'absolute', top: insets.top + space.sm, left: space.md, right: space.md, gap: space.sm }}>
        <Material weight="chrome" radius={radius.pill}>
          <View
            style={{
              paddingLeft: space.lg,
              paddingRight: space.sm,
              minHeight: 50,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm + 2,
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color={p.labelSecondary} />
            ) : (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint }} />
            )}
            <Text style={[emphasize(type.subheadline), { color: p.label, flex: 1 }]} numberOfLines={1}>
              {busy
                ? 'Consultando el punto de la cruz…'
                : error
                  ? 'No se ha podido consultar'
                  : result
                    ? result.verdict.headline
                    : 'Mueve el mapa para consultar un punto'}
            </Text>
            <IconButton
              icon="sunny-outline"
              label="Luz y sombras en este punto"
              onPress={() =>
                centerRef.current &&
                router.push({
                  pathname: '/luz',
                  params: { lat: String(centerRef.current.lat), lon: String(centerRef.current.lon) },
                })
              }
            />
            <IconButton
              icon={legendOpen ? 'layers' : 'layers-outline'}
              label="Capas del mapa"
              onPress={() => setLegendOpen((v) => !v)}
            />
          </View>
        </Material>

        <Collapsible open={legendOpen}>
          <Material weight="panel" radius={radius.lg}>
            <View style={{ padding: space.lg, gap: space.lg }}>
              <View style={{ gap: space.sm }}>
                <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
                  Mapa base
                </Text>
                {/* Control segmentado: una pista hundida y una pastilla que marca lo elegido. */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: p.surfaceSunken,
                    borderRadius: 10,
                    padding: 2,
                    gap: 2,
                  }}
                >
                  {BASEMAPS.map((b) => {
                    const active = basemap === b.id;
                    return (
                      <PressableScale
                        key={b.id}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setBasemap(b.id);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[
                          {
                            flex: 1,
                            alignItems: 'center',
                            gap: 3,
                            paddingVertical: space.sm,
                            borderRadius: 8,
                            backgroundColor: active ? p.surface : 'transparent',
                          },
                          active ? (shadow.chip as object) : {},
                        ]}
                      >
                        <Ionicons
                          name={b.icon as any}
                          size={17}
                          color={active ? p.tint : p.labelSecondary}
                        />
                        <Text
                          style={[
                            emphasize(type.caption2, active ? '600' : '500'),
                            { color: active ? p.label : p.labelSecondary },
                          ]}
                        >
                          {b.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
                <Text style={[type.caption, { color: p.labelTertiary }]}>
                  {BASEMAPS.find((b) => b.id === basemap)?.note}
                </Text>
              </View>

              <View style={{ gap: space.sm }}>
                <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
                  Zonas sobre el mapa
                </Text>
                <View style={{ backgroundColor: p.surfaceSunken, borderRadius: radius.md, overflow: 'hidden' }}>
                  {ALL_LAYERS.map((key, i) => (
                    <View key={key}>
                      {i > 0 ? <Separator inset={space.md + 14 + space.md} /> : null}
                      <Pressable
                        onPress={() => toggleLayer(key)}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: visible[key] }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          gap: space.md,
                          alignItems: 'center',
                          paddingHorizontal: space.md,
                          paddingVertical: space.sm + 2,
                          minHeight: 48,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <View
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            backgroundColor: visible[key] ? layerColor[key] : 'transparent',
                            borderWidth: visible[key] ? 0 : 1.5,
                            borderColor: p.labelTertiary,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[emphasize(type.subheadline), { color: p.label }]}>
                            {layerLabel[key]}
                          </Text>
                          <Text style={[type.caption, { color: p.labelSecondary }]}>
                            {layerDescription[key]}
                          </Text>
                        </View>
                        {visible[key] ? (
                          <Ionicons name="checkmark" size={19} color={p.tint} />
                        ) : null}
                      </Pressable>
                    </View>
                  ))}
                </View>
                <Text style={[type.caption, { color: p.labelTertiary }]}>
                  El dibujo de las zonas se pide directamente al servicio de ENAIRE: es el mismo que
                  verías en su visor oficial, con sus mismos colores.
                </Text>
              </View>

              {showCoverage ? (
                <View style={{ gap: space.sm }}>
                  <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
                    Altura libre {coverageState === 'calculando' ? '· calculando…' : ''}
                  </Text>
                  {coverageState === 'sin-paquete' ? (
                    <Text style={[type.caption, { color: p.labelSecondary }]}>
                      Necesitas descargar esta zona en Ajustes → Volar sin cobertura. El cálculo se hace
                      en el móvil, no se puede pedir celda a celda a ENAIRE.
                    </Text>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                        {COVERAGE_LEGEND.map((l) => (
                          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: l.color }} />
                            <Text style={[type.caption2, { color: p.labelSecondary }]}>{l.label}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={[type.caption, { color: p.labelTertiary }]}>
                        Celdas de la zona descargada, orientativas. Antes de despegar comprueba el punto
                        exacto: el borde real de una zona no cae donde acaba una celda.
                      </Text>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          </Material>
        </Collapsible>
      </View>

      {/* Resultado del objetivo fotográfico */}
      {photo ? (
        <View style={{ position: 'absolute', top: insets.top + 72, left: space.md, right: space.md }}>
          <Material weight="panel" radius={radius.lg}>
            <View style={{ padding: space.lg, gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Ionicons name="camera" size={15} color={p.labelSecondary} />
                <Text
                  style={[
                    type.sectionHeader,
                    { color: p.labelSecondary, textTransform: 'uppercase', flex: 1 },
                  ]}
                >
                  Objetivo marcado
                </Text>
                <IconButton icon="close" label="Quitar el objetivo" onPress={clearPhoto} color={p.labelTertiary} />
              </View>

              {photo.state === 'buscando' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <ActivityIndicator size="small" color={p.labelSecondary} />
                  <Text style={[type.callout, { color: p.label }]}>Buscando desde dónde puedes volar…</Text>
                </View>
              ) : photo.state === 'sin-paquete' ? (
                <Text style={[type.callout, { color: p.label }]}>
                  Para esto necesitas la zona descargada: la búsqueda mira miles de puntos y eso no se
                  le puede preguntar a ENAIRE uno a uno. Descárgala en Ajustes → Volar sin cobertura.
                </Text>
              ) : photo.result.targetIsFlyable ? (
                <>
                  <Text style={[type.title3, { color: verdictTint('LIBRE', p) }]}>
                    Puedes volar desde el propio objetivo
                  </Text>
                  <Text style={[type.footnote, { color: p.labelSecondary }]}>
                    No necesitas moverte: ahí mismo se puede despegar sin pedir autorización.
                  </Text>
                </>
              ) : photo.result.best || photo.result.anyHeight ? (
                (() => {
                  const spot = photo.result.best ?? photo.result.anyHeight!;
                  const exact = Boolean(photo.result.best);
                  return (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <Text
                          style={[
                            type.largeTitle,
                            tabular,
                            { color: p.label },
                          ]}
                        >
                          {formatDistance(spot.distanceM)}
                        </Text>
                        <Text style={[type.title3, { color: p.labelSecondary }]}>{spot.bearing}</Text>
                      </View>
                      <Text style={[type.footnote, { color: p.labelSecondary }]}>
                        Desde ahí puedes subir hasta {spot.freeHeightM} m sin autorización
                        {exact ? '.' : `, que es menos de los ${flightHeight} m que querías.`}
                        {spot.distanceM > 500
                          ? ' Ojo: queda lejos para tener el objetivo a la vista.'
                          : ''}
                      </Text>
                      <GhostButton
                        label="Consultar ese punto"
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
                  No hay ningún punto donde volar sin autorización en {photo.result.searchedKm} km a la
                  redonda, dentro de la zona que tienes descargada.
                </Text>
              )}
            </View>
          </Material>
        </View>
      ) : null}

      {/* Botones flotantes, por encima de la hoja */}
      <View
        style={{
          position: 'absolute',
          right: space.md,
          bottom: sheet === 'hidden' ? insets.bottom + 90 : 190,
          gap: space.sm,
        }}
      >
        <MapButton
          icon="camera-outline"
          label="Quiero fotografiar esto: buscar desde dónde volar"
          onPress={markPhotoTarget}
        />
        <MapButton icon="locate" label="Centrar en mi ubicación" onPress={goToMyLocation} />
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
                <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
                  {place}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Chip label={`hasta ${result.flightHeightAgl} m`} color={p.tint} icon="swap-vertical" />
                <Text style={[type.footnote, { color: p.labelTertiary, flex: 1 }]}>
                  {sheet === 'expanded' ? 'Desliza hacia abajo para volver al mapa' : 'Desliza hacia arriba para ver el detalle'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: space.sm, paddingBottom: space.sm }}>
              <Text style={[type.headline, { color: p.label }]}>
                {busy ? 'Consultando…' : error ? 'No se ha podido consultar' : 'Mueve la cruz'}
              </Text>
              <Text style={[type.footnote, { color: p.labelSecondary }]}>
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

/**
 * Botón redondo sobre el mapa. Es cristal, no un disco opaco: por debajo se
 * sigue viendo el mapa, que es lo que importa.
 */
function MapButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const p = usePalette();
  return (
    <Material weight="chrome" radius={24}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={icon} size={22} color={p.tint} />
      </PressableScale>
    </Material>
  );
}
