/**
 * Condiciones de vuelo.
 *
 * Fuente: Open-Meteo (la misma que ya usamos para la elevación del terreno).
 * Gratuita, sin clave y sin registro. https://open-meteo.com/
 *
 * Esto NO decide si puedes volar legalmente: eso lo dicen las zonas de ENAIRE.
 * Sirve para lo otro que tumba un vuelo, que es el viento.
 */

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export const WEATHER_SOURCE = 'Open-Meteo';

export interface FlightWeather {
  temperatureC: number | null;
  /** Viento medio a 10 m, en m/s. */
  windMs: number | null;
  /** Rachas a 10 m, en m/s. Es el dato que de verdad tumba un dron pequeño. */
  gustMs: number | null;
  precipitationMm: number | null;
  /** Visibilidad en metros (importa porque el vuelo es en alcance visual). */
  visibilityM: number | null;
  cloudCoverPct: number | null;
  /** ISO local. */
  sunrise: string | null;
  sunset: string | null;
  fetchedAt: string;
  /** Próximas horas, para elegir cuándo salir en vez de sólo si ahora mismo. */
  hourly: HourlySample[];
}

export interface HourlySample {
  /** ISO local. */
  time: string;
  temperatureC: number | null;
  windMs: number | null;
  gustMs: number | null;
  precipitationMm: number | null;
}

export async function getFlightWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<FlightWeather | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,visibility,cloud_cover',
    hourly: 'temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation',
    daily: 'sunrise,sunset',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: '1',
    forecast_hours: '18',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(`${ENDPOINT}?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const c = json?.current ?? {};
    const d = json?.daily ?? {};
    const h = json?.hourly ?? {};
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null);

    const times: unknown[] = Array.isArray(h.time) ? h.time : [];
    const hourly: HourlySample[] = times.map((t, i) => ({
      time: String(t),
      temperatureC: num(h.temperature_2m?.[i]),
      windMs: num(h.wind_speed_10m?.[i]),
      gustMs: num(h.wind_gusts_10m?.[i]),
      precipitationMm: num(h.precipitation?.[i]),
    }));

    return {
      temperatureC: num(c.temperature_2m),
      windMs: num(c.wind_speed_10m),
      gustMs: num(c.wind_gusts_10m),
      precipitationMm: num(c.precipitation),
      visibilityM: num(c.visibility),
      cloudCoverPct: num(c.cloud_cover),
      sunrise: Array.isArray(d.sunrise) ? String(d.sunrise[0]) : null,
      sunset: Array.isArray(d.sunset) ? String(d.sunset[0]) : null,
      fetchedAt: new Date().toISOString(),
      hourly,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
