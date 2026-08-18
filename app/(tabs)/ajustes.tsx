import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScroll } from '../../src/components/Screen';
import { Banner, Card, ScreenTitle, SectionTitle } from '../../src/components/ui';
import { DroneCard } from '../../src/components/DroneCard';
import { OfflineCard } from '../../src/components/OfflineCard';
import { HeightControl } from '../../src/components/HeightControl';
import { noWebOutline } from '../../src/components/HeightControl';
import { usePalette } from '../../src/hooks/useTheme';
import { useSettings, type OperatorProfile } from '../../src/state/SettingsContext';
import { missingOperatorFields } from '../../src/logic/request';
import { radius, space, type } from '../../src/theme';

export default function AjustesScreen() {
  const p = usePalette();
  const { operator, setOperator, flightHeight, setFlightHeight } = useSettings();
  const missing = missingOperatorFields(operator);

  return (
    <ScreenScroll>
      <ScreenTitle
        title="Ajustes"
        subtitle="Tus datos se guardan sólo en este móvil y se usan para redactar las solicitudes de autorización."
      />

      <DroneCard />

      <OfflineCard />

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
        <Text style={[type.caption, { color: p.textFaint, marginTop: space.md }]}>
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
        <Text style={[type.captionStrong, { color: p.textMuted, flex: 1 }]}>{label}</Text>
        {filled ? <Ionicons name="checkmark-circle" size={15} color="#07835A" /> : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={p.textFaint}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        accessibilityLabel={label}
        style={[
          {
            color: p.text,
            fontSize: 15,
            paddingHorizontal: space.md,
            paddingVertical: 13,
            borderRadius: radius.md,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? p.accent : p.cardBorder,
            backgroundColor: p.bgElevated,
          },
          noWebOutline,
        ]}
      />
      {hint ? <Text style={[type.caption, { color: p.textFaint, fontSize: 12 }]}>{hint}</Text> : null}
    </View>
  );
}
