import { Platform, type TextStyle } from 'react-native';
import type { VerdictLevel } from './types';

/**
 * Fundamentos visuales.
 *
 * Sigue los criterios de la guía de diseño de Apple: tipografía con óptica por
 * tamaño, color semántico que se adapta a claro y oscuro, materiales
 * translúcidos con jerarquía por peso, y nada puesto al azar — cada espaciado y
 * cada tamaño es una decisión que se puede defender.
 */

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

export interface Palette {
  scheme: 'light' | 'dark';

  /** Fondo de las pantallas agrupadas (listas, formularios). */
  background: string;
  /** Superficie de las tarjetas sobre ese fondo. */
  surface: string;
  /** Superficie de segundo nivel (dentro de una tarjeta). */
  surfaceSunken: string;

  /** Texto principal. */
  label: string;
  /** Texto de apoyo. */
  labelSecondary: string;
  /** Texto terciario: pistas, unidades, notas al pie. */
  labelTertiary: string;

  /** Color de acento del sistema. */
  tint: string;
  /** Fondo suave del acento, para rellenos y estados seleccionados. */
  tintSoft: string;

  /** Línea de separación fina entre filas. */
  separator: string;
  /** Borde visible de una superficie. */
  border: string;

  /** Relleno de los esqueletos de carga. */
  skeleton: string;
  /** Velo de oscurecimiento bajo una hoja modal. */
  scrim: string;
}

export const lightPalette: Palette = {
  scheme: 'light',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSunken: '#F2F2F7',
  label: '#000000',
  labelSecondary: '#3C3C4399',
  labelTertiary: '#3C3C434D',
  tint: '#0A6CFF',
  tintSoft: '#0A6CFF14',
  separator: '#3C3C432E',
  border: '#3C3C431F',
  skeleton: '#78788028',
  scrim: '#00000059',
};

export const darkPalette: Palette = {
  scheme: 'dark',
  background: '#000000',
  surface: '#1C1C1E',
  surfaceSunken: '#2C2C2E',
  label: '#FFFFFF',
  labelSecondary: '#EBEBF599',
  labelTertiary: '#EBEBF54D',
  tint: '#3B90FF',
  tintSoft: '#3B90FF1F',
  separator: '#54545899',
  border: '#5454585C',
  skeleton: '#7878805C',
  scrim: '#00000080',
};

/* ------------------------------------------------------------------ */
/* Color de acento                                                     */
/* ------------------------------------------------------------------ */

/**
 * El acento se puede cambiar; el resto del color, no.
 *
 * Y hay una regla que no se toca: los colores del veredicto (verde, ámbar,
 * naranja, rojo) y los de aviso NO son personalizables. Ahí el color no
 * decora, significa: es la diferencia entre «puedes volar» y «aquí no». Que
 * alguien ponga su app en rojo entero y deje de distinguir un veredicto de
 * otro no es una preferencia estética, es un fallo de seguridad.
 *
 * Lo que cambia es el color de los controles: enlaces, botones, seleccionados.
 * Cada acento trae su tono para claro y para oscuro, porque un azul que se lee
 * sobre blanco se apaga sobre negro.
 *
 * Por eso mismo **ninguno de los acentos es verde, ámbar, naranja ni rojo**:
 * ésa es la familia de los veredictos y de los avisos. Un botón del mismo verde
 * que «puedes volar» enseña al ojo que ese verde no quiere decir nada, y el día
 * que sí quiera decir algo ya no se mira.
 */
export type AccentId = 'azul' | 'turquesa' | 'morado' | 'rosa' | 'grafito';

interface AccentColor {
  light: string;
  dark: string;
}

export const accents: Record<AccentId, AccentColor> = {
  azul: { light: '#0A6CFF', dark: '#3B90FF' },
  turquesa: { light: '#0E7C86', dark: '#45CFDD' },
  morado: { light: '#6B3FBF', dark: '#B18CFF' },
  rosa: { light: '#B02A6B', dark: '#FF8FC0' },
  grafito: { light: '#3A3A3C', dark: '#C7C7CC' },
};

export const ACCENT_IDS: AccentId[] = ['azul', 'turquesa', 'morado', 'rosa', 'grafito'];

/** El acento tal y como se ve en el esquema que toque. */
export function accentColor(id: AccentId, scheme: 'light' | 'dark'): string {
  return (accents[id] ?? accents.azul)[scheme];
}

/**
 * La paleta con el acento puesto.
 *
 * `tintSoft` es el mismo color con transparencia (un canal alfa en hexadecimal
 * al final): sobre blanco basta con un 8%, y sobre negro hace falta algo más
 * para que el relleno se vea.
 */
export function withAccent(base: Palette, id: AccentId): Palette {
  const tint = accentColor(id, base.scheme);
  return { ...base, tint, tintSoft: `${tint}${base.scheme === 'dark' ? '1F' : '14'}` };
}

/* ------------------------------------------------------------------ */
/* Tipografía                                                          */
/* ------------------------------------------------------------------ */

/**
 * La letra cambia de forma con el tamaño.
 *
 * El interletrado es específico de cada tamaño, nunca uno solo para todos: el
 * texto grande necesita interletrado NEGATIVO (al crecer, las letras se leen
 * demasiado separadas) y el pequeño uno ligeramente positivo para que se
 * distinga. La interlínea va al revés que el tamaño: apretada en los titulares,
 * holgada en el texto corrido.
 *
 * La jerarquía se construye con peso + tamaño + interlínea a la vez, no sólo con
 * el tamaño: el peso da presencia sin ocupar más sitio.
 *
 * Los tamaños son los del sistema (34/28/22/20/17/16/15/13/12/11), porque la
 * tipografía del sistema ya trae su óptica, su interletrado y su ajuste de
 * legibilidad resueltos.
 */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, letterSpacing: -0.7, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, letterSpacing: -0.45, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, letterSpacing: -0.24, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24, letterSpacing: -0.1, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 22, letterSpacing: -0.06, fontWeight: '400' },
  subheadline: { fontSize: 15, lineHeight: 21, letterSpacing: 0, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: 0.05, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1, fontWeight: '400' },
  caption2: { fontSize: 11, lineHeight: 14, letterSpacing: 0.12, fontWeight: '400' },
  /** Rótulo de sección de lista agrupada. */
  sectionHeader: { fontSize: 13, lineHeight: 18, letterSpacing: 0.06, fontWeight: '400' },
} satisfies Record<string, TextStyle>;

/** Mismo tamaño, más peso: así se enfatiza sin ocupar más espacio. */
export function emphasize(style: TextStyle, weight: TextStyle['fontWeight'] = '600'): TextStyle {
  return { ...style, fontWeight: weight };
}

/** Cifras de ancho fijo para lecturas que cambian: no bailan al actualizarse. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/* ------------------------------------------------------------------ */
/* Métrica                                                             */
/* ------------------------------------------------------------------ */

/** Espaciado en múltiplos de 4. Nada de números sueltos por ahí. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, sheet: 28, pill: 999 } as const;

/** Superficie mínima que un dedo acierta sin pensar. */
export const HIT_SIZE = 44;
/** Holgura alrededor del objetivo, para perdonar el pulso. */
export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

/* ------------------------------------------------------------------ */
/* Materiales y profundidad                                            */
/* ------------------------------------------------------------------ */

/**
 * El peso del material marca la jerarquía: los más densos separan regiones
 * estructurales, los más ligeros llaman la atención sobre lo interactivo. Nunca
 * se apila una superficie translúcida clara sobre otra: la legibilidad se cae.
 *
 * Y cuanto más grande es la superficie, más gruesa debe leerse: más desenfoque y
 * sombra más profunda que en una pastilla pequeña.
 */
export type MaterialWeight = 'chrome' | 'panel' | 'sheet';

export const materialIntensity: Record<MaterialWeight, number> = {
  chrome: 60,
  panel: 75,
  sheet: 90,
};

export const shadow = {
  /** Elementos pequeños apoyados sobre el fondo. */
  chip: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 1 },
    default: {},
  }) as object,
  /** Tarjetas y paneles flotantes. */
  panel: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 4 },
    default: {},
  }) as object,
  /** Hojas: superficie grande, sombra más profunda. */
  sheet: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: -6 } },
    android: { elevation: 16 },
    default: {},
  }) as object,
};

/* ------------------------------------------------------------------ */
/* Veredicto                                                           */
/* ------------------------------------------------------------------ */

export interface VerdictStyle {
  /** Relleno sólido, con texto blanco encima. */
  solid: string;
  /** Tinte para texto e iconos sobre fondo claro. */
  onLight: string;
  /** Tinte para texto e iconos sobre fondo oscuro. */
  onDark: string;
  icon: string;
}

/**
 * Los rellenos son versiones profundas de los colores del sistema: el blanco
 * encima tiene que leerse al sol, y los tonos vivos de iOS no dan contraste
 * suficiente para eso.
 */
export const verdictStyles: Record<VerdictLevel, VerdictStyle> = {
  LIBRE: { solid: '#1C7A45', onLight: '#187141', onDark: '#4ED88A', icon: 'checkmark.circle' },
  CONDICIONES: { solid: '#A55E00', onLight: '#8A4F00', onDark: '#FFB340', icon: 'exclamationmark.circle' },
  AUTORIZACION: { solid: '#B84A02', onLight: '#A03F00', onDark: '#FF9F45', icon: 'shield.lefthalf.filled' },
  PROHIBIDO: { solid: '#B3261E', onLight: '#A31E17', onDark: '#FF7A70', icon: 'xmark.circle' },
  DESCONOCIDO: { solid: '#4A4A4F', onLight: '#48484A', onDark: '#AEAEB2', icon: 'questionmark.circle' },
};

/**
 * El escalón que faltaba, entre el verde y el naranja.
 *
 * Verde es "no hay nada", naranja es "hay una restricción y está publicada",
 * y rojo es "no vueles". Faltaba un tono para lo que sabemos a medias: el
 * entorno urbano y las zonas verdes se deducen de datos que no son un registro
 * de restricciones, así que no pueden pintarse con la misma seguridad que una
 * zona de ENAIRE — pero tampoco de verde, que se lee como "todo correcto".
 */
export const noticeStyle: VerdictStyle = {
  solid: '#8A6A00',
  onLight: '#7A5D00',
  onDark: '#F7C948',
  icon: 'exclamationmark.triangle',
};

export function noticeTint(palette: Palette): string {
  return palette.scheme === 'dark' ? noticeStyle.onDark : noticeStyle.onLight;
}

export function verdictTint(level: VerdictLevel, palette: Palette): string {
  const s = verdictStyles[level];
  return palette.scheme === 'dark' ? s.onDark : s.onLight;
}

/** Colores del sistema para estados puntuales. */
export const systemColors = {
  green: { light: '#187141', dark: '#4ED88A' },
  amber: { light: '#7A5D00', dark: '#F7C948' },
  orange: { light: '#8A4F00', dark: '#FFB340' },
  red: { light: '#A31E17', dark: '#FF7A70' },
};

export function systemColor(name: keyof typeof systemColors, palette: Palette): string {
  return palette.scheme === 'dark' ? systemColors[name].dark : systemColors[name].light;
}
