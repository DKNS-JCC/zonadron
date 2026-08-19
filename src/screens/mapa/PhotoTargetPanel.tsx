import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Material } from '../../components/Material';
import { GhostButton, IconButton } from '../../components/ui';
import { usePalette } from '../../hooks/useTheme';
import { space, tabular, type, verdictTint } from '../../theme';
import { formatDistance } from './usePhotoTarget';
import type { NearestFlyableResult } from '../../offline/nearest';
import type { Coords } from '../../types';

type PhotoState =
  | { state: 'buscando' }
  | { state: 'sin-paquete' }
  | { state: 'listo'; target: Coords; result: NearestFlyableResult }
  | null;

/**
 * Resultado de "quiero fotografiar esto": el punto más cercano desde el que
 * se puede volar sin autorización, con distancia y rumbo. JSX puro, todo el
 * estado viene de usePhotoTarget.
 */
export function PhotoTargetPanel({
  photo,
  flightHeight,
  onClear,
}: {
  photo: PhotoState;
  flightHeight: number;
  onClear: () => void;
}) {
  const p = usePalette();
  const router = useRouter();

  if (!photo) return null;

  return (
    <Material weight="panel" radius={16}>
      <View style={{ padding: space.lg, gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="camera" size={15} color={p.labelSecondary} />
          <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase', flex: 1 }]}>
            Objetivo marcado
          </Text>
          <IconButton icon="close" label="Quitar el objetivo" onPress={onClear} color={p.labelTertiary} />
        </View>

        {photo.state === 'buscando' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <ActivityIndicator size="small" color={p.labelSecondary} />
            <Text style={[type.callout, { color: p.label }]}>Buscando desde dónde puedes volar…</Text>
          </View>
        ) : photo.state === 'sin-paquete' ? (
          <Text style={[type.callout, { color: p.label }]}>
            Para esto necesitas la zona descargada: la búsqueda mira miles de puntos y eso no se le
            puede preguntar a ENAIRE uno a uno. Descárgala en Ajustes → Volar sin cobertura.
          </Text>
        ) : photo.result.targetIsFlyable ? (
          <>
            <Text style={[type.title3, { color: verdictTint('LIBRE', p) }]}>
              Puedes volar desde el propio objetivo
            </Text>
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              No necesitas moverte: ahí mismo se puede despegar sin pedir autorización.
            </Text>
          </>
        ) : photo.result.best || photo.result.anyHeight ? (
          (() => {
            const spot = photo.result.best ?? photo.result.anyHeight!;
            const exact = Boolean(photo.result.best);
            return (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={[type.largeTitle, tabular, { color: p.label }]}>
                    {formatDistance(spot.distanceM)}
                  </Text>
                  <Text style={[type.title3, { color: p.labelSecondary }]}>{spot.bearing}</Text>
                </View>
                <Text style={[type.footnote, { color: p.labelSecondary }]}>
                  Desde ahí puedes subir hasta {spot.freeHeightM} m sin autorización
                  {exact ? '.' : `, que es menos de los ${flightHeight} m que querías.`}
                  {spot.distanceM > 500 ? ' Ojo: queda lejos para tener el objetivo a la vista.' : ''}
                </Text>
                <GhostButton
                  label="Consultar ese punto"
                  icon="arrow-forward"
                  onPress={() =>
                    router.push({
                      pathname: '/resultado',
                      params: { lat: String(spot.coords.lat), lon: String(spot.coords.lon) },
                    })
                  }
                />
              </>
            );
          })()
        ) : (
          <Text style={[type.callout, { color: p.label }]}>
            No hay ningún punto donde volar sin autorización en {photo.result.searchedKm} km a la
            redonda, dentro de la zona que tienes descargada.
          </Text>
        )}
      </View>
    </Material>
  );
}
