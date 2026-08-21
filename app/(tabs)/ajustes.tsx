import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScroll } from '../../src/components/Screen';
import { Card, Chip, ScreenTitle, SectionTitle, Separator } from '../../src/components/ui';
import { DroneCard } from '../../src/components/DroneCard';
import { OfflineCard } from '../../src/components/OfflineCard';
import { HeightControl } from '../../src/components/HeightControl';
import { usePalette } from '../../src/hooks/useTheme';
import {
  accentLabel,
  APPEARANCES,
  appearanceLabel,
  LANGUAGES,
  languageLabel,
  useSettings,
} from '../../src/state/SettingsContext';
import { t } from '../../src/i18n';
import { missingOperatorFields } from '../../src/logic/request';
import { useDocuments } from '../../src/state/DocumentsContext';
import { SUPPORT_URL, supportAvailable } from '../../src/logic/support';
import {
  ACCENT_IDS,
  accentColor,
  radius,
  shadow,
  space,
  systemColor,
  type,
  emphasize,
} from '../../src/theme';

/**
 * Ajustes.
 *
 * Ordenado por con qué frecuencia se toca cada cosa: primero lo que se cambia
 * a menudo (aspecto, altura por defecto), luego con qué dron vuelas, luego la
 * puerta al perfil —los datos de operador, la flota y los papeles, que se
 * rellenan una vez y se consultan de higos a brevas— y al final el modo sin
 * cobertura.
 */
export default function AjustesScreen() {
  const p = usePalette();
  const {
    operator,
    flightHeight,
    setFlightHeight,
    appearance,
    setAppearance,
    language,
    setLanguage,
    accent,
    setAccent,
  } = useSettings();
  const { expiring } = useDocuments();
  const router = useRouter();
  const missing = missingOperatorFields(operator);

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

        {/* Acento. Los colores se enseñan pintados, no por su nombre: nadie
            elige «morado» leyéndolo, se elige viéndolo. */}
        <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.sm }]}>
          {t('settings.accent')}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {ACCENT_IDS.map((a) => {
            const color = accentColor(a, p.scheme);
            const active = accent === a;
            return (
              <Pressable
                key={a}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setAccent(a);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('settings.accentA11y', accentLabel(a))}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  // El seleccionado lleva un aro de su propio color, separado
                  // por el fondo: se ve cuál es sin taparlo con una marca.
                  borderWidth: active ? 2 : 0,
                  borderColor: active ? color : 'transparent',
                }}
              >
                <View
                  style={{
                    width: active ? 26 : 30,
                    height: active ? 26 : 30,
                    borderRadius: 15,
                    backgroundColor: color,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
        <Text style={[type.caption, { color: p.labelTertiary, marginTop: space.sm }]}>
          {t('settings.accentNote')}
        </Text>

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

      {/* Perfil: operador, drones y papeles. Antes era un desplegable aquí
          dentro; con varios drones y su carpeta de documentos ya no cabe en
          una tarjeta, así que tiene pantalla propia. */}
      <Card padded={false}>
        <Pressable
          onPress={() => router.push('/perfil')}
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
          <Ionicons name="person-outline" size={22} color={p.labelSecondary} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
              {t('settings.yourData')}
            </Text>
            <Text style={[emphasize(type.callout), { color: p.label }]}>
              {t('profile.settingsRow')}
            </Text>
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              {t('profile.settingsHint')}
            </Text>
          </View>
          {expiring.length > 0 ? (
            <Chip
              label={String(expiring.length)}
              icon="alert-circle"
              color={systemColor('orange', p)}
            />
          ) : null}
          {missing.length > 0 ? (
            <Chip label={t('settings.missing', missing.length)} color={systemColor('orange', p)} />
          ) : (
            <Ionicons name="checkmark-circle" size={19} color={systemColor('green', p)} />
          )}
          <Ionicons name="chevron-forward" size={15} color={p.labelTertiary} />
        </Pressable>
      </Card>

      <OfflineCard />

      {/* Un café, si te apetece. Nada que desbloquear: ver src/logic/support.ts. */}
      {supportAvailable() ? (
        <Card>
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Ionicons name="cafe-outline" size={22} color={p.labelSecondary} />
              <Text style={[emphasize(type.callout), { color: p.label, flex: 1 }]}>
                {t('support.title')}
              </Text>
            </View>
            <Text style={[type.footnote, { color: p.labelSecondary }]}>{t('support.body')}</Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                Linking.openURL(SUPPORT_URL).catch(() => {});
              }}
              accessibilityRole="link"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
                minHeight: 44,
                borderRadius: radius.md,
                backgroundColor: p.tintSoft,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name="open-outline" size={16} color={p.tint} />
              <Text style={[emphasize(type.subheadline), { color: p.tint }]}>
                {t('support.button')}
              </Text>
            </Pressable>
            <Text style={[type.caption, { color: p.labelTertiary }]}>{t('support.note')}</Text>
          </View>
        </Card>
      ) : null}

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
