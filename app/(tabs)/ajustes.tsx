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
import { getLocale, t } from '../../src/i18n';
// La versión sale de donde se decide, no de lo que el entorno crea recordar:
// `Constants.expoConfig` devuelve un valor por defecto cuando la app corre en
// el navegador, y una versión equivocada en la pantalla de ajustes es justo lo
// que se mira cuando alguien reporta un fallo.
import appConfig from '../../app.json';
import { missingOperatorFields } from '../../src/logic/request';
import { useDocuments } from '../../src/state/DocumentsContext';
import { SUPPORT_URL, supportAvailable } from '../../src/logic/support';
import {
  ACCENT_IDS,
  accentColor,
  emphasize,
  shadow,
  space,
  systemColor,
  type,
} from '../../src/theme';

/**
 * Ajustes.
 *
 * Ordenado por a qué vienes: primero lo que cambia una consulta —con qué dron
 * vuelas y a qué altura—, luego tus datos, luego el modo sin cobertura, y al
 * final lo que se toca una vez en la vida: el aspecto, el idioma y las cuatro
 * cosas que hay que saber de la app.
 *
 * Y sin párrafos debajo de cada control. Un ajuste que necesita tres líneas de
 * explicación es un ajuste mal puesto: o se entiende con su nombre y con lo que
 * enseña, o sobra. Lo que sí hay que contar —cómo funciona el modo sin
 * cobertura, qué se guarda y qué no— vive donde se lee de verdad: en su propia
 * tarjeta y en la política de privacidad.
 */

/** La política publicada, en el idioma que esté usando la app. */
function privacyUrl(): string {
  const base = 'https://dkns-jcc.github.io/zonadron';
  return getLocale() === 'en' ? `${base}/privacy` : `${base}/privacidad`;
}

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
  const version = appConfig.expo.version;

  return (
    <ScreenScroll>
      <ScreenTitle title={t('settings.title')} />

      {/* Vuelo: lo único de esta pantalla que cambia un resultado. */}
      <View style={{ gap: space.md }}>
        <SectionTitle>{t('settings.section.flight')}</SectionTitle>

        {/* Sin las reglas: aquí se viene a elegir el dron, no a estudiarlas.
            Salen enteras en Cuaderno → Normas. */}
        <DroneCard showRules={false} />

        <Card>
          <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.sm }]}>
            {t('settings.defaultHeight')}
          </Text>
          <HeightControl value={flightHeight} onChange={setFlightHeight} />
        </Card>
      </View>

      {/* Tus datos: operador, flota y papeles, cada uno en su pantalla. */}
      <View style={{ gap: space.md }}>
        <SectionTitle>{t('settings.yourData')}</SectionTitle>
        <Card padded={false}>
          <Row
            icon="person-outline"
            title={t('profile.settingsRow')}
            hint={t('profile.settingsHint')}
            onPress={() => router.push('/perfil')}
            right={
              <>
                {expiring.length > 0 ? (
                  <Chip
                    label={String(expiring.length)}
                    icon="alert-circle"
                    color={systemColor('orange', p)}
                  />
                ) : null}
                {missing.length > 0 ? (
                  <Chip
                    label={t('settings.missing', missing.length)}
                    color={systemColor('orange', p)}
                  />
                ) : (
                  <Ionicons name="checkmark-circle" size={19} color={systemColor('green', p)} />
                )}
              </>
            }
          />
        </Card>
      </View>

      <OfflineCard />

      {/* Aspecto e idioma: se tocan una vez y se olvidan, así que van abajo. */}
      <View style={{ gap: space.md }}>
        <SectionTitle>{t('settings.section.look')}</SectionTitle>
        <Card>
          <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.sm }]}>
            {t('settings.appearance')}
          </Text>
          <Segmented
            options={APPEARANCES.map((a) => ({
              id: a.id,
              icon: a.icon,
              label: appearanceLabel(a.id),
              a11y: t('settings.appearanceA11y', appearanceLabel(a.id)),
            }))}
            value={appearance}
            onChange={setAppearance}
          />

          <View style={{ marginVertical: space.lg }}>
            <Separator />
          </View>

          {/* Los colores se enseñan pintados, no por su nombre: nadie elige
              «turquesa» leyéndolo, se elige viéndolo. */}
          <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.sm }]}>
            {t('settings.accent')}
          </Text>
          {/* Centrados: cinco círculos no llenan el ancho, y alineados a la
              izquierda dejaban un hueco que parecía que faltaba algo. */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.md }}>
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

          <View style={{ marginVertical: space.lg }}>
            <Separator />
          </View>

          {/* El nombre de cada idioma va escrito en su propio idioma: es lo
              único que se puede leer estando en el idioma equivocado. */}
          <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.sm }]}>
            {t('settings.language')}
          </Text>
          <Segmented
            options={LANGUAGES.map((l) => ({
              id: l.id,
              icon: l.icon,
              label: languageLabel(l.id),
              a11y: t('settings.languageA11y', languageLabel(l.id)),
            }))}
            value={language}
            onChange={setLanguage}
          />
          {/* La única nota que sobrevive en toda la pantalla: quien pone la app
              en inglés tiene que saber por qué las zonas siguen en español. */}
          <Text style={[type.caption, { color: p.labelTertiary, marginTop: space.sm }]}>
            {t('settings.languageNote')}
          </Text>
        </Card>
      </View>

      {/* La app. */}
      <View style={{ gap: space.md }}>
        <SectionTitle>{t('settings.section.app')}</SectionTitle>
        <Card padded={false}>
          {supportAvailable() ? (
            <>
              <Row
                icon="cafe-outline"
                title={t('support.title')}
                hint={t('support.body')}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  Linking.openURL(SUPPORT_URL).catch(() => {});
                }}
                external
              />
              <Separator inset={space.lg} />
            </>
          ) : null}

          <Row
            icon="lock-closed-outline"
            title={t('settings.privacyRow')}
            hint={t('settings.privacyHint')}
            onPress={() => Linking.openURL(privacyUrl()).catch(() => {})}
            external
          />

          {version ? (
            <>
              <Separator inset={space.lg} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  padding: space.lg,
                  minHeight: 52,
                }}
              >
                <Ionicons name="information-circle-outline" size={22} color={p.labelTertiary} />
                <Text style={[type.footnote, { color: p.labelTertiary }]}>
                  {t('settings.version', version)}
                </Text>
              </View>
            </>
          ) : null}
        </Card>
      </View>
    </ScreenScroll>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */

/** Fila de lista: icono, nombre, una línea de contexto y a dónde lleva. */
function Row({
  icon,
  title,
  hint,
  onPress,
  right,
  external,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint?: string;
  onPress: () => void;
  right?: React.ReactNode;
  /** Se va de la app: la flecha lo dice antes de tocar. */
  external?: boolean;
}) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={external ? 'link' : 'button'}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.lg,
        minHeight: 60,
        backgroundColor: pressed ? p.surfaceSunken : 'transparent',
      })}
    >
      <Ionicons name={icon} size={22} color={p.labelSecondary} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[emphasize(type.callout), { color: p.label }]}>{title}</Text>
        {hint ? <Text style={[type.footnote, { color: p.labelSecondary }]}>{hint}</Text> : null}
      </View>
      {right}
      <Ionicons
        name={external ? 'open-outline' : 'chevron-forward'}
        size={external ? 16 : 15}
        color={p.labelTertiary}
      />
    </Pressable>
  );
}

/** Control segmentado del sistema: pista hundida y pastilla elevada. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; icon: string; label: string; a11y: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 2,
        backgroundColor: p.surfaceSunken,
        borderRadius: 10,
        padding: 2,
      }}
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.a11y}
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
              name={o.icon as keyof typeof Ionicons.glyphMap}
              size={17}
              color={active ? p.tint : p.labelSecondary}
            />
            <Text
              style={[
                emphasize(type.caption, active ? '600' : '500'),
                { color: active ? p.label : p.labelSecondary },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
