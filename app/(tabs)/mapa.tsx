import React, { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapFrame, type MapFrameHandle } from '../../src/components/MapFrame';
import { BottomSheet } from '../../src/components/BottomSheet';
import { ResultView } from '../../src/components/ResultView';
import { VerdictPill } from '../../src/components/VerdictCard';
import { Chip, IconButton, SkeletonRows } from '../../src/components/ui';
import { PressableScale } from '../../src/components/motion';
import { Material } from '../../src/components/Material';
import { usePalette, useScheme } from '../../src/hooks/useTheme';
import { useSettings } from '../../src/state/SettingsContext';
import { buildMapHtml } from '../../src/map/mapHtml';
import { useMapLocation } from '../../src/screens/mapa/useMapLocation';
import { useCrosshairQuery } from '../../src/screens/mapa/useCrosshairQuery';
import { useMapLayers } from '../../src/screens/mapa/useMapLayers';
import { usePhotoTarget } from '../../src/screens/mapa/usePhotoTarget';
import { LegendPanel } from '../../src/screens/mapa/LegendPanel';
import { PhotoTargetPanel } from '../../src/screens/mapa/PhotoTargetPanel';
import { radius, space, type, verdictStyles, emphasize } from '../../src/theme';

/**
 * Pantalla de mapa.
 *
 * El estado se reparte en cuatro hooks independientes (src/screens/mapa/),
 * cada uno dueño de su propia máquina de estado: dónde está centrado el mapa
 * y quién manda sobre eso (useMapLocation), qué hay bajo la cruz y su consulta
 * (useCrosshairQuery), qué capas y mapa base se pintan (useMapLayers), y el
 * objetivo fotográfico (usePhotoTarget). Este componente sólo los compone y
 * reparte los mensajes del WebView entre ellos — ver `onMessage`.
 */
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

  const { flightHeight, setFlightHeight } = useSettings();

  const send = useCallback((msg: object) => {
    mapRef.current?.post(msg);
  }, []);

  const location = useMapLocation(send, hasParams, paramLat, paramLon);
  const crosshair = useCrosshairQuery(flightHeight);
  const layers = useMapLayers(send, scheme);
  const photo = usePhotoTarget(send, crosshair.centerRef, flightHeight);

  // El HTML se construye una sola vez: el tema se cambia por mensaje.
  const html = useMemo(
    () =>
      layers.layerIds && location.initialCenter
        ? buildMapHtml({
            lat: location.initialCenter.lat,
            lon: location.initialCenter.lon,
            zoom: location.initialCenter.zoom,
            layerIds: layers.layerIds,
            visible: layers.initialVisible.current,
            dark: scheme === 'dark',
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layers.layerIds, location.initialCenter],
  );

  /** Reparte cada mensaje del mapa al hook al que le importa. */
  const onMessage = useCallback(
    (data: unknown) => {
      const msg = data as { type?: string; lat?: number; lon?: number };
      if (msg.type === 'movestart') {
        location.notifyUserMoved();
        crosshair.onMoveStart();
        return;
      }
      if ((msg.type === 'move' || msg.type === 'ready') && msg.lat != null && msg.lon != null) {
        const coords = { lat: msg.lat, lon: msg.lon };
        crosshair.onMapMoved(coords);
        layers.onViewChanged({ lat: msg.lat, lon: msg.lon, zoom: (msg as any).zoom ?? 12 });
      }
    },
    [location, crosshair, layers],
  );

  const tint = crosshair.result
    ? p.scheme === 'dark'
      ? verdictStyles[crosshair.result.verdict.level].onDark
      : verdictStyles[crosshair.result.verdict.level].onLight
    : p.labelSecondary;

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      {html ? (
        <MapFrame ref={mapRef} html={html} onMessage={onMessage} style={{ backgroundColor: p.background }} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
          <ActivityIndicator color={p.tint} />
          <Text style={[type.footnote, { color: p.labelSecondary }]}>Preparando el mapa oficial…</Text>
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
            {crosshair.busy ? (
              <ActivityIndicator size="small" color={p.labelSecondary} />
            ) : (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint }} />
            )}
            <Text style={[emphasize(type.subheadline), { color: p.label, flex: 1 }]} numberOfLines={1}>
              {crosshair.busy
                ? 'Consultando el punto de la cruz…'
                : crosshair.error
                  ? 'No se ha podido consultar'
                  : crosshair.result
                    ? crosshair.result.verdict.headline
                    : 'Mueve el mapa para consultar un punto'}
            </Text>
            <IconButton
              icon="sunny-outline"
              label="Luz y sombras en este punto"
              onPress={() =>
                crosshair.centerRef.current &&
                router.push({
                  pathname: '/luz',
                  params: { lat: String(crosshair.centerRef.current.lat), lon: String(crosshair.centerRef.current.lon) },
                })
              }
            />
            <IconButton
              icon={layers.legendOpen ? 'layers' : 'layers-outline'}
              label="Capas del mapa"
              onPress={() => layers.setLegendOpen((v) => !v)}
            />
          </View>
        </Material>

        <LegendPanel
          open={layers.legendOpen}
          basemap={layers.basemap}
          setBasemap={layers.setBasemap}
          visible={layers.visible}
          toggleLayer={layers.toggleLayer}
          showCoverage={layers.showCoverage}
          coverageState={layers.coverageState}
        />
      </View>

      {/* Resultado del objetivo fotográfico */}
      {photo.photo ? (
        <View style={{ position: 'absolute', top: insets.top + 72, left: space.md, right: space.md }}>
          <PhotoTargetPanel photo={photo.photo} flightHeight={flightHeight} onClear={photo.clearPhoto} />
        </View>
      ) : null}

      {/* Botones flotantes, por encima de la hoja */}
      <View
        style={{
          position: 'absolute',
          right: space.md,
          bottom: crosshair.sheet === 'hidden' ? insets.bottom + 90 : 190,
          gap: space.sm,
        }}
      >
        <MapButton
          icon="camera-outline"
          label="Quiero fotografiar esto: buscar desde dónde volar"
          onPress={photo.markPhotoTarget}
        />
        <MapButton icon="locate" label="Centrar en mi ubicación" onPress={location.goToMyLocation} />
      </View>

      <BottomSheet
        state={crosshair.sheet}
        onStateChange={crosshair.setSheet}
        minPeekHeight={140}
        header={
          crosshair.result ? (
            <View style={{ gap: space.sm }}>
              <VerdictPill result={crosshair.result} />
              {crosshair.place ? (
                <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
                  {crosshair.place}
                </Text>
              ) : null}
              <Chip label={`hasta ${crosshair.result.flightHeightAgl} m`} color={p.tint} icon="swap-vertical" />
            </View>
          ) : (
            // La píldora de arriba ya dice en vivo si está consultando, si ha
            // fallado o si hay que mover la cruz. Aquí sólo se añade lo que allí
            // no cabe: el porqué del error.
            <View style={{ paddingBottom: space.sm }}>
              <Text style={[type.footnote, { color: p.labelSecondary }]}>
                {crosshair.error ?? 'El resultado aparecerá aquí.'}
              </Text>
            </View>
          )
        }
      >
        <ScrollView
          contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl, gap: space.lg }}
          showsVerticalScrollIndicator={false}
        >
          {crosshair.result ? (
            <ResultView
              result={crosshair.result}
              place={crosshair.place}
              showMap={false}
              onHeightChange={setFlightHeight}
              onRefresh={() =>
                crosshair.centerRef.current && crosshair.query(crosshair.centerRef.current, flightHeight)
              }
              refreshing={crosshair.busy}
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
