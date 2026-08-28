import React, { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, ScrollView, Text, useWindowDimensions, View } from 'react-native';
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
import { LiquidGlass } from '../../src/components/LiquidGlass';
import { usePalette, useScheme } from '../../src/hooks/useTheme';
import { useSettings } from '../../src/state/SettingsContext';
import { buildMapHtml } from '../../src/map/mapHtml';
import { useMapLocation } from '../../src/screens/mapa/useMapLocation';
import { useCrosshairQuery } from '../../src/screens/mapa/useCrosshairQuery';
import { useMapLayers } from '../../src/screens/mapa/useMapLayers';
import { useNotamAreas } from '../../src/screens/mapa/useNotamAreas';
import { usePhotoTarget } from '../../src/screens/mapa/usePhotoTarget';
import { LegendPanel } from '../../src/screens/mapa/LegendPanel';
import { PhotoTargetPanel } from '../../src/screens/mapa/PhotoTargetPanel';
import { radius, space, type, verdictStyles, emphasize } from '../../src/theme';
import { t } from '../../src/i18n';

/**
 * Pantalla de mapa.
 *
 * El estado se reparte en cinco hooks independientes (src/screens/mapa/),
 * cada uno dueño de su propia máquina de estado: dónde está centrado el mapa
 * y quién manda sobre eso (useMapLocation), qué hay bajo la cruz y su consulta
 * (useCrosshairQuery), qué capas y mapa base se pintan (useMapLayers), las
 * áreas de los NOTAM a la vista (useNotamAreas), y el objetivo fotográfico
 * (usePhotoTarget). Este componente sólo los compone y reparte los mensajes
 * del WebView entre ellos — ver `onMessage`.
 */
/** Alto de la píldora de lectura en vivo, que es lo que tapa por arriba. */
const PILL_HEIGHT = 50;

export default function MapaScreen() {
  const p = usePalette();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const mapRef = useRef<MapFrameHandle>(null);

  // Se puede llegar aquí desde un resultado: /mapa?lat=..&lon=..
  const params = useLocalSearchParams<{ lat?: string; lon?: string }>();
  const paramLat = Number(params.lat);
  const paramLon = Number(params.lon);
  const hasParams = Number.isFinite(paramLat) && Number.isFinite(paramLon);

  const {
    flightHeight,
    setFlightHeight,
    ready: settingsReady,
    showNotams,
    setShowNotams,
  } = useSettings();

  const send = useCallback((msg: object) => {
    mapRef.current?.post(msg);
  }, []);

  const location = useMapLocation(send, hasParams, paramLat, paramLon);
  const crosshair = useCrosshairQuery(flightHeight);
  const layers = useMapLayers(send, scheme);
  const photo = usePhotoTarget(send, crosshair.centerRef, flightHeight);
  // La elevación del terreno sale de la consulta de la cruz, que ya la pide:
  // es la referencia con la que se decide si un NOTAM en AMSL te alcanza.
  const notams = useNotamAreas(
    send,
    showNotams,
    flightHeight,
    crosshair.result?.terrainElevation ?? null,
  );

  // El HTML se construye una sola vez: el tema se cambia por mensaje.
  //
  // Se espera a que los ajustes estén leídos para nacer ya con el mapa base
  // guardado. Construirlo antes obligaría a cambiarlo por mensaje justo
  // después, y se vería un parpadeo de callejero antes del satélite.
  const html = useMemo(
    () =>
      settingsReady && layers.layerIds && location.initialCenter
        ? buildMapHtml({
            lat: location.initialCenter.lat,
            lon: location.initialCenter.lon,
            zoom: location.initialCenter.zoom,
            layerIds: layers.layerIds,
            visible: layers.initialVisible.current,
            dark: scheme === 'dark',
            basemap: layers.basemap,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settingsReady, layers.layerIds, location.initialCenter],
  );

  /** Reparte cada mensaje del mapa al hook al que le importa. */
  const onMessage = useCallback(
    (data: unknown) => {
      const msg = data as { type?: string; lat?: number; lon?: number };
      if (msg.type === 'ready') {
        // El mapa acaba de nacer: se le repite todo lo que se le pudo haber
        // dicho mientras no existía.
        layers.resync();
        location.resyncMe();
      }
      if (msg.type === 'movestart') {
        location.notifyUserMoved();
        crosshair.onMoveStart();
        return;
      }
      if ((msg.type === 'move' || msg.type === 'ready') && msg.lat != null && msg.lon != null) {
        const coords = { lat: msg.lat, lon: msg.lon };
        crosshair.onMapMoved(coords);
        const view = { lat: msg.lat, lon: msg.lon, zoom: (msg as any).zoom ?? 12 };
        layers.onViewChanged(view);
        notams.onViewChanged(view);
      }
    },
    [location, crosshair, layers, notams],
  );

  // Lo que le queda al panel de capas: de debajo de la píldora de arriba
  // hasta donde empieza la hoja del resultado, que sube y baja con ella.
  const sheetTop = crosshair.sheet === 'hidden' ? insets.bottom + 90 : 190;
  const legendMaxHeight = Math.max(
    220,
    windowHeight - (insets.top + space.sm + PILL_HEIGHT + space.sm) - sheetTop - space.md,
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
          <Text style={[type.footnote, { color: p.labelSecondary }]}>{t('map.preparing')}</Text>
        </View>
      )}

      {/* Lectura en vivo de lo que hay bajo la cruz */}
      <View style={{ position: 'absolute', top: insets.top + space.sm, left: space.md, right: space.md, gap: space.sm }}>
        <Material weight="chrome" radius={radius.pill}>
          <View
            style={{
              paddingLeft: space.lg,
              paddingRight: space.sm,
              minHeight: PILL_HEIGHT,
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
                ? t('map.querying')
                : crosshair.error
                  ? t('map.queryFailed')
                  : crosshair.result
                    ? crosshair.result.verdict.headline
                    : t('map.moveToQuery')}
            </Text>
            <IconButton
              icon="sunny-outline"
              label={t('map.lightHere')}
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
              label={t('map.layers')}
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
          cellMetres={layers.cellMetres}
          showNotams={showNotams}
          setShowNotams={setShowNotams}
          notamState={notams.state}
          notamsShown={notams.shown}
          notamsHidden={notams.hidden}
          flightHeight={flightHeight}
          maxHeight={legendMaxHeight}
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
          bottom: sheetTop,
          gap: space.sm,
        }}
      >
        <MapButton
          icon="camera-outline"
          label={t('map.photoTarget')}
          onPress={photo.markPhotoTarget}
        />
        <MapButton icon="locate" label={t('map.centerOnMe')} onPress={location.goToMyLocation} />
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
              <Chip
                label={t('map.heightChip', crosshair.result.flightHeightAgl)}
                color={p.tint}
                icon="swap-vertical"
              />
            </View>
          ) : (
            // La píldora de arriba ya dice en vivo si está consultando, si ha
            // fallado o si hay que mover la cruz. Aquí sólo se añade lo que allí
            // no cabe: el porqué del error.
            <View style={{ paddingBottom: space.sm }}>
              <Text style={[type.footnote, { color: p.labelSecondary }]}>
                {crosshair.error ?? t('map.resultHere')}
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
 *
 * De todas las superficies flotantes, ésta es la que puede estrenar el cristal
 * nativo de Android: su contenido es un icono con el color ya calculado, y no
 * lee nada del contexto por dentro — que es la condición que impone la
 * librería. Ver src/components/LiquidGlass.android.tsx.
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
    <LiquidGlass radius={24}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={icon} size={22} color={p.tint} />
      </PressableScale>
    </LiquidGlass>
  );
}
