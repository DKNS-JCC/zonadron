import React from 'react';
import { Pressable, Text, TextInput, View, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, shadow, space, tabular, type, emphasize } from '../theme';
import { HEIGHT_PRESETS } from '../state/SettingsContext';

const MIN = 1;
const MAX = 900;

const clamp = (n: number) => Math.max(MIN, Math.min(MAX, Math.round(n)));

/** Quita el contorno de foco del navegador en la versión web. */
export const noWebOutline = { outlineStyle: 'none' } as unknown as TextStyle;

/**
 * Un único control para la altura de vuelo: tres alturas típicas y "Otra".
 *
 * Es un control segmentado del sistema: una pista hundida y una pastilla que
 * marca lo elegido. Lo seleccionado se distingue por elevación y peso de letra,
 * no por un borde de color, que es lo que hace que un segmentado parezca cuatro
 * botones sueltos.
 *
 * `onColor` lo dibuja en blanco translúcido, para ir dentro de la tarjeta de
 * veredicto, que tiene fondo de color sólido.
 */
export function HeightControl({
  value,
  onChange,
  onColor,
}: {
  value: number;
  onChange: (h: number) => void;
  onColor?: boolean;
}) {
  const p = usePalette();
  const isPreset = (HEIGHT_PRESETS as readonly number[]).includes(value);
  const [custom, setCustom] = React.useState(!isPreset);
  const [text, setText] = React.useState(String(value));

  React.useEffect(() => {
    setText(String(value));
    if ((HEIGHT_PRESETS as readonly number[]).includes(value)) setCustom(false);
  }, [value]);

  const pick = (h: number) => {
    Haptics.selectionAsync().catch(() => {});
    setCustom(false);
    onChange(h);
  };

  const commit = () => {
    const n = Number(text.replace(',', '.'));
    if (Number.isFinite(n) && n > 0) onChange(clamp(n));
    else setText(String(value));
  };

  const track = onColor ? '#00000026' : p.surfaceSunken;
  const activeBg = onColor ? '#FFFFFF' : p.surface;
  const activeFg = onColor ? '#1A1A1C' : p.label;
  const idleFg = onColor ? '#FFFFFFCC' : p.labelSecondary;

  const segments: Array<{ key: string; label: string; active: boolean; onPress: () => void }> = [
    ...HEIGHT_PRESETS.map((h) => ({
      key: String(h),
      label: `${h} m`,
      active: !custom && value === h,
      onPress: () => pick(h),
    })),
    {
      key: 'otra',
      label: custom ? `${value} m` : 'Otra',
      active: custom,
      onPress: () => {
        Haptics.selectionAsync().catch(() => {});
        setCustom(true);
      },
    },
  ];

  return (
    <View style={{ gap: space.sm }}>
      <View
        style={{
          flexDirection: 'row',
          gap: 2,
          backgroundColor: track,
          borderRadius: 10,
          padding: 2,
        }}
      >
        {segments.map((s) => (
          <Pressable
            key={s.key}
            onPress={s.onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: s.active }}
            accessibilityLabel={s.key === 'otra' ? 'Otra altura' : `Volar a ${s.label}`}
            style={[
              {
                flex: 1,
                minHeight: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                backgroundColor: s.active ? activeBg : 'transparent',
              },
              s.active ? (shadow.chip as object) : {},
            ]}
          >
            <Text
              style={[
                emphasize(type.subheadline, s.active ? '600' : '500'),
                tabular,
                { color: s.active ? activeFg : idleFg },
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {custom ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: radius.md,
            backgroundColor: track,
            overflow: 'hidden',
          }}
        >
          <Step icon="remove" onPress={() => onChange(clamp(value - 10))} label="Bajar 10 metros" color={onColor ? '#FFFFFF' : p.tint} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
            <TextInput
              value={text}
              onChangeText={setText}
              onBlur={commit}
              onSubmitEditing={commit}
              keyboardType="number-pad"
              returnKeyType="done"
              selectTextOnFocus
              accessibilityLabel="Altura de vuelo en metros"
              style={[
                type.title3,
                tabular,
                {
                  color: onColor ? '#FFFFFF' : p.label,
                  paddingVertical: 12,
                  minWidth: 54,
                  textAlign: 'right',
                },
                // `outlineStyle` sólo existe en la versión web; quita el recuadro
                // de foco del navegador, que rompe la forma redondeada.
                noWebOutline,
              ]}
            />
            <Text style={[type.subheadline, { color: onColor ? '#FFFFFFC7' : p.labelSecondary, marginLeft: 5 }]}>
              m sobre el terreno
            </Text>
          </View>
          <Step icon="add" onPress={() => onChange(clamp(value + 10))} label="Subir 10 metros" color={onColor ? '#FFFFFF' : p.tint} />
        </View>
      ) : null}
    </View>
  );
}

function Step({
  icon,
  onPress,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  color: string;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 50,
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}
