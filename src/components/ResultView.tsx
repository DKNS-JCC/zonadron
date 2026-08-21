import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, Share, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { dateLocale, t } from '../i18n';
import type { LayerKey, QueryResult } from '../types';
import { VerdictCard } from './VerdictCard';
import { ZoneCard } from './ZoneCard';
import { Banner, Card, GhostButton, InfoRow, SectionTitle, Separator } from './ui';
import { Chevron, Collapsible, Appear } from './motion';
import { layerLabel } from '../logic/labels';
import { ENAIRE_DRONES_URL } from '../api/enaire';
import { ELEVATION_SOURCE } from '../api/elevation';
import { buildShareText, drivingDirectionsUrl, enaireViewerUrl } from '../logic/share';
import { DroneCard } from './DroneCard';
import { MiniMap } from './MiniMap';
import { WeatherCard } from './WeatherCard';
import { ProximityCard } from './ProximityCard';
import { ProtectedAreaCard } from './ProtectedAreaCard';
import { NotamCard } from './NotamCard';
import { UrbanCard } from './UrbanCard';
import { useFavorites } from '../state/FavoritesContext';
import { useFlightLog } from '../state/FlightLogContext';
import { useSettings } from '../state/SettingsContext';
import { useFleet } from '../state/FleetContext';
import { useProtectedAreas } from '../hooks/useProtectedAreas';
import { isStrictFigure } from '../api/protected';
import { getDroneProfile } from '../logic/drone';
import { droneName } from '../logic/fleet';
import { space, systemColor, type, emphasize } from '../theme';

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
  const { isFavorite, toggleFavorite } = useFavorites();
  const { logFlight } = useFlightLog();
  const { drone } = useSettings();
  const { activeDrone } = useFleet();
  const [justLogged, setJustLogged] = useState(false);

  // Sin conexión no se consulta el inventario ambiental: no está en el paquete.
  const protectedAreas = useProtectedAreas(result.coords);
  const strictArea = result.offline
    ? null
    : (protectedAreas?.find((a) => isStrictFigure(a.designation)) ?? null);

  const affecting = result.verdict.affecting;
  const others = result.verdict.notAffecting;
  // El aviso urbano de ENAIRE no se enseña como zona: vive dentro de la
  // tarjeta de entorno urbano, que responde a esa misma pregunta con datos.
  const urbanNotice = result.verdict.advisories.find((z) => z.layer === 'urbano') ?? null;
  const advisories = result.verdict.advisories.filter((z) => z !== urbanNotice);
  const expired = result.zones.filter((z) => z.timing === 'CADUCADA');

  const logThisFlight = () => {
    // En el diario interesa saber con cuál volaste, no de qué clase era: si
    // tienes dos Mini, el alias los distingue y la clase no.
    const droneLabel = activeDrone ? droneName(activeDrone) : getDroneProfile(drone).label;
    logFlight(result, place ?? null, droneLabel);
    setJustLogged(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  // Un resultado nuevo es una consulta nueva: el botón vuelve a su estado normal.
  useEffect(() => setJustLogged(false), [result.queriedAt]);

  const queriedAt = useMemo(
    () =>
      new Date(result.queriedAt).toLocaleString(dateLocale(), {
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
        isFavorite={isFavorite(result.coords.lat, result.coords.lon)}
        onToggleFavorite={() => toggleFavorite(result, place ?? null)}
        protectedArea={strictArea}
      />

      {result.offline ? (
        <Banner tone="warn" icon="cloud-offline-outline">
          {t(
            'result.offlineBanner',
            result.offlinePackDate
              ? ` (${new Date(result.offlinePackDate).toLocaleDateString(dateLocale())})`
              : '',
          )}
          {t('result.offlineElevation', result.elevationUncertaintyM ?? 30)}
          <Text style={{ fontWeight: '700' }}>{t('result.offlineNotams')}</Text>
          {t('result.offlineNotamsTail')}
        </Banner>
      ) : null}

      {result.verdict.incomplete ? (
        <Banner tone="warn">
          {t('result.incomplete', result.failedLayers.map((l: LayerKey) => layerLabel(l)).join(', '))}
        </Banner>
      ) : null}

      {/* Sin conexión el aviso de arriba ya explica de dónde sale la elevación:
          repetirlo aquí sería apilar dos avisos naranjas diciendo lo mismo. */}
      {result.terrainElevation === null && !result.offline ? (
        <Banner tone="warn">{t('result.noTerrain')}</Banner>
      ) : null}

      {showMap ? <MiniMap coords={result.coords} onOpen={onOpenMap} /> : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <GhostButton
            label={t('result.directions')}
            icon="navigate-outline"
            onPress={() =>
              Linking.openURL(drivingDirectionsUrl(result.coords.lat, result.coords.lon)).catch(() => {})
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <GhostButton
            label={justLogged ? t('result.logged') : t('result.logFlight')}
            icon={justLogged ? 'checkmark-circle' : 'book-outline'}
            onPress={logThisFlight}
            color={justLogged ? systemColor('green', p) : undefined}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <GhostButton label={t('result.share')} icon="share-outline" onPress={share} />
        </View>
        <View style={{ flex: 1 }}>
          <GhostButton
            label={t('result.openEnaire')}
            icon="open-outline"
            onPress={() =>
              Linking.openURL(enaireViewerUrl(result.coords.lat, result.coords.lon)).catch(() => {})
            }
          />
        </View>
      </View>

      <GhostButton
        label={t('result.light')}
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
                ? t('result.affectingOne')
                : t('result.affectingMany', affecting.length)}
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
              {t('result.notAffecting', others.length)}
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

      {advisories.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionTitle>{t('result.advisories')}</SectionTitle>
          {advisories.map((z) => (
            <ZoneCard key={z.key} zone={z} />
          ))}
        </View>
      ) : null}

      {expired.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionTitle>{t('result.expired')}</SectionTitle>
          {expired.map((z) => (
            <ZoneCard key={z.key} zone={z} dimmed />
          ))}
        </View>
      ) : null}

      {!result.offline ? <NotamCard notams={result.notams} /> : null}

      {/* El entorno urbano no es una zona de ENAIRE —ellos avisan de que lo
          compruebes tú—, así que va aquí, entre las restricciones publicadas y
          el contexto del sitio, y nunca toca el veredicto. */}
      {!result.offline ? (
        <UrbanCard coords={result.coords} enaireNotice={urbanNotice} />
      ) : null}

      {!result.offline ? <ProximityCard coords={result.coords} /> : null}

      {/* Va antes del tiempo porque es una restricción, no una condición: si el
          parque no te deja volar, da igual que haga buen día. */}
      {!result.offline ? <ProtectedAreaCard areas={protectedAreas} /> : null}

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
            {t('result.dataTitle')}
          </Text>
        </Pressable>
        <Collapsible open={showData}>
          <Separator inset={space.lg} />
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, paddingTop: space.xs }}>
            <InfoRow
              label={t('result.coords')}
              value={`${result.coords.lat.toFixed(5)}, ${result.coords.lon.toFixed(5)}`}
            />
            {accuracy != null ? (
              <InfoRow label={t('result.accuracy')} value={`±${Math.round(accuracy)} m`} />
            ) : null}
            <InfoRow
              label={t('result.terrain')}
              value={
                result.terrainElevation === null
                  ? t('result.terrainUnavailable')
                  : t('result.metresAmsl', Math.round(result.terrainElevation))
              }
            />
            <InfoRow
              label={t('result.droneReaches')}
              value={
                result.terrainElevation === null
                  ? t('result.metresAgl', result.flightHeightAgl)
                  : t(
                      'result.metresAmsl',
                      Math.round(result.terrainElevation + result.flightHeightAgl),
                    )
              }
            />
            <InfoRow
              label={t('result.zonesHere')}
              value={t(
                'result.zonesHereValue',
                result.zones.filter((z) => !z.advisory).length,
                result.verdict.advisories.length,
              )}
            />
            <InfoRow label={t('result.queriedAt')} value={queriedAt} />
            <View style={{ marginVertical: space.sm }}>
              <Separator />
            </View>
            <InfoRow
              label={t('result.sourceZones')}
              value="ENAIRE · Zonas Geográficas UAS (ED-318)"
            />
            <InfoRow label={t('result.sourceElevation')} value={ELEVATION_SOURCE} />
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
        {t('result.disclaimer')}
        <Text
          style={{ color: p.labelSecondary, fontWeight: '600' }}
          onPress={() => Linking.openURL(ENAIRE_DRONES_URL).catch(() => {})}
        >
          {t('result.openEnaireDrones')}
        </Text>
      </Text>
    </View>
  );
}
