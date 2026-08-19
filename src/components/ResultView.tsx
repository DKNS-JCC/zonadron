import React, { useMemo, useState } from 'react';
import { Linking, Pressable, Share, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import type { LayerKey, QueryResult } from '../types';
import { VerdictCard } from './VerdictCard';
import { ZoneCard } from './ZoneCard';
import { Banner, Card, GhostButton, InfoRow, SectionTitle, Separator } from './ui';
import { Chevron, Collapsible, Appear } from './motion';
import { layerLabel } from '../logic/labels';
import { ENAIRE_DRONES_URL } from '../api/enaire';
import { ELEVATION_SOURCE } from '../api/elevation';
import { buildShareText, enaireViewerUrl } from '../logic/share';
import { DroneCard } from './DroneCard';
import { MiniMap } from './MiniMap';
import { WeatherCard } from './WeatherCard';
import { ProximityCard } from './ProximityCard';
import { NotamCard } from './NotamCard';
import { space, type, emphasize } from '../theme';

export function ResultView({
  result,
  place,
  accuracy,
  onHeightChange,
  onRefresh,
  refreshing,
  onOpenMap,
  showMap = true,
}: {
  result: QueryResult;
  place?: string | null;
  /** Precisión de la posición, en metros. Se enseña sin dar la nota. */
  accuracy?: number | null;
  onHeightChange?: (h: number) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onOpenMap?: () => void;
  /** El mapa grande ya está detrás: no hace falta la vista previa. */
  showMap?: boolean;
}) {
  const p = usePalette();
  const router = useRouter();
  const [showOthers, setShowOthers] = useState(false);
  const [showData, setShowData] = useState(false);

  const affecting = result.verdict.affecting;
  const others = result.verdict.notAffecting;
  const expired = result.zones.filter((z) => z.timing === 'CADUCADA');

  const queriedAt = useMemo(
    () =>
      new Date(result.queriedAt).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [result.queriedAt],
  );

  const share = () => {
    Share.share({ message: buildShareText(result, place) }).catch(() => {});
  };

  return (
    <View style={{ gap: space.lg }}>
      <VerdictCard
        result={result}
        place={place}
        accuracy={accuracy}
        onHeightChange={onHeightChange}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />

      {result.offline ? (
        <Banner tone="warn" icon="cloud-offline-outline">
          Sin conexión: resuelto con la zona que descargaste
          {result.offlinePackDate
            ? ` el ${new Date(result.offlinePackDate).toLocaleDateString('es-ES')}`
            : ''}
          . La elevación del terreno es interpolada (±{result.elevationUncertaintyM ?? 30} m, aplicada
          hacia el lado restrictivo) y <Text style={{ fontWeight: '700' }}>no se han podido consultar
          los NOTAM</Text>, que son avisos temporales y cambian a diario.
        </Banner>
      ) : null}

      {result.verdict.incomplete ? (
        <Banner tone="warn">
          No ha respondido {result.failedLayers.map((l: LayerKey) => layerLabel[l]).join(', ')}. Esta
          comprobación está incompleta: no la des por buena.
        </Banner>
      ) : null}

      {/* Sin conexión el aviso de arriba ya explica de dónde sale la elevación:
          repetirlo aquí sería apilar dos avisos naranjas diciendo lo mismo. */}
      {result.terrainElevation === null && !result.offline ? (
        <Banner tone="warn">
          No se ha podido obtener la elevación del terreno en este punto. Las zonas con límites
          referidos al nivel del mar se muestran como si te afectaran, por prudencia.
        </Banner>
      ) : null}

      {showMap ? <MiniMap coords={result.coords} onOpen={onOpenMap} /> : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <GhostButton label="Compartir" icon="share-outline" onPress={share} />
        </View>
        <View style={{ flex: 1 }}>
          <GhostButton
            label="Ver en ENAIRE"
            icon="open-outline"
            onPress={() =>
              Linking.openURL(enaireViewerUrl(result.coords.lat, result.coords.lon)).catch(() => {})
            }
          />
        </View>
      </View>

      <GhostButton
        label="Luz y sombras aquí"
        icon="sunny-outline"
        onPress={() =>
          router.push({
            pathname: '/luz',
            params: {
              lat: String(result.coords.lat),
              lon: String(result.coords.lon),
              ...(place ? { label: place } : {}),
            },
          })
        }
      />

      {affecting.length > 0 ? (
        <Appear animationKey={result.queriedAt} delay={80}>
          <View style={{ gap: space.md }}>
            <SectionTitle>
              {affecting.length === 1
                ? 'La zona que te afecta'
                : `Las ${affecting.length} zonas que te afectan`}
            </SectionTitle>
            {affecting.map((z, i) => (
              <ZoneCard
                key={z.key}
                zone={z}
                defaultOpen={affecting.length === 1 && i === 0}
                requestContext={{ result, place }}
              />
            ))}
          </View>
        </Appear>
      ) : null}

      {others.length > 0 ? (
        <View style={{ gap: space.md }}>
          <Pressable
            onPress={() => setShowOthers((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showOthers }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              minHeight: 36,
              paddingHorizontal: space.xs,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Chevron open={showOthers} color={p.labelSecondary} size={14} />
            <Text style={[type.sectionHeader, { color: p.labelSecondary, textTransform: 'uppercase', flex: 1 }]}>
              {others.length} {others.length === 1 ? 'zona que no te afecta' : 'zonas que no te afectan'} a
              esta altura
            </Text>
          </Pressable>
          <Collapsible open={showOthers}>
            <View style={{ gap: space.md }}>
              {others.map((z) => (
                <ZoneCard key={z.key} zone={z} dimmed />
              ))}
            </View>
          </Collapsible>
        </View>
      ) : null}

      {result.verdict.advisories.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionTitle>Avisos de ENAIRE para toda España</SectionTitle>
          {result.verdict.advisories.map((z) => (
            <ZoneCard key={z.key} zone={z} />
          ))}
        </View>
      ) : null}

      {expired.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionTitle>Zonas ya no vigentes</SectionTitle>
          {expired.map((z) => (
            <ZoneCard key={z.key} zone={z} dimmed />
          ))}
        </View>
      ) : null}

      {!result.offline ? <NotamCard coords={result.coords} /> : null}

      {!result.offline ? <ProximityCard coords={result.coords} /> : null}

      {!result.offline ? <WeatherCard coords={result.coords} /> : null}

      <DroneCard compact />

      <Card padded={false}>
        <Pressable
          onPress={() => setShowData((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showData }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            padding: space.lg,
            minHeight: 52,
            backgroundColor: pressed ? p.surfaceSunken : 'transparent',
          })}
        >
          <Chevron open={showData} color={p.labelSecondary} size={14} />
          <Text style={[emphasize(type.subheadline), { color: p.labelSecondary, flex: 1 }]}>
            Datos y fuentes de esta consulta
          </Text>
        </Pressable>
        <Collapsible open={showData}>
          <Separator inset={space.lg} />
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, paddingTop: space.xs }}>
            <InfoRow
              label="Coordenadas"
              value={`${result.coords.lat.toFixed(5)}, ${result.coords.lon.toFixed(5)}`}
            />
            {accuracy != null ? (
              <InfoRow label="Precisión de la posición" value={`±${Math.round(accuracy)} m`} />
            ) : null}
            <InfoRow
              label="Elevación del terreno"
              value={
                result.terrainElevation === null
                  ? 'No disponible'
                  : `${Math.round(result.terrainElevation)} m sobre el nivel del mar`
              }
            />
            <InfoRow
              label="Tu dron llegaría a"
              value={
                result.terrainElevation === null
                  ? `${result.flightHeightAgl} m sobre el terreno`
                  : `${Math.round(result.terrainElevation + result.flightHeightAgl)} m sobre el nivel del mar`
              }
            />
            <InfoRow
              label="Zonas en el punto"
              value={`${result.zones.filter((z) => !z.advisory).length} (+${result.verdict.advisories.length} aviso general)`}
            />
            <InfoRow label="Consultado" value={queriedAt} />
            <View style={{ marginVertical: space.sm }}>
              <Separator />
            </View>
            <InfoRow label="Zonas" value="ENAIRE · Zonas Geográficas UAS (ED-318)" />
            <InfoRow label="Elevación" value={ELEVATION_SOURCE} />
          </View>
        </Collapsible>
      </Card>

      {/* Nota al pie, no aviso: sale en todas las consultas y siempre dice lo
          mismo, así que va en letra pequeña y apagada en vez de en una caja. */}
      <Text
        style={[
          type.caption,
          { color: p.labelTertiary, paddingHorizontal: space.xs, lineHeight: 17 },
        ]}
      >
        Consulta en directo los servicios oficiales de ENAIRE, pero no los sustituye: los horarios de
        los NOTAM vienen en texto libre y hay que leerlos. La responsabilidad del vuelo siempre es del
        piloto.{' '}
        <Text
          style={{ color: p.labelSecondary, fontWeight: '600' }}
          onPress={() => Linking.openURL(ENAIRE_DRONES_URL).catch(() => {})}
        >
          Abrir ENAIRE Drones
        </Text>
      </Text>
    </View>
  );
}
