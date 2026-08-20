import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapFrame, type MapFrameHandle } from './MapFrame';
import { Material } from './Material';
import { usePalette, useScheme } from '../hooks/useTheme';
import { t } from '../i18n';
import { buildMapHtml } from '../map/mapHtml';
import { getLayerIds } from '../api/enaire';
import { radius, shadow, space, type, emphasize } from '../theme';
import type { Coords } from '../types';

const FALLBACK_IDS = { aero: 2, urbano: 3, infraestructuras: 0 };

/**
 * Vista previa del punto consultado. No es decorativa: al buscar un sitio por
 * nombre, ver dónde ha caído exactamente el marcador es la única forma de
 * detectar que el buscador te ha llevado al municipio de al lado.
 *
 * Es un mapa estático (sin arrastrar ni zoom) para que no se pelee con el
 * scroll de la pantalla; se toca para abrirlo a pantalla completa.
 */
export function MiniMap({
  coords,
  onOpen,
  height = 170,
}: {
  coords: Coords;
  onOpen?: () => void;
  height?: number;
}) {
  const p = usePalette();
  const scheme = useScheme();
  const mapRef = useRef<MapFrameHandle>(null);
  const [layerIds, setLayerIds] = useState<typeof FALLBACK_IDS | null>(null);

  useEffect(() => {
    let alive = true;
    getLayerIds()
      .then((ids) => alive && setLayerIds(ids))
      .catch(() => alive && setLayerIds(FALLBACK_IDS));
    return () => {
      alive = false;
    };
  }, []);

  const html = useMemo(
    () =>
      layerIds
        ? buildMapHtml({
            lat: coords.lat,
            lon: coords.lon,
            zoom: 14,
            layerIds,
            visible: { aero: true, urbano: false, infraestructuras: true },
            dark: scheme === 'dark',
            interactive: false,
            marker: coords,
          })
        : null,
    [layerIds, coords.lat, coords.lon, scheme],
  );

  return (
    <Pressable
      onPress={onOpen}
      disabled={!onOpen}
      accessibilityRole={onOpen ? 'button' : 'image'}
      accessibilityLabel={t('miniMap.a11y', coords.lat.toFixed(4), coords.lon.toFixed(4))}
      style={[
        {
          height,
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: p.surface,
        },
        shadow.chip,
      ]}
    >
      {html ? (
        <MapFrame ref={mapRef} html={html} onMessage={() => {}} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[type.footnote, { color: p.labelSecondary }]}>{t('miniMap.loading')}</Text>
        </View>
      )}

      {onOpen ? (
        <View
          style={{ position: 'absolute', right: space.sm, bottom: space.sm }}
          pointerEvents="none"
        >
          <Material weight="chrome" radius={radius.pill}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: space.md,
                paddingVertical: 7,
              }}
            >
              <Ionicons name="expand-outline" size={13} color={p.tint} />
              <Text style={[emphasize(type.footnote), { color: p.tint }]}>{t('miniMap.open')}</Text>
            </View>
          </Material>
        </View>
      ) : null}
    </Pressable>
  );
}
