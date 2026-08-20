import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, type, emphasize } from '../theme';
import { droneProfiles, getDroneProfile } from '../logic/drone';
import { t } from '../i18n';
import { useSettings } from '../state/SettingsContext';
import { Card, Chip, Separator } from './ui';
import { Chevron, Collapsible } from './motion';

/**
 * Tarjeta "tu dron": elige el tipo de dron y enseña sólo las reglas generales
 * que te aplican a ti.
 *
 * No toca el veredicto en ningún caso: las zonas geográficas UAS aplican igual
 * a todos los drones, y decir lo contrario sería justo el tipo de error que esta
 * app no se puede permitir.
 */
export function DroneCard({
  compact,
  showRules = true,
}: {
  compact?: boolean;
  /**
   * En Ajustes lo que se viene a hacer es *elegir* el dron; las reglas que te
   * aplican son material de consulta y ya están en Normas, así que allí se
   * omiten para no convertir la pantalla en un muro de texto.
   */
  showRules?: boolean;
}) {
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
          minHeight: 64,
          backgroundColor: pressed ? p.surfaceSunken : 'transparent',
        })}
      >
        <Ionicons name="hardware-chip-outline" size={22} color={p.labelSecondary} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
            {t('droneCard.title')}
          </Text>
          <Text style={[emphasize(type.callout), { color: p.label }]}>{profile.label}</Text>
        </View>
        {profile.subcategory !== '—' ? (
          <Chip label={profile.subcategory} color={p.tint} filled />
        ) : null}
        <Chevron open={compact ? open : picking} color={p.labelTertiary} size={15} />
      </Pressable>

      {/* Selector */}
      <Collapsible open={picking}>
        <Separator inset={space.lg} />
        <View style={{ padding: space.lg, gap: space.sm }}>
          {droneProfiles().map((d) => {
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
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  padding: space.md,
                  borderRadius: radius.md,
                  backgroundColor: active ? p.tintSoft : pressed ? p.surfaceSunken : 'transparent',
                  minHeight: 56,
                })}
              >
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? p.tint : p.labelTertiary}
                />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={[emphasize(type.callout), { color: p.label }]}>{d.label}</Text>
                  <Text style={[type.footnote, { color: p.labelSecondary }]}>{d.examples}</Text>
                </View>
                {d.subcategory !== '—' ? <Chip label={d.subcategory} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Collapsible>

      {/* Reglas que te aplican */}
      {showRules && profile.rules.length > 0 ? (
        <Collapsible open={compact ? open : !picking}>
          <Separator inset={space.lg} />
          <View style={{ padding: space.lg, gap: space.md }}>
            <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
              {t('droneCard.rulesTitle')}
            </Text>
            <View style={{ gap: space.sm }}>
              {profile.rules.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: space.sm + 2 }}>
                  <Text style={[type.callout, { color: p.labelTertiary }]}>•</Text>
                  <Text style={[type.callout, { color: p.label, flex: 1 }]}>{r}</Text>
                </View>
              ))}
            </View>
            <Text style={[type.footnote, { color: p.labelTertiary }]}>
              {t('droneCard.disclaimer')}
            </Text>
          </View>
        </Collapsible>
      ) : null}
    </Card>
  );
}
