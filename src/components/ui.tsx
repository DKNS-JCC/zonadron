import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import {
  emphasize,
  HIT_SIZE,
  HIT_SLOP,
  radius,
  shadow,
  space,
  systemColor,
  tabular,
  type,
} from '../theme';
import { PressableScale, Pulse } from './motion';

/**
 * Piezas de interfaz.
 *
 * La forma es la de una lista agrupada: fondo hundido, tarjetas claras encima y
 * filas separadas por líneas finísimas. Nada de bordes gruesos ni de colorear
 * cosas que no lo necesitan — cada elemento se gana su sitio.
 */

/* ------------------------------------------------------------------ */
/* Superficies                                                          */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
}) {
  const p = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: p.surface,
          borderRadius: radius.lg,
          padding: padded ? space.lg : 0,
          overflow: 'hidden',
        },
        shadow.chip,
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}

/** Rótulo de sección de lista agrupada. */
export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: space.sm,
        paddingHorizontal: space.xs,
      }}
    >
      <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: space.xs, paddingHorizontal: space.xs }}>
      <Text style={[type.largeTitle, { color: p.label }]}>{title}</Text>
      {subtitle ? (
        <Text style={[type.subheadline, { color: p.labelSecondary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

/** Línea finísima entre filas, sangrada como en una lista del sistema. */
export function Separator({ inset = 0 }: { inset?: number }) {
  const p = usePalette();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: p.separator,
        marginLeft: inset,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Controles                                                            */
/* ------------------------------------------------------------------ */

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  color,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const bg = color ?? p.tint;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={HIT_SLOP}
      style={[
        {
          backgroundColor: bg,
          opacity: disabled ? 0.4 : 1,
          borderRadius: radius.md,
          minHeight: 50,
          paddingHorizontal: space.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
        },
        style as ViewStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : icon ? (
        <Ionicons name={icon} size={19} color="#fff" />
      ) : null}
      <Text style={[emphasize(type.headline), { color: '#fff' }]}>{label}</Text>
    </PressableScale>
  );
}

export function GhostButton({
  label,
  onPress,
  icon,
  color,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  const p = usePalette();
  const c = color ?? p.tint;
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        minHeight: HIT_SIZE,
        paddingHorizontal: space.lg,
        borderRadius: radius.md,
        backgroundColor: p.tintSoft,
      }}
    >
      {icon ? <Ionicons name={icon} size={16} color={c} /> : null}
      <Text style={[emphasize(type.subheadline), { color: c }]}>{label}</Text>
    </PressableScale>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  color?: string;
}) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={HIT_SLOP}
      style={{
        width: HIT_SIZE,
        height: HIT_SIZE,
        borderRadius: HIT_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={21} color={color ?? p.tint} />
    </PressableScale>
  );
}

/** Pastilla informativa. Sin color salvo que el color signifique algo. */
export function Chip({
  label,
  color,
  icon,
  filled,
}: {
  label: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  filled?: boolean;
}) {
  const p = usePalette();
  const c = color ?? p.labelSecondary;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        backgroundColor: filled ? c : p.surfaceSunken,
        borderRadius: radius.sm,
        paddingHorizontal: space.sm,
        paddingVertical: 4,
      }}
    >
      {icon ? <Ionicons name={icon} size={12} color={filled ? '#fff' : c} /> : null}
      <Text style={[emphasize(type.caption2), { color: filled ? '#fff' : c }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Filas y avisos                                                       */
/* ------------------------------------------------------------------ */

export function InfoRow({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: space.lg,
        minHeight: 32,
        paddingVertical: 6,
      }}
    >
      <Text style={[type.subheadline, { color: p.labelSecondary, flexShrink: 0 }]}>{label}</Text>
      <Text
        style={[
          type.subheadline,
          tabular,
          { color: p.label, textAlign: 'right', flexShrink: 1 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function Banner({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'info' | 'warn';
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  const p = usePalette();
  const color = tone === 'warn' ? systemColor('orange', p) : p.labelSecondary;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: space.md,
        backgroundColor: p.surface,
        borderRadius: radius.lg,
        padding: space.lg,
      }}
    >
      <Ionicons
        name={icon ?? (tone === 'warn' ? 'warning' : 'information-circle')}
        size={19}
        color={color}
        style={{ marginTop: 1 }}
      />
      <Text style={[type.footnote, { color: p.label, flex: 1, lineHeight: 19 }]}>{children}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Carga y vacío                                                        */
/* ------------------------------------------------------------------ */

export function SkeletonLine({
  width = '100%',
  height = 14,
}: {
  width?: number | string;
  height?: number;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        width: width as ViewStyle['width'],
        height,
        borderRadius: radius.sm,
        backgroundColor: p.skeleton,
      }}
    />
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <Pulse>
      <View style={{ gap: space.lg }}>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={{ gap: space.sm }}>
            <SkeletonLine width={i % 2 === 0 ? '58%' : '44%'} height={17} />
            <SkeletonLine width="86%" height={12} />
          </View>
        ))}
      </View>
    </Pulse>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const p = usePalette();
  return (
    <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxxl }}>
      <Ionicons name={icon} size={44} color={p.labelTertiary} />
      <Text style={[emphasize(type.headline), { color: p.label, textAlign: 'center' }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[type.subheadline, { color: p.labelSecondary, textAlign: 'center', maxWidth: 300 }]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export const hairline = StyleSheet.hairlineWidth;

/** Compatibilidad con el nombre anterior mientras queda código por migrar. */
export const Divider = Separator;
