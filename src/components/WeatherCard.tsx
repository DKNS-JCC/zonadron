import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, type } from '../theme';
import { getFlightWeather, WEATHER_SOURCE, type FlightWeather } from '../api/weather';
import { assessWeather, type WeatherLevel } from '../logic/weather';
import { useSettings } from '../state/SettingsContext';
import { Card, SectionTitle, SkeletonRows } from './ui';
import type { Coords } from '../types';

const TONE: Record<WeatherLevel, { color: string; darkColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ok: { color: '#07835A', darkColor: '#3FBE8F', icon: 'sunny-outline' },
  caution: { color: '#8F5300', darkColor: '#E8A33D', icon: 'alert-circle-outline' },
  danger: { color: '#B01F15', darkColor: '#FF6B5E', icon: 'thunderstorm-outline' },
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
  const color = p.scheme === 'dark' ? tone.darkColor : tone.color;

  const sunsetTime = weather.sunset
    ? new Date(weather.sunset).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Card>
      <SectionTitle>Condiciones de vuelo</SectionTitle>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: color + (p.scheme === 'dark' ? '2E' : '1C'),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={tone.icon} size={22} color={color} />
        </View>
        <Text style={[type.subtitle, { color, flex: 1 }]}>{assessment.headline}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg, flexWrap: 'wrap' }}>
        <Metric
          icon="speedometer-outline"
          value={weather.gustMs !== null ? `${weather.gustMs.toFixed(1).replace('.', ',')}` : '—'}
          unit="m/s"
          label="rachas"
          highlight={color}
        />
        <Metric
          icon="navigate-outline"
          value={weather.windMs !== null ? `${weather.windMs.toFixed(1).replace('.', ',')}` : '—'}
          unit="m/s"
          label="viento"
        />
        <Metric
          icon="thermometer-outline"
          value={weather.temperatureC !== null ? `${Math.round(weather.temperatureC)}` : '—'}
          unit="°C"
          label="temp."
        />
        <Metric
          icon="moon-outline"
          value={sunsetTime ?? '—'}
          unit=""
          label="ocaso"
        />
      </View>

      <View style={{ gap: 6, marginTop: space.lg }}>
        {assessment.notes.map((n, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
            <Text style={[type.caption, { color }]}>•</Text>
            <Text style={[type.caption, { color: p.text, flex: 1 }]}>{n}</Text>
          </View>
        ))}
      </View>

      <Text style={[type.caption, { color: p.textFaint, fontSize: 12, marginTop: space.md }]}>
        Datos de {WEATHER_SOURCE} en superficie. A la altura a la que vuelas sopla más. Los umbrales
        son orientativos: manda el manual de tu dron.
      </Text>
    </Card>
  );
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
        minWidth: 72,
        backgroundColor: p.bg,
        borderRadius: radius.md,
        paddingVertical: space.md,
        paddingHorizontal: space.sm,
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Ionicons name={icon} size={15} color={highlight ?? p.textFaint} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={[type.bodyStrong, { color: highlight ?? p.text, fontSize: 16 }]}>{value}</Text>
        {unit ? <Text style={[type.caption, { color: p.textMuted, fontSize: 11 }]}>{unit}</Text> : null}
      </View>
      <Text style={[type.caption, { color: p.textFaint, fontSize: 11 }]}>{label}</Text>
    </View>
  );
}
