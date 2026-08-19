import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, systemColor, tabular, type, emphasize } from '../theme';
import { findNearestBlockingZone, PROXIMITY_RADIUS_M, type NearbyZone } from '../api/proximity';
import { Card, SectionTitle, SkeletonRows } from './ui';
import type { Coords } from '../types';

/**
 * Cuánto margen tienes hasta la siguiente zona restringida.
 *
 * Saber que estás fuera no basta: si el borde pasa a 80 m, una ráfaga o un
 * despiste te mete dentro sin que te enteres.
 */
export function ProximityCard({ coords }: { coords: Coords }) {
  const p = usePalette();
  const [zone, setZone] = useState<NearbyZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    findNearestBlockingZone(coords.lat, coords.lon, PROXIMITY_RADIUS_M, controller.signal)
      .then((z) => !controller.signal.aborted && setZone(z))
      .catch(() => !controller.signal.aborted && setFailed(true))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [coords.lat, coords.lon]);

  if (loading) {
    return (
      <Card>
        <SectionTitle>Margen hasta la siguiente zona</SectionTitle>
        <SkeletonRows rows={1} />
      </Card>
    );
  }

  if (failed) return null;

  const close = zone !== null && zone.distanceM < 300;
  const tone = close ? systemColor('orange', p) : p.labelSecondary;

  return (
    <Card>
      <SectionTitle>Margen hasta la siguiente zona</SectionTitle>

      {zone === null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Ionicons name="checkmark-circle" size={24} color={systemColor('green', p)} />
          <Text style={[type.callout, { color: p.label, flex: 1 }]}>
            No hay ninguna zona que exija permiso en {PROXIMITY_RADIUS_M / 1000} km a la redonda.
            Tienes sitio de sobra.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name={close ? 'warning' : 'resize-outline'} size={26} color={tone} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                <Text style={[type.title1, tabular, { color: close ? tone : p.label }]}>
                  {Math.round(zone.distanceM)}
                </Text>
                <Text style={[emphasize(type.callout), { color: close ? tone : p.label }]}>m</Text>
                <Text style={[type.footnote, { color: p.labelSecondary }]}>{zone.bearing}</Text>
              </View>
              <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={2}>
                hasta {zone.title}
              </Text>
            </View>
          </View>

          {close ? (
            <View
              style={{
                backgroundColor: p.surfaceSunken,
                borderRadius: radius.md,
                padding: space.md,
              }}
            >
              <Text style={[type.footnote, { color: p.label }]}>
                Estás muy cerca del borde. Con viento o perdiendo de vista el dron es fácil entrar
                sin darte cuenta: vuela hacia el lado contrario y deja margen.
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.md }]}>
        Distancia al borde más próximo, calculada sobre la geometría de ENAIRE simplificada a unos
        10 m. Orientativa: no la uses para apurar.
      </Text>
    </Card>
  );
}
