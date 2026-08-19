import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScroll } from '../../src/components/Screen';
import { Banner, Card, ScreenTitle, SectionTitle } from '../../src/components/ui';
import { DroneCard } from '../../src/components/DroneCard';
import { OfflineCard } from '../../src/components/OfflineCard';
import { AdvancedCard } from '../../src/components/AdvancedCard';
import { HeightControl } from '../../src/components/HeightControl';
import { noWebOutline } from '../../src/components/HeightControl';
import { usePalette } from '../../src/hooks/useTheme';
import { APPEARANCES, useSettings } from '../../src/state/SettingsContext';
import { missingOperatorFields } from '../../src/logic/request';
import { radius, shadow, space, systemColor, type, emphasize } from '../../src/theme';

export default function AjustesScreen() {
  const p = usePalette();
  const { operator, setOperator, flightHeight, setFlightHeight, appearance, setAppearance } =
    useSettings();
  const missing = missingOperatorFields(operator);

  return (
    <ScreenScroll>
      <ScreenTitle
        title="Ajustes"
        subtitle="Tus datos se guardan sólo en este móvil y se usan para redactar las solicitudes de autorización."
      />

      <Card>
        <SectionTitle>Aspecto</SectionTitle>
        {/* Control segmentado del sistema: pista hundida y pastilla elevada. */}
        <View
          style={{
            flexDirection: 'row',
            gap: 2,
            backgroundColor: p.surfaceSunken,
            borderRadius: 10,
            padding: 2,
          }}
        >
          {APPEARANCES.map((a) => {
            const active = appearance === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setAppearance(a.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Aspecto ${a.label}`}
                style={[
                  {
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    backgroundColor: active ? p.surface : 'transparent',
                  },
                  active ? (shadow.chip as object) : {},
                ]}
              >
                <Ionicons
                  name={a.icon as keyof typeof Ionicons.glyphMap}
                  size={17}
                  color={active ? p.tint : p.labelSecondary}
                />
                <Text
                  style={[
                    emphasize(type.caption, active ? '600' : '500'),
                    { color: active ? p.label : p.labelSecondary },
                  ]}
                >
                  {a.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.md }]}>
          En automático manda el modo del móvil. Fuerza el claro si vas a volar con el sol de cara:
          la pantalla se lee mucho mejor.
        </Text>
      </Card>

      <DroneCard />

      <OfflineCard />

      <AdvancedCard />

      <Card>
        <SectionTitle>Tus datos de operador</SectionTitle>
        <View style={{ gap: space.md }}>
          <Field
            label="Nombre o razón social"
            value={operator.name}
            onChange={(name) => setOperator({ name })}
            placeholder="Jorge Cuadrado"
            autoCapitalize="words"
          />
          <Field
            label="Número de operador UAS (AESA)"
            value={operator.uasNumber}
            onChange={(uasNumber) => setOperator({ uasNumber })}
            placeholder="ESAxxxxxxxxxxxx"
            autoCapitalize="characters"
            hint="El que te dieron al registrarte en AESA. Va pegado al dron."
          />
          <Field
            label="Correo de contacto"
            value={operator.email}
            onChange={(email) => setOperator({ email })}
            placeholder="tucorreo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Teléfono de contacto"
            value={operator.phone}
            onChange={(phone) => setOperator({ phone })}
            placeholder="+34 600 000 000"
            keyboardType="phone-pad"
          />
        </View>
      </Card>

      <Card>
        <SectionTitle>Tu aeronave</SectionTitle>
        <View style={{ gap: space.md }}>
          <Field
            label="Modelo"
            value={operator.droneModel}
            onChange={(droneModel) => setOperator({ droneModel })}
            placeholder="DJI Mini 2"
          />
          <Field
            label="Número de serie"
            value={operator.droneSerial}
            onChange={(droneSerial) => setOperator({ droneSerial })}
            placeholder="El de la caja o de la app del fabricante"
            autoCapitalize="characters"
            hint="Lo piden en casi todas las solicitudes de coordinación."
          />
        </View>
      </Card>

      <Card>
        <SectionTitle>Altura de vuelo por defecto</SectionTitle>
        <HeightControl value={flightHeight} onChange={setFlightHeight} />
        <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.md }]}>
          Es la altura con la que se abren las consultas. Puedes cambiarla en cualquier momento desde
          la propia tarjeta del resultado.
        </Text>
      </Card>

      {missing.length > 0 ? (
        <Banner tone="warn">
          Te falta por rellenar: {missing.join(', ')}. Sin esos datos las solicitudes de autorización
          saldrán con huecos marcados como [COMPLETAR].
        </Banner>
      ) : (
        <Banner icon="checkmark-circle-outline">
          Tus datos están completos: las solicitudes de autorización saldrán rellenadas.
        </Banner>
      )}

      <Banner>
        Nada de esto sale de tu móvil. La app no tiene servidor propio ni envía correos por su
        cuenta: se limita a abrir tu aplicación de correo con el texto redactado para que lo revises
        y lo mandes tú.
      </Banner>
    </ScreenScroll>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'characters' | 'sentences';
}) {
  const p = usePalette();
  const [focused, setFocused] = React.useState(false);
  const filled = value.trim().length > 0;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={[type.footnote, { color: p.labelSecondary, flex: 1 }]}>{label}</Text>
        {filled ? <Ionicons name="checkmark-circle" size={15} color={systemColor('green', p)} /> : null}
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
        accessibilityLabel={label}
        style={[
          type.callout,
          {
            color: p.label,
            paddingHorizontal: space.md,
            paddingVertical: 12,
            minHeight: 44,
            borderRadius: radius.md,
            backgroundColor: p.surfaceSunken,
            // El foco se marca con un filo del color de acento, no engordando el
            // marco: así el campo no da un salto de tamaño al tocarlo.
            borderWidth: 1,
            borderColor: focused ? p.tint : 'transparent',
          },
          noWebOutline,
        ]}
      />
      {hint ? <Text style={[type.caption, { color: p.labelTertiary }]}>{hint}</Text> : null}
    </View>
  );
}
