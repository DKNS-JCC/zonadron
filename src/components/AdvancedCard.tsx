import React from 'react';
import { Switch, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, type, emphasize } from '../theme';
import { useSettings } from '../state/SettingsContext';
import { Card, SectionTitle } from './ui';

/** Funciones que dependen del paquete descargado. */
export function AdvancedCard() {
  const p = usePalette();
  const { showCoverage, setShowCoverage } = useSettings();

  return (
    <Card>
      <SectionTitle>Funciones avanzadas</SectionTitle>

      <Toggle
        icon="grid-outline"
        title="Mapa de altura libre"
        description="Pinta el mapa por colores según hasta qué altura puedes subir en cada punto sin pedir permiso. Se calcula en el móvil."
        value={showCoverage}
        onChange={setShowCoverage}
      />

      <View
        style={{
          flexDirection: 'row',
          gap: space.sm,
          backgroundColor: p.surfaceSunken,
          borderRadius: radius.md,
          padding: space.md,
          marginTop: space.lg,
        }}
      >
        <Ionicons name="information-circle" size={17} color={p.labelSecondary} style={{ marginTop: 1 }} />
        <Text style={[type.footnote, { color: p.label, flex: 1 }]}>
          Necesita la zona descargada aquí arriba: hace miles de comprobaciones y eso no se le puede
          pedir a ENAIRE una por una.
        </Text>
      </View>
    </Card>
  );
}

function Toggle({
  icon,
  title,
  description,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 }}>
      <Ionicons name={icon} size={22} color={p.labelSecondary} style={{ marginTop: 2, alignSelf: 'flex-start' }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[emphasize(type.callout), { color: p.label }]}>{title}</Text>
        <Text style={[type.footnote, { color: p.labelSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.selectionAsync().catch(() => {});
          onChange(v);
        }}
        accessibilityLabel={title}
        trackColor={{ true: p.tint, false: p.separator }}
        thumbColor="#fff"
      />
    </View>
  );
}
