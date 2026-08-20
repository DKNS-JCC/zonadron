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
import {
  APPEARANCES,
  appearanceLabel,
  LANGUAGES,
  languageLabel,
  useSettings,
} from '../../src/state/SettingsContext';
import { t } from '../../src/i18n';
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
  const {
    operator,
    setOperator,
    flightHeight,
    setFlightHeight,
    appearance,
    setAppearance,
    language,
    setLanguage,
  } = useSettings();
  const missing = missingOperatorFields(operator);
  const [openData, setOpenData] = React.useState(false);

  return (
    <ScreenScroll>
      <ScreenTitle title={t('settings.title')} />

      <Card>
        <SectionTitle>{t('settings.preferences')}</SectionTitle>

        <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.sm }]}>
          {t('settings.appearance')}
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
                accessibilityLabel={t('settings.appearanceA11y', appearanceLabel(a.id))}
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
                  {appearanceLabel(a.id)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginVertical: space.lg }}>
          <Separator />
        </View>

        {/* Idioma. El nombre de cada uno va escrito en su propio idioma: es lo
            único que se puede leer estando en el idioma equivocado. */}
        <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.sm }]}>
          {t('settings.language')}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            gap: 2,
            backgroundColor: p.surfaceSunken,
            borderRadius: 10,
            padding: 2,
          }}
        >
          {LANGUAGES.map((l) => {
            const active = language === l.id;
            return (
              <Pressable
                key={l.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setLanguage(l.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('settings.languageA11y', languageLabel(l.id))}
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
                  name={l.icon as keyof typeof Ionicons.glyphMap}
                  size={17}
                  color={active ? p.tint : p.labelSecondary}
                />
                <Text
                  style={[
                    emphasize(type.caption, active ? '600' : '500'),
                    { color: active ? p.label : p.labelSecondary },
                  ]}
                >
                  {languageLabel(l.id)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[type.caption, { color: p.labelTertiary, marginTop: space.sm }]}>
          {t('settings.languageNote')}
        </Text>

        <View style={{ marginVertical: space.lg }}>
          <Separator />
        </View>

        <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.sm }]}>
          {t('settings.defaultHeight')}
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
              {t('settings.yourData')}
            </Text>
            <Text style={[emphasize(type.callout), { color: p.label }]}>
              {t('settings.operatorAndAircraft')}
            </Text>
          </View>
          {missing.length > 0 ? (
            <Chip label={t('settings.missing', missing.length)} color={systemColor('orange', p)} />
          ) : (
            <Ionicons name="checkmark-circle" size={19} color={systemColor('green', p)} />
          )}
          <Chevron open={openData} color={p.labelTertiary} size={15} />
        </Pressable>

        <Collapsible open={openData}>
          <Separator inset={space.lg} />
          <View style={{ padding: space.lg, gap: space.md }}>
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              {t('settings.dataNote')}
            </Text>

            <Field
              label={t('settings.field.name')}
              value={operator.name}
              onChange={(name) => setOperator({ name })}
              placeholder={t('settings.field.namePlaceholder')}
              autoCapitalize="words"
            />
            <Field
              label={t('settings.field.uas')}
              value={operator.uasNumber}
              onChange={(uasNumber) => setOperator({ uasNumber })}
              placeholder="ESAxxxxxxxxxxxx"
              autoCapitalize="characters"
            />
            <Field
              label={t('settings.field.email')}
              value={operator.email}
              onChange={(email) => setOperator({ email })}
              placeholder={t('settings.field.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label={t('settings.field.phone')}
              value={operator.phone}
              onChange={(phone) => setOperator({ phone })}
              placeholder="+34 600 000 000"
              keyboardType="phone-pad"
            />

            <View style={{ marginTop: space.xs }}>
              <Separator />
            </View>

            <Field
              label={t('settings.field.droneModel')}
              value={operator.droneModel}
              onChange={(droneModel) => setOperator({ droneModel })}
              placeholder="DJI Mini 2"
            />
            <Field
              label={t('settings.field.droneSerial')}
              value={operator.droneSerial}
              onChange={(droneSerial) => setOperator({ droneSerial })}
              placeholder={t('settings.field.droneSerialPlaceholder')}
              autoCapitalize="characters"
            />

            {missing.length > 0 ? (
              <Text style={[type.caption, { color: p.labelTertiary }]}>
                {t('settings.missingNote', missing.join(', '))}
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
        {t('settings.privacy')}
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
