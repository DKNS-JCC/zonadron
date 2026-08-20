import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Material } from '../../components/Material';
import { Collapsible, PressableScale } from '../../components/motion';
import { Separator } from '../../components/ui';
import { usePalette } from '../../hooks/useTheme';
import { layerColor, layerDescription, layerLabel } from '../../logic/labels';
import { coverageLegend } from '../../offline/coverage';
import { BASEMAPS, basemapLabel, basemapNote, type BasemapId } from '../../state/SettingsContext';
import { radius, shadow, space, type, emphasize } from '../../theme';
import type { LayerKey } from '../../types';

const ALL_LAYERS: LayerKey[] = ['aero', 'urbano', 'infraestructuras'];

/**
 * Panel colapsable de "Capas del mapa": mapa base, zonas de ENAIRE y, si está
 * activada en Ajustes, la leyenda del mapa de altura libre. Separado de
 * mapa.tsx porque es JSX puro sin estado propio — todo el estado vive en
 * useMapLayers y llega por props.
 */
export function LegendPanel({
  open,
  basemap,
  setBasemap,
  visible,
  toggleLayer,
  showCoverage,
  coverageState,
}: {
  open: boolean;
  basemap: BasemapId;
  setBasemap: (id: BasemapId) => void;
  visible: Record<LayerKey, boolean>;
  toggleLayer: (key: LayerKey) => void;
  showCoverage: boolean;
  coverageState: 'off' | 'calculando' | 'on' | 'sin-paquete';
}) {
  const p = usePalette();

  return (
    <Collapsible open={open}>
      <Material weight="panel" radius={radius.lg}>
        <View style={{ padding: space.lg, gap: space.lg }}>
          <View style={{ gap: space.sm }}>
            <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
              Mapa base
            </Text>
            {/* Control segmentado: una pista hundida y una pastilla que marca lo elegido. */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: p.surfaceSunken,
                borderRadius: 10,
                padding: 2,
                gap: 2,
              }}
            >
              {BASEMAPS.map((b) => {
                const active = basemap === b.id;
                return (
                  <PressableScale
                    key={b.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setBasemap(b.id);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      {
                        flex: 1,
                        alignItems: 'center',
                        gap: 3,
                        paddingVertical: space.sm,
                        borderRadius: 8,
                        backgroundColor: active ? p.surface : 'transparent',
                      },
                      active ? (shadow.chip as object) : {},
                    ]}
                  >
                    <Ionicons name={b.icon as any} size={17} color={active ? p.tint : p.labelSecondary} />
                    <Text
                      style={[
                        emphasize(type.caption2, active ? '600' : '500'),
                        { color: active ? p.label : p.labelSecondary },
                      ]}
                    >
                      {basemapLabel(b.id)}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <Text style={[type.caption, { color: p.labelTertiary }]}>
              {basemapNote(basemap)}
            </Text>
          </View>

          <View style={{ gap: space.sm }}>
            <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
              Zonas sobre el mapa
            </Text>
            <View style={{ backgroundColor: p.surfaceSunken, borderRadius: radius.md, overflow: 'hidden' }}>
              {ALL_LAYERS.map((key, i) => (
                <View key={key}>
                  {i > 0 ? <Separator inset={space.md + 14 + space.md} /> : null}
                  <Pressable
                    onPress={() => toggleLayer(key)}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: visible[key] }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      gap: space.md,
                      alignItems: 'center',
                      paddingHorizontal: space.md,
                      paddingVertical: space.sm + 2,
                      minHeight: 48,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        backgroundColor: visible[key] ? layerColor[key] : 'transparent',
                        borderWidth: visible[key] ? 0 : 1.5,
                        borderColor: p.labelTertiary,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[emphasize(type.subheadline), { color: p.label }]}>{layerLabel(key)}</Text>
                      <Text style={[type.caption, { color: p.labelSecondary }]}>{layerDescription(key)}</Text>
                    </View>
                    {visible[key] ? <Ionicons name="checkmark" size={19} color={p.tint} /> : null}
                  </Pressable>
                </View>
              ))}
            </View>
            <Text style={[type.caption, { color: p.labelTertiary }]}>
              El dibujo de las zonas se pide directamente al servicio de ENAIRE: es el mismo que verías
              en su visor oficial, con sus mismos colores.
            </Text>
          </View>

          {showCoverage ? (
            <View style={{ gap: space.sm }}>
              <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
                Altura libre {coverageState === 'calculando' ? '· calculando…' : ''}
              </Text>
              {coverageState === 'sin-paquete' ? (
                <Text style={[type.caption, { color: p.labelSecondary }]}>
                  Necesitas descargar esta zona en Ajustes → Volar sin cobertura. El cálculo se hace en
                  el móvil, no se puede pedir celda a celda a ENAIRE.
                </Text>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                    {coverageLegend().map((l) => (
                      <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: l.color }} />
                        <Text style={[type.caption2, { color: p.labelSecondary }]}>{l.label}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[type.caption, { color: p.labelTertiary }]}>
                    Celdas de la zona descargada, orientativas. Antes de despegar comprueba el punto
                    exacto: el borde real de una zona no cae donde acaba una celda.
                  </Text>
                </>
              )}
            </View>
          ) : null}
        </View>
      </Material>
    </Collapsible>
  );
}
