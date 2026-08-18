import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius } from '../theme';
import { HEIGHT_PRESETS } from '../state/SettingsContext';

const MIN = 1;
const MAX = 900;
const STEP = 10;

/**
 * Selector de la altura de vuelo prevista (metros sobre el terreno).
 * Cambiarla no es cosmético: filtra qué zonas te afectan de verdad.
 */
export function HeightPicker({
  value,
  onChange,
  compact,
}: {
  value: number;
  onChange: (h: number) => void;
  compact?: boolean;
}) {
  const p = usePalette();
  const [text, setText] = React.useState(String(value));

  React.useEffect(() => setText(String(value)), [value]);

  const clamp = (n: number) => Math.max(MIN, Math.min(MAX, Math.round(n)));

  const commit = () => {
    const n = Number(text.replace(',', '.'));
    if (Number.isFinite(n) && n > 0) onChange(clamp(n));
    else setText(String(value));
  };

  return (
    <View style={{ gap: 10 }}>
      {!compact ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Ionicons name="airplane-outline" size={15} color={p.textMuted} />
          <Text style={{ color: p.textMuted, fontSize: 13, flex: 1 }}>
            Altura de vuelo prevista, sobre el terreno
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {HEIGHT_PRESETS.map((h) => {
          const active = value === h;
          return (
            <Pressable
              key={h}
              onPress={() => onChange(h)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: radius.md,
                alignItems: 'center',
                backgroundColor: active ? p.accent : p.accentSoft,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: active ? p.accent : p.cardBorder,
              }}
            >
              <Text style={{ color: active ? '#fff' : p.accent, fontWeight: '700', fontSize: 14 }}>
                {h} m
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.cardBorder,
          backgroundColor: p.bgElevated,
          overflow: 'hidden',
        }}
      >
        <StepButton icon="remove" onPress={() => onChange(clamp(value - STEP))} label="Bajar 10 metros" />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <TextInput
            value={text}
            onChangeText={setText}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="number-pad"
            returnKeyType="done"
            accessibilityLabel="Altura de vuelo en metros"
            selectTextOnFocus
            style={{
              color: p.text,
              fontSize: 16,
              fontWeight: '700',
              paddingVertical: 12,
              minWidth: 56,
              textAlign: 'right',
            }}
          />
          <Text style={{ color: p.textMuted, fontSize: 15, marginLeft: 5 }} numberOfLines={1}>
            m
          </Text>
        </View>
        <StepButton icon="add" onPress={() => onChange(clamp(value + STEP))} label="Subir 10 metros" />
      </View>
    </View>
  );
}

function StepButton({
  icon,
  onPress,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        backgroundColor: pressed ? p.accentSoft : 'transparent',
      })}
    >
      <Ionicons name={icon} size={20} color={p.accent} />
    </Pressable>
  );
}
