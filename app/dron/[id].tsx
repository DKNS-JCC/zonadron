import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { ScreenScroll } from '../../src/components/Screen';
import { Card, Chip, EmptyState, GhostButton, SectionTitle } from '../../src/components/ui';
import { Field } from '../../src/components/Field';
import { DocumentSection } from '../../src/components/DocumentSection';
import { usePalette } from '../../src/hooks/useTheme';
import { useFleet } from '../../src/state/FleetContext';
import { useDocuments } from '../../src/state/DocumentsContext';
import { droneName } from '../../src/logic/fleet';
import { droneProfiles } from '../../src/logic/drone';
import { emphasize, radius, space, systemColor, type } from '../../src/theme';
import { t } from '../../src/i18n';

/**
 * Ficha de un dron: sus datos y sus papeles.
 *
 * Se guarda según se escribe, como los ajustes: no hay botón de guardar que
 * puedas olvidarte de pulsar con el dron en la mano y la solicitud a medias.
 * Si entras a añadir uno y te vas sin poner nada, la ficha vacía se borra sola
 * en lugar de quedarse en la lista como «Dron sin nombre».
 */
export default function DronScreen() {
  const p = usePalette();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDrone, updateDrone, removeDrone, activeId, setActive } = useFleet();
  const { forOwner, removeForDrone } = useDocuments();

  const drone = getDrone(id);
  const docs = forOwner(id ?? null);
  const isActive = activeId === id;

  // El peso se teclea, así que se lleva aparte: mientras escribes «24» aún no
  // es un peso válido y no tiene sentido guardarlo ni borrarlo.
  const [weightText, setWeightText] = React.useState(
    drone?.weightGrams !== null && drone?.weightGrams !== undefined ? String(drone.weightGrams) : '',
  );

  // Una ficha en blanco que se abandona no debería quedarse en la lista. Se
  // mira al salir, con lo último que hubiera escrito.
  const latest = React.useRef({ drone, docs: docs.length, removeDrone });
  latest.current = { drone, docs: docs.length, removeDrone };
  React.useEffect(
    () => () => {
      const { drone: d, docs: n, removeDrone: remove } = latest.current;
      if (!d || n > 0) return;
      const blank =
        !d.alias.trim() &&
        !d.manufacturer.trim() &&
        !d.model.trim() &&
        !d.serial.trim() &&
        !d.notes.trim() &&
        d.weightGrams === null;
      if (blank) remove(d.id);
    },
    [],
  );

  if (!drone) {
    return (
      <>
        <Stack.Screen options={{ title: t('fleet.editTitle'), headerShown: true }} />
        <ScreenScroll>
          <EmptyState icon="hardware-chip-outline" title={t('fleet.unnamed')} />
        </ScreenScroll>
      </>
    );
  }

  const onWeightChange = (text: string) => {
    setWeightText(text);
    const clean = text.replace(',', '.').trim();
    if (!clean) {
      updateDrone(drone.id, { weightGrams: null });
      return;
    }
    const grams = Number(clean);
    if (Number.isFinite(grams) && grams > 0) updateDrone(drone.id, { weightGrams: Math.round(grams) });
  };

  const confirmDelete = () => {
    Alert.alert(t('fleet.delete'), t('fleet.deleteConfirm', droneName(drone)), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          // Primero los papeles, que borran archivos de disco, y luego la
          // ficha: al revés quedarían documentos apuntando a un dron que ya
          // no existe y no habría desde dónde borrarlos.
          removeForDrone(drone.id);
          removeDrone(drone.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: droneName(drone), headerShown: true }} />
      <ScreenScroll>
        <View style={{ gap: space.md }}>
          <SectionTitle
            right={isActive ? <Chip label={t('fleet.isActive')} color={p.tint} filled /> : null}
          >
            {t('fleet.editTitle')}
          </SectionTitle>
          <Card>
            <View style={{ gap: space.md }}>
              <Field
                label={t('fleet.field.alias')}
                value={drone.alias}
                onChange={(alias) => updateDrone(drone.id, { alias })}
                placeholder={t('fleet.field.aliasPlaceholder')}
                autoCapitalize="sentences"
              />
              <Field
                label={t('fleet.field.manufacturer')}
                value={drone.manufacturer}
                onChange={(manufacturer) => updateDrone(drone.id, { manufacturer })}
                placeholder="DJI"
                autoCapitalize="words"
              />
              <Field
                label={t('fleet.field.model')}
                value={drone.model}
                onChange={(model) => updateDrone(drone.id, { model })}
                placeholder="Mini 4 Pro"
              />
              <Field
                label={t('fleet.field.serial')}
                value={drone.serial}
                onChange={(serial) => updateDrone(drone.id, { serial })}
                placeholder={t('fleet.field.serialPlaceholder')}
                autoCapitalize="characters"
              />
              <Field
                label={t('fleet.field.weight')}
                value={weightText}
                onChange={onWeightChange}
                placeholder={t('fleet.field.weightPlaceholder')}
                keyboardType="numeric"
              />
              <Field
                label={t('fleet.field.notes')}
                value={drone.notes}
                onChange={(notes) => updateDrone(drone.id, { notes })}
                placeholder={t('fleet.field.notesPlaceholder')}
                autoCapitalize="sentences"
                multiline
              />
              <Text style={[type.caption, { color: p.labelTertiary }]}>{t('fleet.savedNote')}</Text>
            </View>
          </Card>
        </View>

        {/* Clase ------------------------------------------------------- */}
        <View style={{ gap: space.md }}>
          <SectionTitle>{t('fleet.class')}</SectionTitle>
          <Card padded={false}>
            <View style={{ padding: space.lg, gap: space.sm }}>
              {droneProfiles().map((d) => {
                const active = d.id === drone.profile;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      updateDrone(drone.id, { profile: d.id });
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
              <Text style={[type.caption, { color: p.labelTertiary, marginTop: space.xs }]}>
                {t('fleet.classNote')}
              </Text>
            </View>
          </Card>
        </View>

        {/* Dron activo -------------------------------------------------- */}
        {!isActive ? (
          <Card>
            <View style={{ gap: space.md }}>
              <Text style={[type.footnote, { color: p.labelSecondary }]}>{t('fleet.activeNote')}</Text>
              <GhostButton
                label={t('fleet.makeActive')}
                icon="checkmark-circle-outline"
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActive(drone.id);
                }}
              />
            </View>
          </Card>
        ) : null}

        {/* Papeles del aparato ------------------------------------------ */}
        <View style={{ gap: space.md }}>
          <SectionTitle>{t('fleet.docsTitle')}</SectionTitle>
          <Text style={[type.footnote, { color: p.labelSecondary, paddingHorizontal: space.xs }]}>
            {t('fleet.docsNote')}
          </Text>
          <DocumentSection droneId={drone.id} defaultCategory="dron" />
        </View>

        <Pressable
          onPress={confirmDelete}
          accessibilityRole="button"
          style={({ pressed }) => ({
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={[emphasize(type.callout), { color: systemColor('red', p) }]}>
            {t('fleet.delete')}
          </Text>
        </Pressable>
      </ScreenScroll>
    </>
  );
}
