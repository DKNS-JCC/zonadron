import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, type } from '../theme';
import { DRONE_PROFILES, getDroneProfile } from '../logic/drone';
import { useSettings } from '../state/SettingsContext';
import { Card, Chip, Divider, SectionTitle } from './ui';
import { Chevron, Collapsible } from './motion';

/**
 * Tarjeta "tu dron": elige el tipo de dron y enseña sólo las reglas generales
 * que te aplican a ti.
 *
 * No toca el veredicto en ningún caso: las zonas geográficas UAS aplican igual
 * a todos los drones, y decir lo contrario sería justo el tipo de error que esta
 * app no se puede permitir.
 */
export function DroneCard({ compact }: { compact?: boolean }) {
  const p = usePalette();
  const { drone, setDrone } = useSettings();
  const profile = getDroneProfile(drone);
  const [picking, setPicking] = useState(false);
  const [open, setOpen] = useState(!compact);

  if (profile.id === 'otro' && compact) return null;

  return (
    <Card padded={false}>
      <Pressable
        onPress={() => (compact ? setOpen((v) => !v) : setPicking((v) => !v))}
        accessibilityRole="button"
        accessibilityState={{ expanded: compact ? open : picking }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          padding: space.lg,
          minHeight: 60,
          backgroundColor: pressed ? p.accentSoft : 'transparent',
        })}
      >
        <Ionicons name="hardware-chip-outline" size={20} color={p.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[type.captionStrong, { color: p.textMuted }]}>TU DRON</Text>
          <Text style={[type.subtitle, { color: p.text }]}>{profile.label}</Text>
        </View>
        {profile.subcategory !== '—' ? (
          <Chip label={profile.subcategory} color={p.accent} filled />
        ) : null}
        <Chevron open={compact ? open : picking} color={p.textFaint} size={16} />
      </Pressable>

      {/* Selector */}
      <Collapsible open={picking}>
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm }}>
          {DRONE_PROFILES.map((d) => {
            const active = d.id === drone;
            return (
              <Pressable
                key={d.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setDrone(d.id);
                  setPicking(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  padding: space.md,
                  borderRadius: radius.md,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? p.accent : p.cardBorder,
                  backgroundColor: active ? p.accentSoft : 'transparent',
                  minHeight: 56,
                }}
              >
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={19}
                  color={active ? p.accent : p.textFaint}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodyStrong, { color: p.text }]}>{d.label}</Text>
                  <Text style={[type.caption, { color: p.textMuted }]}>{d.examples}</Text>
                </View>
                {d.subcategory !== '—' ? <Chip label={d.subcategory} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Collapsible>

      {/* Reglas que te aplican */}
      {profile.rules.length > 0 ? (
        <Collapsible open={compact ? open : !picking}>
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
            <Divider spaced={false} />
            <View style={{ paddingTop: space.md, gap: space.sm }}>
              <SectionTitle>Lo que te aplica a ti</SectionTitle>
              {profile.rules.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: space.sm + 2 }}>
                  <Text style={[type.body, { color: p.accent }]}>•</Text>
                  <Text style={[type.body, { color: p.text, flex: 1 }]}>{r}</Text>
                </View>
              ))}
              <Text style={[type.caption, { color: p.textFaint, marginTop: space.sm }]}>
                Las zonas geográficas UAS aplican igual a todos los drones: pesar poco no exime de
                ninguna. Esto sólo cambia las reglas generales que te enseña la app.
              </Text>
            </View>
          </View>
        </Collapsible>
      ) : null}
    </Card>
  );
}
