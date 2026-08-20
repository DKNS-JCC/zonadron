import { decimal, t } from '../i18n';
import type { FlightWeather, HourlySample } from '../api/weather';
import { getDroneProfile, type DroneProfileId } from './drone';

/**
 * Umbrales de viento por tipo de dron, en m/s.
 *
 * El límite es el que declara el fabricante para cada clase de aparato. Para un
 * dron de menos de 250 g suele rondar los 10,7 m/s (fuerza 5), y por encima de
 * 8 m/s ya cuesta mantenerlo estable y se dispara el consumo de batería, que es
 * lo que hace que no vuelva.
 *
 * Son orientativos: manda siempre el manual de tu dron.
 */
const WIND_LIMITS: Record<DroneProfileId, { caution: number; danger: number }> = {
  sub250: { caution: 8, danger: 10.7 },
  c1: { caution: 9, danger: 12 },
  c2: { caution: 10, danger: 12 },
  c3c4: { caution: 11, danger: 14 },
  otro: { caution: 9, danger: 12 },
};

export type WeatherLevel = 'ok' | 'caution' | 'danger';

export interface WeatherAssessment {
  level: WeatherLevel;
  headline: string;
  notes: string[];
  /** Minutos que quedan de luz; negativo si ya ha anochecido. */
  minutesToSunset: number | null;
}

function fmt(n: number) {
  return decimal(n);
}

export function assessWeather(
  weather: FlightWeather,
  drone: DroneProfileId,
  now: Date = new Date(),
): WeatherAssessment {
  const limits = WIND_LIMITS[drone] ?? WIND_LIMITS.otro;
  const notes: string[] = [];
  let level = 'ok' as WeatherLevel;
  const worsen = (l: WeatherLevel) => {
    const order: WeatherLevel[] = ['ok', 'caution', 'danger'];
    if (order.indexOf(l) > order.indexOf(level)) level = l;
  };

  const gust = weather.gustMs;
  if (gust !== null) {
    if (gust >= limits.danger) {
      worsen('danger');
      notes.push(
        t(
          'weather.note.gustDanger',
          fmt(gust),
          getDroneProfile(drone).label.toLowerCase(),
          fmt(limits.danger),
        ),
      );
    } else if (gust >= limits.caution) {
      worsen('caution');
      notes.push(t('weather.note.gustCaution', fmt(gust)));
    }
  }

  if (weather.precipitationMm !== null && weather.precipitationMm > 0) {
    worsen('danger');
    notes.push(t('weather.note.rain', fmt(weather.precipitationMm)));
  }

  if (weather.visibilityM !== null && weather.visibilityM < 5000) {
    worsen('caution');
    notes.push(t('weather.note.visibility', Math.round(weather.visibilityM / 1000)));
  }

  let minutesToSunset: number | null = null;
  if (weather.sunset) {
    const sunset = new Date(weather.sunset);
    if (!Number.isNaN(sunset.getTime())) {
      minutesToSunset = Math.round((sunset.getTime() - now.getTime()) / 60000);
      if (minutesToSunset < 0) {
        worsen('caution');
        notes.push(t('weather.note.night'));
      } else if (minutesToSunset < 45) {
        worsen('caution');
        notes.push(t('weather.note.sunsetSoon', minutesToSunset));
      }
    }
  }

  const headline =
    level === 'danger'
      ? t('weather.headline.danger')
      : level === 'caution'
        ? t('weather.headline.caution')
        : t('weather.headline.ok');

  if (notes.length === 0) notes.push(t('weather.note.allGood'));

  return { level, headline, notes, minutesToSunset };
}

/**
 * Nivel de una hora suelta de la previsión: sólo rachas y lluvia, que es lo
 * que de verdad decide si se puede salir. Sin visibilidad ni ocaso —esos
 * importan al momento de volar, no para escanear un día entero de un vistazo.
 */
export function assessHour(sample: HourlySample, drone: DroneProfileId): WeatherLevel {
  const limits = WIND_LIMITS[drone] ?? WIND_LIMITS.otro;
  if (sample.precipitationMm !== null && sample.precipitationMm > 0) return 'danger';
  if (sample.gustMs !== null) {
    if (sample.gustMs >= limits.danger) return 'danger';
    if (sample.gustMs >= limits.caution) return 'caution';
  }
  return 'ok';
}
