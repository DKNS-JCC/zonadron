import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenScroll } from '../src/components/Screen';
import { Card, Chip, ScreenTitle, SectionTitle, Separator } from '../src/components/ui';
import { Field } from '../src/components/Field';
import { DocumentSection } from '../src/components/DocumentSection';
import { usePalette } from '../src/hooks/useTheme';
import { useSettings } from '../src/state/SettingsContext';
import { useFleet } from '../src/state/FleetContext';
import { useDocuments } from '../src/state/DocumentsContext';
import { droneName, droneSubtitle } from '../src/logic/fleet';
import { missingOperatorFields } from '../src/logic/request';
import { emphasize, space, systemColor, type } from '../src/theme';
import { t } from '../src/i18n';

/**
 * Perfil: quién eres, qué vuelas y qué papeles llevas.
 *
 * Los tres bloques responden a las tres cosas que te pueden pedir en el campo,
 * y en ese orden: el operador (que eres tú), la flota (cada dron con su serie)
 * y la carpeta de documentos. Todo se guarda según se escribe y todo se queda
 * en este móvil.
 */
export default function PerfilScreen() {
  const p = usePalette();
  const router = useRouter();
  const { operator, setOperator } = useSettings();
  const { drones, activeId, addDrone } = useFleet();
  const { expiring } = useDocuments();
  const missing = missingOperatorFields(operator);

  const nuevoDron = () => {
    const created = addDrone();
    router.push({ pathname: '/dron/[id]', params: { id: created.id } });
  };

  return (
    <>
      <Stack.Screen options={{ title: t('profile.title'), headerShown: true }} />
      <ScreenScroll>
        <ScreenTitle title={t('profile.title')} subtitle={t('profile.subtitle')} />

        {expiring.length > 0 ? (
          <Card>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <Ionicons name="alert-circle" size={20} color={systemColor('orange', p)} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[emphasize(type.callout), { color: p.label }]}>
                  {t('docs.alertsTitle')}
                </Text>
                <Text style={[type.footnote, { color: p.labelSecondary }]}>
                  {t('profile.alerts', expiring.length)}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Operador ---------------------------------------------------- */}
        <View style={{ gap: space.md }}>
          <SectionTitle
            right={
              missing.length > 0 ? (
                <Chip label={t('settings.missing', missing.length)} color={systemColor('orange', p)} />
              ) : null
            }
          >
            {t('profile.operator')}
          </SectionTitle>
          <Card>
            <View style={{ gap: space.md }}>
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
            </View>
          </Card>
        </View>

        {/* Flota ------------------------------------------------------- */}
        <View style={{ gap: space.md }}>
          <SectionTitle
            right={
              drones.length > 0 ? (
                <Text style={[type.caption, { color: p.labelTertiary }]}>
                  {t('profile.fleetCount', drones.length)}
                </Text>
              ) : null
            }
          >
            {t('profile.fleet')}
          </SectionTitle>
          <Card padded={false}>
            {drones.length === 0 ? (
              <View style={{ padding: space.lg }}>
                <Text style={[type.callout, { color: p.labelSecondary }]}>
                  {t('profile.fleetEmpty')}
                </Text>
              </View>
            ) : (
              drones.map((d, i) => (
                <View key={d.id}>
                  {i > 0 ? <Separator inset={space.lg} /> : null}
                  <Pressable
                    onPress={() => router.push({ pathname: '/dron/[id]', params: { id: d.id } })}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      padding: space.lg,
                      minHeight: 64,
                      backgroundColor: pressed ? p.surfaceSunken : 'transparent',
                    })}
                  >
                    <Ionicons name="hardware-chip-outline" size={22} color={p.labelSecondary} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={[emphasize(type.callout), { color: p.label }]} numberOfLines={1}>
                        {droneName(d)}
                      </Text>
                      <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
                        {droneSubtitle(d)}
                      </Text>
                    </View>
                    {d.id === activeId ? <Chip label={t('fleet.isActive')} color={p.tint} filled /> : null}
                    <Ionicons name="chevron-forward" size={15} color={p.labelTertiary} />
                  </Pressable>
                </View>
              ))
            )}

            <Separator inset={space.lg} />
            <Pressable
              onPress={nuevoDron}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                padding: space.lg,
                minHeight: 56,
                backgroundColor: pressed ? p.surfaceSunken : 'transparent',
              })}
            >
              <Ionicons name="add-circle-outline" size={22} color={p.tint} />
              <Text style={[emphasize(type.callout), { color: p.tint }]}>{t('profile.addDrone')}</Text>
            </Pressable>
          </Card>
        </View>

        {/* Documentos del piloto --------------------------------------- */}
        <View style={{ gap: space.md }}>
          <SectionTitle>{t('profile.documents')}</SectionTitle>
          <Text
            style={[type.footnote, { color: p.labelSecondary, paddingHorizontal: space.xs }]}
          >
            {t('profile.documentsNote')}
          </Text>
          <DocumentSection droneId={null} defaultCategory="piloto" />
        </View>

        <Text
          style={[
            type.caption,
            { color: p.labelTertiary, paddingHorizontal: space.xs, lineHeight: 17 },
          ]}
        >
          {t('docs.privacy')}
        </Text>
      </ScreenScroll>
    </>
  );
}
