import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Material } from '../../components/Material';
import { Collapsible, PressableScale } from '../../components/motion';
import { Separator } from '../../components/ui';
import { usePalette } from '../../hooks/useTheme';
import { layerColor, layerDescription, layerLabel } from '../../logic/labels';
import {
  COVERAGE_STOPS,
  DEFAULT_CELL_METRES,
  coverageLegend,
  coverageTicks,
} from '../../offline/coverage';
import { BASEMAPS, basemapLabel, basemapNote, type BasemapId } from '../../state/SettingsContext';
import { radius, shadow, space, systemColor, type, emphasize } from '../../theme';
import type { NotamState } from './useNotamAreas';
import type { LayerKey } from '../../types';
import { t } from '../../i18n';

const ALL_LAYERS: LayerKey[] = ['aero', 'urbano', 'infraestructuras'];

/** La rampa del mapa, estirada a la barra de la leyenda. */
const RAMP_TOP = COVERAGE_STOPS[COVERAGE_STOPS.length - 1][0];
const rampColors = COVERAGE_STOPS.map(([, color]) => color) as unknown as readonly [
  string,
  string,
  ...string[],
];
const rampStops = COVERAGE_STOPS.map(([metres]) => metres / RAMP_TOP) as unknown as readonly [
  number,
  number,
  ...number[],
];

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
  cellMetres,
  showNotams,
  setShowNotams,
  notamState,
  notamsShown,
  notamsHidden,
  flightHeight,
  maxHeight,
}: {
  open: boolean;
  basemap: BasemapId;
  setBasemap: (id: BasemapId) => void;
  visible: Record<LayerKey, boolean>;
  toggleLayer: (key: LayerKey) => void;
  showCoverage: boolean;
  coverageState: 'off' | 'calculando' | 'on' | 'sin-paquete';
  /** Lado real de la celda pintada, en metros. */
  cellMetres: number | null;
  showNotams: boolean;
  setShowNotams: (v: boolean) => void;
  notamState: NotamState;
  notamsShown: number;
  /** Cuántos se han dejado fuera por empezar más arriba de lo que vuelas. */
  notamsHidden: number;
  flightHeight: number;
  /**
   * Alto libre entre la barra de arriba y la hoja de abajo. El panel nunca
   * pasa de ahí: son cuatro secciones y en un móvil no caben de una vez, así
   * que lo que sobra se desplaza en lugar de salirse por debajo de la pantalla.
   */
  maxHeight: number;
}) {
  const p = usePalette();
  // Si el panel se ha quedado corto, hay que decirlo. Un corte limpio a media
  // fila parece un fallo de dibujo, no un "sigue hacia abajo".
  const [more, setMore] = useState(false);

  return (
    <Collapsible open={open}>
      <Material weight="panel" radius={radius.lg} style={{ overflow: 'hidden' }}>
        <ScrollView
          style={{ maxHeight }}
          contentContainerStyle={{ padding: space.lg, gap: space.lg }}
          showsVerticalScrollIndicator
          // El panel flota sobre el mapa: sin esto, el rebote de iOS deja ver
          // el mapa moviéndose por dentro del material.
          bounces={false}
          scrollEventThrottle={16}
          onContentSizeChange={(_w, h) => setMore(h > maxHeight + 4)}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            setMore(contentOffset.y + layoutMeasurement.height < contentSize.height - 4);
          }}
        >
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

          <View style={{ gap: space.sm }}>
            <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase' }]}>
              {t('notam.title')}
            </Text>
            <View style={{ backgroundColor: p.surfaceSunken, borderRadius: radius.md, overflow: 'hidden' }}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setShowNotams(!showNotams);
                }}
                accessibilityRole="switch"
                accessibilityState={{ checked: showNotams }}
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
                    backgroundColor: showNotams ? systemColor('orange', p) : 'transparent',
                    borderWidth: showNotams ? 0 : 1.5,
                    borderColor: p.labelTertiary,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[emphasize(type.subheadline), { color: p.label }]}>
                    {t('notam.layer')}
                  </Text>
                  <Text style={[type.caption, { color: p.labelSecondary }]}>
                    {t('notam.layerNote')}
                  </Text>
                </View>
                {showNotams ? <Ionicons name="checkmark" size={19} color={p.tint} /> : null}
              </Pressable>
            </View>

            {showNotams ? (
              <NotamStatus
                state={notamState}
                shown={notamsShown}
                hidden={notamsHidden}
                flightHeight={flightHeight}
              />
            ) : null}
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
                  {/* Barra de degradado: la altura libre es continua, así que la
                      leyenda también. Las marcas dicen a qué altura equivale cada
                      punto de la barra. */}
                  <LinearGradient
                    colors={rampColors}
                    locations={rampStops}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ height: 12, borderRadius: 6 }}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {coverageTicks().map((tick) => (
                      <Text key={tick.metres} style={[type.caption2, { color: p.labelTertiary }]}>
                        {tick.label} m
                      </Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                    {coverageLegend().map((l) => (
                      <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: l.color }} />
                        <Text style={[type.caption2, { color: p.labelSecondary }]}>{l.label}</Text>
                      </View>
                    ))}
                  </View>
                  {cellMetres ? (
                    <Text style={[type.caption2, { color: p.labelSecondary }]}>
                      {cellMetres > DEFAULT_CELL_METRES
                        ? t('coverage.cellCoarse', cellMetres)
                        : t('coverage.cellSize', cellMetres)}
                    </Text>
                  ) : null}
                  <Text style={[type.caption, { color: p.labelTertiary }]}>
                    El borde de las zonas es exacto; el degradado es orientativo. Comprueba el punto
                    antes de despegar.
                  </Text>
                </>
              )}
            </View>
          ) : null}
        </ScrollView>
        {more ? (
          <LinearGradient
            colors={[p.surface + '00', p.surface + 'E6']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 }}
            pointerEvents="none"
          />
        ) : null}
      </Material>
    </Collapsible>
  );
}

/**
 * Qué está pasando con la capa de NOTAM: cuántos se ven, cuántos se han
 * dejado fuera por altura y por qué a veces no hay nada que enseñar.
 *
 * Lo de contar los ocultos no es un adorno. La app está escondiendo avisos
 * aeronáuticos por su cuenta, y quien vuela tiene derecho a saber cuántos y
 * con qué criterio antes de fiarse de un mapa vacío.
 */
function NotamStatus({
  state,
  shown,
  hidden,
  flightHeight,
}: {
  state: NotamState;
  shown: number;
  hidden: number;
  flightHeight: number;
}) {
  const p = usePalette();
  const warn = systemColor('orange', p);

  if (state === 'lejos') {
    return <Text style={[type.caption, { color: p.labelTertiary }]}>{t('notam.mapFar')}</Text>;
  }
  if (state === 'error') {
    return <Text style={[type.caption, { color: warn }]}>{t('notam.mapFailed')}</Text>;
  }
  if (state === 'cargando') {
    return <Text style={[type.caption, { color: p.labelTertiary }]}>{t('notam.mapLoading')}</Text>;
  }

  return (
    <View style={{ gap: space.sm }}>
      {shown > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: '#E8720C' }} />
            <Text style={[type.caption2, { color: p.labelSecondary }]}>
              {t('notam.legendActive')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {/* Tres trocitos: el borde de trazos del mapa, en pequeño. */}
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: 4, height: 3, borderRadius: 2, backgroundColor: '#B8791F' }} />
              ))}
            </View>
            <Text style={[type.caption2, { color: p.labelSecondary }]}>
              {t('notam.legendScheduled')}
            </Text>
          </View>
        </View>
      ) : null}
      <Text style={[type.caption, { color: p.labelSecondary }]}>{t('notam.mapCount', shown)}</Text>
      {hidden > 0 ? (
        <Text style={[type.caption, { color: p.labelTertiary }]}>
          {t('notam.mapHidden', hidden, flightHeight)}
        </Text>
      ) : null}
    </View>
  );
}
