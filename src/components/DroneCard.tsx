import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, type, emphasize } from '../theme';
import { droneProfiles, getDroneProfile } from '../logic/drone';
import { droneName, droneSubtitle } from '../logic/fleet';
import { t } from '../i18n';
import { useSettings } from '../state/SettingsContext';
import { useFleet } from '../state/FleetContext';
import { Card, Chip, Separator } from './ui';
import { Chevron, Collapsible } from './motion';

/**
 * Tarjeta "tu dron": con cuál vuelas ahora mismo, y las reglas generales que
 * te aplican por serlo.
 *
 * Con la flota guardada, elegir dron es elegir *tu* dron —el Mini, el Air— y
 * no una clase abstracta: la clase viene con él. Mientras no haya ninguno
 * guardado se sigue eligiendo la clase a mano, que es lo que había antes y
 * funciona sin haber rellenado nada.
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
  const router = useRouter();
  const { drone, setDrone } = useSettings();
  const { drones, activeId, activeDrone, setActive } = useFleet();
  const profile = getDroneProfile(activeDrone ? activeDrone.profile : drone);
  const [picking, setPicking] = useState(false);
  const [open, setOpen] = useState(!compact);

  if (profile.id === 'otro' && compact && !activeDrone) return null;

  const title = activeDrone ? droneName(activeDrone) : profile.label;
  const subtitle = activeDrone ? droneSubtitle(activeDrone) : null;

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
          <Text style={[emphasize(type.callout), { color: p.label }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {profile.subcategory !== '—' ? (
          <Chip label={profile.subcategory} color={p.tint} filled />
        ) : null}
        <Chevron open={compact ? open : picking} color={p.labelTertiary} size={15} />
      </Pressable>

      {/* Selector: tus drones si los hay, y si no, la clase a secas. */}
      <Collapsible open={picking}>
        <Separator inset={space.lg} />
        <View style={{ padding: space.lg, gap: space.sm }}>
          {drones.length > 0 ? (
            <>
              <Text style={[type.footnote, { color: p.labelSecondary, marginBottom: space.xs }]}>
                {t('fleet.pickTitle')}
              </Text>
              {drones.map((d) => {
                const active = d.id === activeId;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setActive(d.id);
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
                      <Text style={[emphasize(type.callout), { color: p.label }]} numberOfLines={1}>
                        {droneName(d)}
                      </Text>
                      <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
                        {droneSubtitle(d)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </>
          ) : (
            droneProfiles().map((d) => {
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
            })
          )}

          {/* La ficha completa —serie, peso, papeles— vive en el perfil. */}
          <Pressable
            onPress={() => {
              setPicking(false);
              router.push('/perfil');
            }}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              minHeight: 44,
              paddingHorizontal: space.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons
              name={drones.length > 0 ? 'settings-outline' : 'add-circle-outline'}
              size={16}
              color={p.tint}
            />
            <Text style={[emphasize(type.subheadline), { color: p.tint }]}>
              {drones.length > 0 ? t('fleet.manage') : t('fleet.addFirst')}
            </Text>
          </Pressable>
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
