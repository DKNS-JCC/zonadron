import React from 'react';
import { Pressable, Text, TextInput, View, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, type } from '../theme';
import { HEIGHT_PRESETS } from '../state/SettingsContext';

const MIN = 1;
const MAX = 900;

const clamp = (n: number) => Math.max(MIN, Math.min(MAX, Math.round(n)));

/** Quita el contorno de foco del navegador en la versión web. */
export const noWebOutline = { outlineStyle: 'none' } as unknown as TextStyle;

/**
 * Un único control para la altura de vuelo: tres alturas típicas y "Otra".
 * Antes había dos controles para el mismo número (presets + stepper), que es la
 * duplicación que más se notaba en pantalla.
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

  const activeBg = onColor ? '#FFFFFF' : p.accent;
  const activeFg = onColor ? '#12212F' : '#FFFFFF';
  const idleBg = onColor ? '#FFFFFF2E' : p.accentSoft;
  const idleFg = onColor ? '#FFFFFF' : p.accent;
  const border = onColor ? '#FFFFFF3D' : p.cardBorder;

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
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {segments.map((s) => (
          <Pressable
            key={s.key}
            onPress={s.onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: s.active }}
            accessibilityLabel={s.key === 'otra' ? 'Otra altura' : `Volar a ${s.label}`}
            style={{
              flex: 1,
              minHeight: 46,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: s.active ? activeBg : idleBg,
              borderWidth: 1,
              borderColor: s.active ? activeBg : border,
            }}
          >
            <Text style={[type.captionStrong, { color: s.active ? activeFg : idleFg, fontSize: 14 }]}>
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
            borderWidth: 1,
            borderColor: border,
            backgroundColor: idleBg,
            overflow: 'hidden',
          }}
        >
          <Step icon="remove" onPress={() => onChange(clamp(value - 10))} label="Bajar 10 metros" color={idleFg} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
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
                {
                  color: onColor ? '#FFFFFF' : p.text,
                  fontSize: 17,
                  fontWeight: '700',
                  paddingVertical: 12,
                  minWidth: 54,
                  textAlign: 'right',
                },
                // `outlineStyle` sólo existe en la versión web; quita el recuadro
                // de foco del navegador, que rompe la forma redondeada.
                noWebOutline,
              ]}
            />
            <Text style={[type.body, { color: onColor ? '#FFFFFFC7' : p.textMuted, marginLeft: 4 }]}>
              m sobre el terreno
            </Text>
          </View>
          <Step icon="add" onPress={() => onChange(clamp(value + 10))} label="Subir 10 metros" color={idleFg} />
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
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}
