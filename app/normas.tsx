import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScroll } from '../src/components/Screen';
import { Banner, Card, Separator, ScreenTitle, SectionTitle } from '../src/components/ui';
import { Chevron, Collapsible } from '../src/components/motion';
import { space, type, emphasize } from '../src/theme';
import { usePalette } from '../src/hooks/useTheme';
import { ruleSections, ruleSources } from '../src/logic/rules';
import { getLocale, t } from '../src/i18n';
import { SECTION_RELEVANCE } from '../src/logic/drone';
import { DroneCard } from '../src/components/DroneCard';
import { useSettings } from '../src/state/SettingsContext';
import { ELEVATION_SOURCE } from '../src/api/elevation';

export default function NormasScreen() {
  const p = usePalette();
  const { drone } = useSettings();
  // Se puede llegar aquí desde una tarjeta concreta ("qué dice el art. 40"),
  // y en ese caso la sección que se venía a leer ya viene abierta.
  const { seccion } = useLocalSearchParams<{ seccion?: string }>();
  const [open, setOpen] = useState<string | null>(seccion ?? null);
  const sections = ruleSections().filter((s) => (SECTION_RELEVANCE[s.id] ?? []).includes(drone));

  return (
    <>
      <Stack.Screen options={{ title: t('rules.title'), headerShown: true }} />
      <ScreenScroll>
        <ScreenTitle
          title={t('rules.title')}
          subtitle={t('rules.subtitle')}
        />

        <DroneCard compact />

        <View style={{ gap: space.md }}>
          {sections.map((section) => {
            const expanded = open === section.id;
            return (
              <Card key={section.id}>
                <Pressable
                  onPress={() => setOpen(expanded ? null : section.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 40 }}
                >
                  <Ionicons name={section.icon as any} size={22} color={p.labelSecondary} />
                  <Text style={[emphasize(type.callout), { color: p.label, flex: 1 }]}>
                    {section.title}
                  </Text>
                  <Chevron open={expanded} color={p.labelTertiary} size={15} />
                </Pressable>

                <Collapsible open={expanded}>
                  <View style={{ paddingTop: space.md, gap: space.md }}>
                    <Text style={[type.callout, { color: p.labelSecondary }]}>{section.intro}</Text>
                    <View style={{ gap: space.sm }}>
                      {section.bullets.map((b, i) => (
                        <View key={i} style={{ flexDirection: 'row', gap: space.sm + 2 }}>
                          <Text style={[type.callout, { color: p.labelTertiary }]}>•</Text>
                          <Text style={[type.callout, { color: p.label, flex: 1 }]}>{b}</Text>
                        </View>
                      ))}
                    </View>
                    <Separator />
                    <Pressable
                      onPress={() => Linking.openURL(section.sourceUrl).catch(() => {})}
                      accessibilityRole="link"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 }}
                    >
                      <Ionicons name="open-outline" size={15} color={p.tint} />
                      <Text style={[emphasize(type.footnote), { color: p.tint, flex: 1 }]}>
                        {section.source}
                      </Text>
                    </Pressable>
                  </View>
                </Collapsible>
              </Card>
            );
          })}
        </View>

        <Card>
          <SectionTitle>{t('rules.dataTitle')}</SectionTitle>
          <Text style={[type.callout, { color: p.label }]}>{t('rules.dataBody')}</Text>
          <View style={{ marginVertical: space.md }}>
            <Separator />
          </View>
          <Text style={[type.footnote, { color: p.labelSecondary }]}>
            {t('rules.dataElevation', ELEVATION_SOURCE)}
          </Text>
          <View style={{ marginVertical: space.md }}>
            <Separator />
          </View>
          <View style={{ gap: space.xs }}>
            {ruleSources().map((s) => (
              <Pressable
                key={s.url}
                onPress={() => Linking.openURL(s.url).catch(() => {})}
                accessibilityRole="link"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  minHeight: 38,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons name="link-outline" size={15} color={p.tint} />
                <Text style={[emphasize(type.footnote), { color: p.tint, flex: 1 }]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* En inglés conviene decirlo: el resumen está traducido, la norma no. */}
        {getLocale() === 'en' ? (
          <Text style={[type.footnote, { color: p.labelTertiary }]}>
            {t('rules.spanishSources')}
          </Text>
        ) : null}

        <Banner tone="warn">{t('rules.disclaimer')}</Banner>
      </ScreenScroll>
    </>
  );
}
