import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScroll } from '../../src/components/Screen';
import { Banner, Card, Divider, ScreenTitle, SectionTitle } from '../../src/components/ui';
import { Chevron, Collapsible } from '../../src/components/motion';
import { space, type } from '../../src/theme';
import { usePalette } from '../../src/hooks/useTheme';
import { RULE_SECTIONS, SOURCES } from '../../src/logic/rules';
import { SECTION_RELEVANCE } from '../../src/logic/drone';
import { DroneCard } from '../../src/components/DroneCard';
import { useSettings } from '../../src/state/SettingsContext';
import { ELEVATION_SOURCE } from '../../src/api/elevation';

export default function InfoScreen() {
  const p = usePalette();
  const { drone } = useSettings();
  const [open, setOpen] = useState<string | null>(null);
  const sections = RULE_SECTIONS.filter((s) => (SECTION_RELEVANCE[s.id] ?? []).includes(drone));

  return (
    <ScreenScroll>
      <ScreenTitle
        title="Normas y fuentes"
        subtitle="Lo esencial de la normativa española y europea, y de dónde sale cada dato de esta app."
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
                <Ionicons name={section.icon as any} size={20} color={p.accent} />
                <Text style={[type.subtitle, { color: p.text, flex: 1 }]}>{section.title}</Text>
                <Chevron open={expanded} color={p.textFaint} />
              </Pressable>

              <Collapsible open={expanded}>
                <View style={{ paddingTop: space.md, gap: space.md }}>
                  <Text style={[type.body, { color: p.textMuted }]}>{section.intro}</Text>
                  <View style={{ gap: space.sm }}>
                    {section.bullets.map((b, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: space.sm + 2 }}>
                        <Text style={[type.body, { color: p.accent }]}>•</Text>
                        <Text style={[type.body, { color: p.text, flex: 1 }]}>{b}</Text>
                      </View>
                    ))}
                  </View>
                  <Divider spaced={false} />
                  <Pressable
                    onPress={() => Linking.openURL(section.sourceUrl).catch(() => {})}
                    accessibilityRole="link"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 }}
                  >
                    <Ionicons name="open-outline" size={15} color={p.accent} />
                    <Text style={[type.caption, { color: p.accent, flex: 1 }]}>{section.source}</Text>
                  </Pressable>
                </View>
              </Collapsible>
            </Card>
          );
        })}
      </View>

      <Card>
        <SectionTitle>De dónde salen los datos</SectionTitle>
        <Text style={[type.body, { color: p.text }]}>
          Las zonas se consultan en tiempo real al servicio oficial de ENAIRE (Zonas Geográficas UAS,
          formato ED-318). La app no guarda una copia propia de las zonas ni pasa por ningún servidor
          intermedio: el móvil habla directamente con ENAIRE, así que siempre ves el dato vigente.
        </Text>
        <Divider />
        <Text style={[type.caption, { color: p.textMuted }]}>
          La elevación del terreno viene de {ELEVATION_SOURCE} y se usa para convertir los límites
          referidos al nivel del mar en altura real sobre el suelo. La búsqueda de lugares usa
          OpenStreetMap.
        </Text>
        <Divider />
        <View style={{ gap: space.xs }}>
          {SOURCES.map((s) => (
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
              <Ionicons name="link-outline" size={15} color={p.accent} />
              <Text style={[type.caption, { color: p.accent, flex: 1, textDecorationLine: 'underline' }]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Banner tone="warn">
        Esta aplicación es una herramienta de consulta independiente. No sustituye a los servicios
        oficiales de ENAIRE ni a la normativa: la responsabilidad de comprobar que un vuelo es legal
        y seguro es siempre del piloto. Comprueba también los NOTAM antes de volar.
      </Banner>
    </ScreenScroll>
  );
}
