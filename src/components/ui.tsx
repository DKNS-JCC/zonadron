import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, shadow, space, type } from '../theme';
import { Pulse } from './motion';

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
          backgroundColor: p.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: p.cardBorder,
          padding: padded ? space.lg : 0,
          overflow: 'hidden',
        },
        shadow,
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}

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
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: space.sm,
      }}
    >
      <Text style={[type.overline, { color: p.textMuted, textTransform: 'uppercase' }]}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: space.xs }}>
      <Text style={[type.display, { color: p.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[type.body, { color: p.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

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
  const c = color ?? p.textMuted;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        backgroundColor: filled ? c : c + (p.scheme === 'dark' ? '26' : '1C'),
        borderRadius: radius.pill,
        paddingHorizontal: space.sm + 2,
        paddingVertical: 4,
      }}
    >
      {icon ? <Ionicons name={icon} size={12} color={filled ? '#fff' : c} /> : null}
      <Text style={[type.overline, { color: filled ? '#fff' : c, letterSpacing: 0.3 }]}>
        {label}
      </Text>
    </View>
  );
}

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
  const bg = color ?? p.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          opacity: disabled ? 0.45 : pressed ? 0.86 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          borderRadius: radius.pill,
          minHeight: 56,
          paddingHorizontal: space.xl,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm + 2,
        },
        shadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : icon ? (
        <Ionicons name={icon} size={20} color="#fff" />
      ) : null}
      <Text style={[type.subtitle, { color: '#fff', fontSize: 16 }]}>{label}</Text>
    </Pressable>
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
  const c = color ?? p.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        minHeight: 44,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: p.cardBorder,
        backgroundColor: pressed ? p.accentSoft : 'transparent',
      })}
    >
      {icon ? <Ionicons name={icon} size={16} color={c} /> : null}
      <Text style={[type.captionStrong, { color: c }]}>{label}</Text>
    </Pressable>
  );
}

/** Botón redondo de icono, para acciones secundarias en cabeceras. */
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? p.accentSoft : 'transparent',
      })}
    >
      <Ionicons name={icon} size={21} color={color ?? p.accent} />
    </Pressable>
  );
}

export function Divider({ spaced = true }: { spaced?: boolean }) {
  const p = usePalette();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: p.divider,
        marginVertical: spaced ? space.md : 0,
      }}
    />
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: space.lg,
        paddingVertical: 5,
      }}
    >
      <Text style={[type.caption, { color: p.textMuted, flexShrink: 0 }]}>{label}</Text>
      <Text
        style={[
          type.captionStrong,
          { color: p.text, textAlign: 'right', flexShrink: 1, fontVariant: ['tabular-nums'] },
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
  const color = tone === 'warn' ? (p.scheme === 'dark' ? '#E8A33D' : '#8F5300') : p.textMuted;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: space.sm + 2,
        backgroundColor: color + (p.scheme === 'dark' ? '1F' : '14'),
        borderRadius: radius.md,
        padding: space.md,
      }}
    >
      <Ionicons
        name={icon ?? (tone === 'warn' ? 'warning-outline' : 'information-circle-outline')}
        size={17}
        color={color}
        style={{ marginTop: 1 }}
      />
      <Text style={[type.caption, { color: p.text, flex: 1 }]}>{children}</Text>
    </View>
  );
}

/** Bloque gris que ocupa el sitio del contenido mientras carga. */
export function SkeletonLine({ width = '100%', height = 14 }: { width?: number | string; height?: number }) {
  const p = usePalette();
  return (
    <View
      style={{
        width: width as ViewStyle['width'],
        height,
        borderRadius: 6,
        backgroundColor: p.skeleton,
      }}
    />
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <Pulse>
      <View style={{ gap: space.md }}>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={{ gap: space.sm }}>
            <SkeletonLine width={i % 2 === 0 ? '62%' : '48%'} height={15} />
            <SkeletonLine width="88%" height={11} />
          </View>
        ))}
      </View>
    </Pulse>
  );
}

/** Estado vacío con icono, para pantallas sin contenido todavía. */
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
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: p.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={32} color={p.accent} />
      </View>
      <Text style={[type.subtitle, { color: p.text, textAlign: 'center' }]}>{title}</Text>
      {subtitle ? (
        <Text style={[type.caption, { color: p.textMuted, textAlign: 'center', maxWidth: 280 }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export const hairline = StyleSheet.hairlineWidth;
