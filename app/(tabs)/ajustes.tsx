import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScroll } from '../../src/components/Screen';
import { Card, Chip, ScreenTitle, SectionTitle, Separator } from '../../src/components/ui';
import { Chevron, Collapsible } from '../../src/components/motion';
import { DroneCard } from '../../src/components/DroneCard';
import { OfflineCard } from '../../src/components/OfflineCard';
import { HeightControl } from '../../src/components/HeightControl';
import { noWebOutline } from '../../src/components/HeightControl';
import { usePalette } from '../../src/hooks/useTheme';
import { APPEARANCES, useSettings } from '../../src/state/SettingsContext';
import { missingOperatorFields } from '../../src/logic/request';
import { radius, shadow, space, systemColor, type, emphasize } from '../../src/theme';

/**
 * Ajustes.
 *
 * Ordenado por con qué frecuencia se toca cada cosa: primero lo que se cambia
 * a menudo (aspecto, altura por defecto), luego el equipo, luego los datos de
 * operador —que se rellenan una vez y no se vuelven a mirar, así que van
 * plegados detrás de su propio estado— y al final el modo sin cobertura.
 */
export default function AjustesScreen() {
  const p = usePalette();
  const { operator, setOperator, flightHeight, setFlightHeight, appearance, setAppearance } =
    useSettings();
  const missing = missingOperatorFields(operator);
  const [openData, setOpenData] = React.useState(false);

  return (
    <ScreenScroll>
      <ScreenTitle title="Ajustes" />

      <Card>
        <SectionTitle>Preferencias</SectionTitle>

        <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.sm }]}>
          Aspecto
        </Text>
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

        <View style={{ marginVertical: space.lg }}>
          <Separator />
        </View>

        <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.sm }]}>
          Altura de vuelo por defecto
        </Text>
        <HeightControl value={flightHeight} onChange={setFlightHeight} />
      </Card>

      {/* Sin las reglas: aquí se viene a elegir el dron, no a estudiarlas.
          Salen enteras en Cuaderno → Normas. */}
      <DroneCard showRules={false} />

      {/* Se rellena una vez y se olvida: plegado, con su estado en la cabecera. */}
      <Card padded={false}>
        <Pressable
          onPress={() => setOpenData((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: openData }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            padding: space.lg,
            minHeight: 64,
            backgroundColor: pressed ? p.surfaceSunken : 'transparent',
          })}
        >
          <Ionicons name="person-outline" size={22} color={p.labelSecondary} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
              Tus datos
            </Text>
            <Text style={[emphasize(type.callout), { color: p.label }]}>
              Operador y aeronave
            </Text>
          </View>
          {missing.length > 0 ? (
            <Chip label={`Faltan ${missing.length}`} color={systemColor('orange', p)} />
          ) : (
            <Ionicons name="checkmark-circle" size={19} color={systemColor('green', p)} />
          )}
          <Chevron open={openData} color={p.labelTertiary} size={15} />
        </Pressable>

        <Collapsible open={openData}>
          <Separator inset={space.lg} />
          <View style={{ padding: space.lg, gap: space.md }}>
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              Se usan para redactar las solicitudes de autorización. Se guardan sólo en este móvil.
            </Text>

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

            <View style={{ marginTop: space.xs }}>
              <Separator />
            </View>

            <Field
              label="Modelo del dron"
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
            />

            {missing.length > 0 ? (
              <Text style={[type.caption, { color: p.labelTertiary }]}>
                Sin {missing.join(', ')}, las solicitudes saldrán con huecos marcados como
                [COMPLETAR].
              </Text>
            ) : null}
          </View>
        </Collapsible>
      </Card>

      <OfflineCard />

      <Text
        style={[
          type.caption,
          { color: p.labelTertiary, paddingHorizontal: space.xs, lineHeight: 17 },
        ]}
      >
        Nada de esto sale de tu móvil. La app no tiene servidor propio ni envía correos por su cuenta:
        abre tu aplicación de correo con el texto redactado para que lo mandes tú.
      </Text>
    </ScreenScroll>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
    </View>
  );
}
