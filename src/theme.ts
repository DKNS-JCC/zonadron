import { Platform, type TextStyle } from 'react-native';
import type { VerdictLevel } from './types';

export interface Palette {
  bg: string;
  bgElevated: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  divider: string;
  tabBar: string;
  skeleton: string;
  scheme: 'light' | 'dark';
}

/**
 * Contraste: la app se usa en la calle, muchas veces con sol directo. Todos los
 * colores de texto llegan a 4.5:1 sobre su fondo (AA), incluidos los textos
 * secundarios, y los bordes de tarjeta son visibles de verdad (no hairline).
 */
export const lightPalette: Palette = {
  scheme: 'light',
  bg: '#F1F4F9',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#D3DAE7',
  text: '#0B1220',
  textMuted: '#525E74',
  textFaint: '#67718A',
  accent: '#1355E8',
  accentSoft: '#E7EEFD',
  divider: '#E4E9F2',
  tabBar: '#FFFFFFF2',
  skeleton: '#E4E9F2',
};

export const darkPalette: Palette = {
  scheme: 'dark',
  bg: '#0A1017',
  bgElevated: '#141D28',
  card: '#141D28',
  cardBorder: '#28364A',
  text: '#F2F5FA',
  textMuted: '#A3B0C4',
  textFaint: '#8B9AB1',
  accent: '#6E9CFF',
  accentSoft: '#1A2740',
  divider: '#22303F',
  tabBar: '#0D141DF2',
  skeleton: '#1C2836',
};

/* ------------------------------------------------------------------ */
/* Escala tipográfica                                                   */
/* ------------------------------------------------------------------ */

/**
 * Seis pasos y ninguno más. Antes había diecinueve tamaños distintos, ocho de
 * ellos con decimales, y eso es lo que el ojo lee como "hecho a mano".
 */
export const type = {
  display: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, lineHeight: 38 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, lineHeight: 29 },
  subtitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, lineHeight: 23 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 19 },
  captionStrong: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, lineHeight: 15 },
} satisfies Record<string, TextStyle>;

/* ------------------------------------------------------------------ */
/* Veredicto                                                            */
/* ------------------------------------------------------------------ */

export interface VerdictStyle {
  /** Color sólido de la tarjeta. Todos dan >= 4:1 con texto blanco. */
  color: string;
  /** Variante para chips y bordes sobre fondo claro. */
  onLight: string;
  /** Variante para chips y bordes sobre fondo oscuro. */
  onDark: string;
  icon: string;
}

export const verdictStyles: Record<VerdictLevel, VerdictStyle> = {
  LIBRE: { color: '#07835A', onLight: '#07835A', onDark: '#3FBE8F', icon: 'checkmark-circle' },
  CONDICIONES: { color: '#A96200', onLight: '#8F5300', onDark: '#E8A33D', icon: 'alert-circle' },
  AUTORIZACION: { color: '#C24400', onLight: '#A73A00', onDark: '#FF8A47', icon: 'shield-half' },
  PROHIBIDO: { color: '#BE2318', onLight: '#B01F15', onDark: '#FF6B5E', icon: 'close-circle' },
  DESCONOCIDO: { color: '#4A5A70', onLight: '#4A5A70', onDark: '#9FB0C6', icon: 'help-circle' },
};

/** Color del veredicto adaptado al tema, para chips, bordes y textos. */
export function verdictTint(level: VerdictLevel, palette: Palette): string {
  const s = verdictStyles[level];
  return palette.scheme === 'dark' ? s.onDark : s.onLight;
}

export const radius = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 };

/** Espaciado en múltiplos de 4. Úsalo siempre en vez de números sueltos. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  android: { elevation: 2 },
  default: {},
}) as object;

export const shadowStrong = Platform.select({
  ios: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 8 },
  default: {},
}) as object;
