import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, systemColor, tabular, type, emphasize } from '../theme';
import { getFlightWeather, WEATHER_SOURCE, type FlightWeather } from '../api/weather';
import { assessHour, assessWeather, type WeatherLevel } from '../logic/weather';
import { useSettings } from '../state/SettingsContext';
import { Card, SectionTitle, SkeletonRows } from './ui';
import type { Coords } from '../types';

const TONE: Record<
  WeatherLevel,
  { color: 'green' | 'orange' | 'red'; icon: keyof typeof Ionicons.glyphMap }
> = {
  ok: { color: 'green', icon: 'sunny' },
  caution: { color: 'orange', icon: 'alert-circle' },
  danger: { color: 'red', icon: 'thunderstorm' },
};

/**
 * Lo otro que tumba un vuelo. Las zonas dicen si puedes volar legalmente; esto
 * dice si además es sensato.
 */
export function WeatherCard({ coords }: { coords: Coords }) {
  const p = usePalette();
  const { drone } = useSettings();
  const [weather, setWeather] = useState<FlightWeather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getFlightWeather(coords.lat, coords.lon, controller.signal)
      .then((w) => {
        if (controller.signal.aborted) return;
        setWeather(w);
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [coords.lat, coords.lon]);

  if (loading) {
    return (
      <Card>
        <SectionTitle>Condiciones de vuelo</SectionTitle>
        <SkeletonRows rows={1} />
      </Card>
    );
  }

  if (!weather) return null;

  const assessment = assessWeather(weather, drone);
  const tone = TONE[assessment.level];
  const color = systemColor(tone.color, p);

  const sunsetTime = weather.sunset
    ? new Date(weather.sunset).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null;

  // Sólo lo que queda por delante: el servicio da la previsión desde el
  // principio de la hora actual, y una hora ya pasada no sirve para elegir
  // cuándo salir.
  const now = Date.now();
  const upcoming = weather.hourly.filter((h) => new Date(h.time).getTime() >= now - 30 * 60000);

  return (
    <Card>
      <SectionTitle>Condiciones de vuelo</SectionTitle>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Ionicons name={tone.icon} size={26} color={color} />
        <Text style={[type.title3, { color, flex: 1 }]}>{assessment.headline}</Text>
      </View>

      {/* Las cuatro lecturas, en una fila hundida con líneas finísimas entre ellas. */}
      <View
        style={{
          flexDirection: 'row',
          marginTop: space.lg,
          backgroundColor: p.surfaceSunken,
          borderRadius: radius.md,
          overflow: 'hidden',
        }}
      >
        <Metric
          icon="speedometer-outline"
          value={weather.gustMs !== null ? `${weather.gustMs.toFixed(1).replace('.', ',')}` : '—'}
          unit="m/s"
          label="rachas"
          highlight={color}
        />
        <Rule />
        <Metric
          icon="navigate-outline"
          value={weather.windMs !== null ? `${weather.windMs.toFixed(1).replace('.', ',')}` : '—'}
          unit="m/s"
          label="viento"
        />
        <Rule />
        <Metric
          icon="thermometer-outline"
          value={weather.temperatureC !== null ? `${Math.round(weather.temperatureC)}` : '—'}
          unit="°C"
          label="temp."
        />
        <Rule />
        <Metric icon="moon-outline" value={sunsetTime ?? '—'} unit="" label="ocaso" />
      </View>

      {upcoming.length > 0 ? (
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
            Próximas horas
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {upcoming.map((h, i) => {
                const level = assessHour(h, drone);
                const hourColor = systemColor(TONE[level].color, p);
                const label =
                  i === 0
                    ? 'Ahora'
                    : new Date(h.time).toLocaleTimeString('es-ES', { hour: '2-digit' }).replace(':00', '') + 'h';
                return (
                  <View
                    key={h.time}
                    style={{
                      alignItems: 'center',
                      gap: 4,
                      paddingVertical: space.sm,
                      paddingHorizontal: space.sm,
                      minWidth: 46,
                      backgroundColor: p.surfaceSunken,
                      borderRadius: radius.sm,
                    }}
                  >
                    <Text style={[type.caption2, { color: p.labelSecondary }]}>{label}</Text>
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: hourColor }} />
                    <Text style={[emphasize(type.caption2), tabular, { color: p.label }]}>
                      {h.gustMs !== null ? Math.round(h.gustMs) : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <Text style={[type.caption2, { color: p.labelTertiary }]}>Rachas en m/s, por hora.</Text>
        </View>
      ) : null}

      <View style={{ gap: 6, marginTop: space.lg }}>
        {assessment.notes.map((n, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
            <Text style={[type.footnote, { color: p.labelTertiary }]}>•</Text>
            <Text style={[type.footnote, { color: p.label, flex: 1 }]}>{n}</Text>
          </View>
        ))}
      </View>

      <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.md }]}>
        Datos de {WEATHER_SOURCE} en superficie. A la altura a la que vuelas sopla más. Los umbrales
        son orientativos: manda el manual de tu dron.
      </Text>
    </Card>
  );
}

/** Línea vertical finísima entre lecturas. */
function Rule() {
  const p = usePalette();
  return <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: p.separator }} />;
}

function Metric({
  icon,
  value,
  unit,
  label,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  unit: string;
  label: string;
  highlight?: string;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: space.md,
        paddingHorizontal: space.xs,
        alignItems: 'center',
        gap: 3,
      }}
    >
      <Ionicons name={icon} size={14} color={highlight ?? p.labelTertiary} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={[emphasize(type.callout), tabular, { color: highlight ?? p.label }]}>{value}</Text>
        {unit ? <Text style={[type.caption2, { color: p.labelSecondary }]}>{unit}</Text> : null}
      </View>
      <Text style={[type.caption2, { color: p.labelTertiary }]}>{label}</Text>
    </View>
  );
}
