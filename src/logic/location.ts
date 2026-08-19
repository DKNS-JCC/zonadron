import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type { Coords } from '../types';

const KEY = 'zonadron.ultima-ubicacion.v1';

/**
 * Obtención de la posición en tres escalones, del más rápido al más preciso.
 *
 * La razón de existir de este módulo es que `getCurrentPositionAsync` con
 * precisión alta tarda entre cinco y treinta segundos en frío, y hasta entonces
 * no había nada que enseñar. Ahora se pinta con lo que ya se sabe —la última
 * posición guardada, el fix que el sistema tiene cacheado— y el fix real
 * sustituye a lo anterior cuando llega, sin que nadie espere mirando una rueda.
 */

/** Centro de España. Último recurso: sólo si no hay absolutamente nada mejor. */
export const FALLBACK_CENTER: Coords = { lat: 40.4168, lon: -3.7038 };

/** Un fix cacheado más viejo que esto ya no vale ni para encuadrar el mapa. */
const QUICK_MAX_AGE_MS = 10 * 60 * 1000;

/** Radio por encima del cual el fix cacheado no dice nada útil de dónde estás. */
const QUICK_MAX_ACCURACY_M = 5000;

/**
 * Precisión mínima para calcular un veredicto con un fix rápido. Las zonas UAS
 * miden cientos de metros, así que 150 m sirven para adelantar la consulta, pero
 * el resultado se recalcula igualmente cuando llega el fix bueno.
 */
export const VERDICT_MAX_ACCURACY_M = 150;

/** Distancia a partir de la cual el fix preciso obliga a repetir la consulta. */
export const REFINE_THRESHOLD_M = 100;

export interface Fix {
  coords: Coords;
  accuracy: number | null;
}

/** Metros entre dos puntos. Equirectangular: sobra para distancias de barrio. */
export function distanceM(a: Coords, b: Coords): number {
  const R = 6371000;
  const lat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLon = (b.lon - a.lon) * (Math.PI / 180) * Math.cos(lat);
  return Math.sqrt(dLat * dLat + dLon * dLon) * R;
}

/** ¿Hay permiso ya concedido? No abre ningún diálogo, responde al instante. */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Pide permiso si hace falta. Abre el diálogo del sistema la primera vez. */
export async function ensureLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * El fix que el sistema ya tenía guardado. Vuelve al instante porque no enciende
 * el GPS: es lo que permite pintar algo en el primer fotograma.
 */
export async function getQuickFix(): Promise<Fix | null> {
  try {
    const pos = await Location.getLastKnownPositionAsync({
      maxAge: QUICK_MAX_AGE_MS,
      requiredAccuracy: QUICK_MAX_ACCURACY_M,
    });
    if (!pos) return null;
    return {
      coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
      accuracy: pos.coords.accuracy ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * El fix de verdad. Por defecto `Balanced`, que se resuelve por wifi y antenas
 * en algo más de un segundo y deja un error de unos cien metros: de sobra para
 * saber en qué zona estás, y sin la espera del GNSS.
 */
export async function getPreciseFix(
  accuracy: Location.Accuracy = Location.Accuracy.Balanced,
): Promise<Fix> {
  const pos = await Location.getCurrentPositionAsync({ accuracy });
  return {
    coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
    accuracy: pos.coords.accuracy ?? null,
  };
}

/**
 * Guarda la última posición conocida. En un arranque de verdad en frío —el móvil
 * recién encendido— el sistema no tiene nada cacheado, y esto es lo único que
 * evita abrir el mapa en la otra punta del país.
 */
export function rememberCoords(coords: Coords): void {
  AsyncStorage.setItem(KEY, JSON.stringify(coords)).catch(() => {});
}

export async function loadRememberedCoords(): Promise<Coords | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Coords>;
    if (typeof parsed?.lat !== 'number' || typeof parsed?.lon !== 'number') return null;
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lon)) return null;
    return { lat: parsed.lat, lon: parsed.lon };
  } catch {
    return null;
  }
}
