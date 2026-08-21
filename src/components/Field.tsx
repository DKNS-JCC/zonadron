import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePalette } from '../hooks/useTheme';
import { noWebOutline } from './HeightControl';
import { radius, space, systemColor, type } from '../theme';

/**
 * Campo de texto de formulario.
 *
 * Vivía dentro de Ajustes, pero ahora lo usan también el perfil, la ficha de
 * cada dron y los datos de un documento: son todo lo mismo —un rótulo, una
 * caja y la señal de que ya está puesto— y tenían que dejar de repetirse.
 *
 * El foco se marca con un filo del color de acento, no engordando el marco:
 * así el campo no da un salto de tamaño al tocarlo.
 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
  hint,
  error,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'numbers-and-punctuation';
  autoCapitalize?: 'none' | 'words' | 'characters' | 'sentences';
  /** Explicación corta debajo del campo. */
  hint?: string;
  /** Lo que está mal de lo escrito. Sustituye a la pista mientras dure. */
  error?: string | null;
  multiline?: boolean;
}) {
  const p = usePalette();
  const [focused, setFocused] = React.useState(false);
  const filled = value.trim().length > 0;
  const danger = systemColor('red', p);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[type.footnote, { color: p.labelSecondary, flex: 1 }]}>{label}</Text>
        {filled && !error ? (
          <Ionicons name="checkmark-circle" size={15} color={systemColor('green', p)} />
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={p.labelTertiary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        accessibilityLabel={label}
        style={[
          type.callout,
          {
            color: p.label,
            paddingHorizontal: space.md,
            paddingVertical: 12,
            minHeight: multiline ? 88 : 44,
            textAlignVertical: multiline ? 'top' : 'center',
            borderRadius: radius.md,
            backgroundColor: p.surfaceSunken,
            borderWidth: 1,
            borderColor: error ? danger : focused ? p.tint : 'transparent',
          },
          noWebOutline,
        ]}
      />
      {error ? (
        <Text style={[type.caption, { color: danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[type.caption, { color: p.labelTertiary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}
