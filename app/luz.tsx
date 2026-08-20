import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapFrame, type MapFrameHandle } from '../src/components/MapFrame';
import { Banner, Card, GhostButton, SectionTitle } from '../src/components/ui';
import { usePalette, useScheme } from '../src/hooks/useTheme';
import { buildMapHtml } from '../src/map/mapHtml';
import { getLayerIds } from '../src/api/enaire';
import {
  horizonProfile,
  relevantAzimuths,
  terrainSunTimes,
  type TerrainSunTimes,
} from '../src/api/horizon';
import {
  compass,
  formatTime,
  LIGHT_COLOR,
  lightLabel,
  lightKind,
  shadowAzimuth,
  shadowRatio,
  sunDay,
  sunPath,
  sunPosition,
  type SunDay,
} from '../src/logic/sun';
import { radius as r, shadow, space, tabular, type, emphasize } from '../src/theme';
import { Separator } from '../src/components/ui';
import { dateLocale, t } from '../src/i18n';

const FALLBACK_IDS = { aero: 2, urbano: 3, infraestructuras: 0 };
const MADRID = { lat: 40.4168, lon: -3.7038 };

export default function LuzScreen() {
  const p = usePalette();
  const scheme = useScheme();
  const params = useLocalSearchParams<{ lat?: string; lon?: string; label?: string }>();

  const paramLat = Number(params.lat);
  const paramLon = Number(params.lon);
  const hasParams = Number.isFinite(paramLat) && Number.isFinite(paramLon);

  const [point, setPoint] = useState(hasParams ? { lat: paramLat, lon: paramLon } : null);
  const [dayOffset, setDayOffset] = useState(0);
  const [minutes, setMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const [layerIds, setLayerIds] = useState<typeof FALLBACK_IDS | null>(null);
  const [terrain, setTerrain] = useState<TerrainSunTimes | null>(null);
  const [terrainLoading, setTerrainLoading] = useState(false);

  const mapRef = useRef<MapFrameHandle>(null);

  // Punto de partida si no llega por parámetros.
  useEffect(() => {
    if (point) return;
    let alive = true;
    Location.getForegroundPermissionsAsync()
      .then(async ({ status }) => {
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          if (alive) setPoint({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          return;
        }
        if (alive) setPoint(MADRID);
      })
      .catch(() => alive && setPoint(MADRID));
    return () => {
      alive = false;
    };
  }, [point]);

  useEffect(() => {
    let alive = true;
    getLayerIds()
      .then((ids) => alive && setLayerIds(ids))
      .catch(() => alive && setLayerIds(FALLBACK_IDS));
    return () => {
      alive = false;
    };
  }, []);

  const date = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(12, 0, 0, 0);
    return d;
  }, [dayOffset]);

  const selected = useMemo(() => {
    const d = new Date(date);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return d;
  }, [date, minutes]);

  const day: SunDay | null = useMemo(
    () => (point ? sunDay(date, point.lat, point.lon) : null),
    [date, point],
  );
  const position = useMemo(
    () => (point ? sunPosition(selected, point.lat, point.lon) : null),
    [selected, point],
  );
  const kind = position ? lightKind(position.altitude) : 'noche';

  /* ------------------------------------------------------------------ */
  /* Mapa 2D: rayos del sol                                              */
  /* ------------------------------------------------------------------ */
  const paintSunPath = useCallback(() => {
    if (!point || !day || !position) return;
    const hourly = sunPath(date, point.lat, point.lon, 60)
      .filter((h) => h.altitude > -6)
      .map((h) => ({
        azimuth: h.azimuth,
        color: LIGHT_COLOR[lightKind(h.altitude)],
        main: false,
        label: h.time.getMinutes() === 0 && h.time.getHours() % 3 === 0
          ? formatTime(h.time)
          : null,
      }));

    const rays = [...hourly];
    if (day.sunriseAzimuth !== null) {
      rays.push({ azimuth: day.sunriseAzimuth, color: '#E8A33D', main: true, label: `↑ ${formatTime(day.sunrise)}` });
    }
    if (day.sunsetAzimuth !== null) {
      rays.push({ azimuth: day.sunsetAzimuth, color: '#E05A00', main: true, label: `↓ ${formatTime(day.sunset)}` });
    }

    const ratio = shadowRatio(position.altitude);
    mapRef.current?.post({
      type: 'sunpath',
      origin: { lat: point.lat, lon: point.lon },
      rays,
      // De noche cerrada el rayo "actual" sólo despista: el sol está muy por
      // debajo del horizonte y no ilumina nada.
      current: position.altitude > -6 ? { azimuth: position.azimuth, color: LIGHT_COLOR[kind] } : null,
      shadow: ratio ? { azimuth: shadowAzimuth(position.azimuth), scale: Math.min(1.4, ratio / 10 + 0.3) } : null,
    });
  }, [point, day, position, date, kind]);

  useEffect(() => {
    paintSunPath();
  }, [paintSunPath]);

  // El HTML se construye una vez, así que el cambio de aspecto va por mensaje.
  useEffect(() => {
    mapRef.current?.post({ type: 'theme', dark: scheme === 'dark' });
  }, [scheme]);

  const mapHtml = useMemo(
    () =>
      layerIds && point
        ? buildMapHtml({
            lat: point.lat,
            lon: point.lon,
            zoom: 14,
            layerIds,
            visible: { aero: false, urbano: false, infraestructuras: false },
            dark: scheme === 'dark',
          })
        : null,
    // Se construye una vez: el resto va por mensajes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layerIds, point !== null],
  );

  /* ------------------------------------------------------------------ */
  /* Horizonte real                                                      */
  /* ------------------------------------------------------------------ */
  const loadTerrain = useCallback(async () => {
    if (!point) return;
    setTerrainLoading(true);
    try {
      const [pOcaso, pAmanecer] = await Promise.all([
        horizonProfile(point.lat, point.lon, relevantAzimuths(date, point.lat, point.lon, 'ocaso'), 20, 14),
        horizonProfile(point.lat, point.lon, relevantAzimuths(date, point.lat, point.lon, 'amanecer'), 20, 14),
      ]);
      setTerrain(terrainSunTimes(date, point.lat, point.lon, pOcaso, pAmanecer));
      Haptics.selectionAsync().catch(() => {});
    } catch {
      setTerrain(null);
    } finally {
      setTerrainLoading(false);
    }
  }, [point, date]);

  // Al cambiar de día, el horizonte calculado deja de valer.
  useEffect(() => setTerrain(null), [date, point]);

  const ratio = position ? shadowRatio(position.altitude) : null;

  return (
    <>
      <Stack.Screen options={{ title: params.label ?? t('light.title') }} />
      <View style={{ flex: 1, backgroundColor: p.background }}>
        {/* Vista */}
        <View style={{ height: '46%' }}>
          {mapHtml ? (
            <MapFrame ref={mapRef} html={mapHtml} onMessage={() => paintSunPath()} />
          ) : (
            <Centered text={t('light.preparingMap')} />
          )}
        </View>

        {/* Controles y datos */}
        <ScrollView
          contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hora */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Ionicons
                name={kind === 'noche' ? 'moon' : kind === 'dorada' ? 'partly-sunny' : 'sunny'}
                size={28}
                color={LIGHT_COLOR[kind]}
              />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[type.title1, tabular, { color: p.label }]}>
                  {String(Math.floor(minutes / 60)).padStart(2, '0')}:
                  {String(minutes % 60).padStart(2, '0')}
                </Text>
                <Text style={[emphasize(type.footnote), { color: LIGHT_COLOR[kind] }]}>
                  {lightLabel(kind)}
                </Text>
              </View>
              {position ? (
                <View style={{ alignItems: 'flex-end', gap: 1 }}>
                  <Text style={[emphasize(type.subheadline), tabular, { color: p.label }]}>
                    {t('light.altitude', position.altitude.toFixed(0))}
                  </Text>
                  <Text style={[type.footnote, tabular, { color: p.labelSecondary }]}>
                    {t('light.bearing', compass(position.azimuth), position.azimuth.toFixed(0))}
                  </Text>
                </View>
              ) : null}
            </View>

            <Slider
              value={minutes}
              onValueChange={(v) => setMinutes(Math.round(v))}
              minimumValue={0}
              maximumValue={1439}
              step={1}
              minimumTrackTintColor={LIGHT_COLOR[kind]}
              maximumTrackTintColor={p.skeleton}
              thumbTintColor={LIGHT_COLOR[kind]}
              accessibilityLabel={t('light.timeOfDay')}
              style={{ height: 40, marginTop: space.sm }}
            />

            <View
              style={{
                flexDirection: 'row',
                gap: 2,
                backgroundColor: p.surfaceSunken,
                borderRadius: 10,
                padding: 2,
              }}
            >
              {[
                { label: t('light.jump.sunrise'), time: day?.sunrise },
                { label: t('light.jump.golden'), time: day?.goldenEveningStart },
                { label: t('light.jump.sunset'), time: day?.sunset },
                { label: t('light.jump.now'), time: new Date() },
              ].map((q) => (
                <Pressable
                  key={q.label}
                  onPress={() => {
                    if (!q.time) return;
                    Haptics.selectionAsync().catch(() => {});
                    setMinutes(q.time.getHours() * 60 + q.time.getMinutes());
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 34,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <Text style={[emphasize(type.footnote), { color: p.tint }]}>{q.label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* Día */}
          <Card>
            <SectionTitle>{t('light.day')}</SectionTitle>
            <View
              style={{
                flexDirection: 'row',
                gap: 2,
                backgroundColor: p.surfaceSunken,
                borderRadius: 10,
                padding: 2,
              }}
            >
              {[0, 1, 2, 3, 7].map((offset) => {
                const d = new Date();
                d.setDate(d.getDate() + offset);
                const active = dayOffset === offset;
                return (
                  <Pressable
                    key={offset}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setDayOffset(offset);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      {
                        flex: 1,
                        minHeight: 36,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? p.surface : 'transparent',
                      },
                      active ? (shadow.chip as object) : {},
                    ]}
                  >
                    <Text
                      style={[
                        emphasize(type.footnote, active ? '600' : '500'),
                        { color: active ? p.label : p.labelSecondary },
                      ]}
                    >
                      {offset === 0
                        ? t('light.today')
                        : d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Horas de luz */}
          {day ? (
            <Card>
              <SectionTitle>{t('light.hours')}</SectionTitle>
              <Moment
                label={t('light.blueMorning')}
                value={`${formatTime(day.blueMorning[0])} – ${formatTime(day.blueMorning[1])}`}
                color="#3D6BC4"
                first
              />
              <Moment label={t('light.sunrise')} value={formatTime(day.sunrise)} color="#E8A33D" />
              <Moment
                label={t('light.goldenMorning')}
                value={`${formatTime(day.sunrise)} – ${formatTime(day.goldenMorningEnd)}`}
                color="#D98A1F"
              />
              <Moment
                label={t('light.solarNoon')}
                value={`${formatTime(day.solarNoon)} · ${day.maxAltitude.toFixed(0)}°`}
                color={p.labelSecondary}
              />
              <Moment
                label={t('light.goldenEvening')}
                value={`${formatTime(day.goldenEveningStart)} – ${formatTime(day.sunset)}`}
                color="#D98A1F"
              />
              <Moment label={t('light.sunset')} value={formatTime(day.sunset)} color="#E05A00" />
              <Moment
                label={t('light.blueEvening')}
                value={`${formatTime(day.blueEvening[0])} – ${formatTime(day.blueEvening[1])}`}
                color="#3D6BC4"
              />
            </Card>
          ) : null}

          {/* Horizonte real */}
          <Card>
            <SectionTitle>{t('light.terrainTitle')}</SectionTitle>
            {terrain ? (
              <View style={{ gap: space.sm }}>
                <Moment
                  label={t('light.overTheHill')}
                  value={`${formatTime(terrain.sunriseOverTerrain)}${
                    terrain.sunriseHorizonAngle
                      ? t('light.blockedBy', terrain.sunriseHorizonAngle.toFixed(1))
                      : ''
                  }`}
                  color="#E8A33D"
                  first
                />
                <Moment
                  label={t('light.behindTheHill')}
                  value={`${formatTime(terrain.sunsetBehindTerrain)}${
                    terrain.sunsetHorizonAngle
                      ? t('light.blockedBy', terrain.sunsetHorizonAngle.toFixed(1))
                      : ''
                  }`}
                  color="#E05A00"
                />
                <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.sm }]}>
                  {t('light.terrainNote')}
                </Text>
              </View>
            ) : (
              <View style={{ gap: space.md }}>
                <Text style={[type.callout, { color: p.label }]}>{t('light.terrainPitch')}</Text>
                <GhostButton
                  label={terrainLoading ? t('light.measuring') : t('light.calculate')}
                  icon="triangle-outline"
                  onPress={loadTerrain}
                />
              </View>
            )}
          </Card>

          {/* Sombras */}
          <Card>
            <SectionTitle>{t('light.shadows')}</SectionTitle>
            {ratio && position ? (
              <View style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={[type.title1, tabular, { color: p.label }]}>×{ratio.toFixed(1)}</Text>
                  <Text style={[type.callout, { color: p.labelSecondary, flex: 1 }]}>
                    {t('light.objectHeight')}
                  </Text>
                </View>
                <Text style={[type.callout, { color: p.label }]}>
                  {t(
                    'light.shadowExample',
                    (ratio * 8).toFixed(0),
                    compass(shadowAzimuth(position.azimuth)),
                  )}
                </Text>
              </View>
            ) : (
              <Text style={[type.callout, { color: p.labelSecondary }]}>
                {t('light.noShadows')}
              </Text>
            )}
          </Card>

        </ScrollView>
      </View>
    </>
  );
}

function Moment({
  label,
  value,
  color,
  first,
}: {
  label: string;
  value: string;
  color: string;
  first?: boolean;
}) {
  const p = usePalette();
  return (
    <View>
      {first ? null : <Separator inset={8 + space.md} />}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          minHeight: 38,
          paddingVertical: 4,
        }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={[type.subheadline, { color: p.labelSecondary, flex: 1 }]}>{label}</Text>
        <Text style={[emphasize(type.subheadline), tabular, { color: p.label }]}>{value}</Text>
      </View>
    </View>
  );
}

function Centered({ text }: { text: string }) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface }}>
      <Text style={[type.footnote, { color: p.labelSecondary }]}>{text}</Text>
    </View>
  );
}
