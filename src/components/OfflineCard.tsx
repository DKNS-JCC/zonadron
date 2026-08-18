import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, type } from '../theme';
import {
  buildPack,
  DEFAULT_RADIUS_KM,
  deletePack,
  getPackMeta,
  type BuildProgress,
  type PackMeta,
} from '../offline/pack';
import { describePoint } from '../api/geocode';
import { Banner, Card, GhostButton, PrimaryButton, SectionTitle } from './ui';
import { timeAgo } from '../state/HistoryContext';

const STEP_LABEL: Record<BuildProgress['step'], string> = {
  zonas: 'Descargando las zonas de ENAIRE…',
  elevacion: 'Descargando la elevación del terreno…',
  guardando: 'Guardando en el móvil…',
};

/** A partir de aquí conviene volver a descargar: las zonas cambian. */
const STALE_DAYS = 14;

export function OfflineCard() {
  const p = usePalette();
  const [meta, setMeta] = useState<PackMeta | null>(null);
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getPackMeta().then(setMeta).catch(() => {});
    return () => abortRef.current?.abort();
  }, []);

  const download = useCallback(async () => {
    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ step: 'zonas', pct: 0 });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Necesito tu ubicación para saber qué zona descargar.');
        setProgress(null);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const center = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const label = (await describePoint(center.lat, center.lon).catch(() => null)) ?? 'Zona descargada';
      const result = await buildPack(center, label, DEFAULT_RADIUS_KM, setProgress, controller.signal);
      if (controller.signal.aborted) return;
      setMeta(result);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof Error
          ? `No se ha podido descargar: ${err.message}`
          : 'No se ha podido descargar la zona.',
      );
    } finally {
      if (!controller.signal.aborted) setProgress(null);
    }
  }, []);

  const remove = useCallback(async () => {
    await deletePack();
    setMeta(null);
  }, []);

  const ageDays = meta
    ? Math.floor((Date.now() - new Date(meta.createdAt).getTime()) / 86400000)
    : 0;
  const stale = ageDays >= STALE_DAYS;

  return (
    <Card>
      <SectionTitle>Volar sin cobertura</SectionTitle>

      {meta ? (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: stale ? '#8F530018' : '#07835A18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={stale ? 'time-outline' : 'cloud-done-outline'}
                size={22}
                color={stale ? (p.scheme === 'dark' ? '#E8A33D' : '#8F5300') : '#07835A'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.bodyStrong, { color: p.text }]} numberOfLines={1}>
                {meta.label}
              </Text>
              <Text style={[type.caption, { color: p.textMuted }]}>
                {meta.radiusKm} km a la redonda · {meta.zoneCount} zonas ·{' '}
                {(meta.bytes / 1024 / 1024).toFixed(1)} MB
              </Text>
            </View>
          </View>

          <Text style={[type.caption, { color: stale ? (p.scheme === 'dark' ? '#E8A33D' : '#8F5300') : p.textMuted }]}>
            Descargada {timeAgo(meta.createdAt)}.
            {stale
              ? ' Las zonas de ENAIRE cambian: conviene volver a descargarla antes de fiarte.'
              : ' Si te quedas sin datos dentro de esta área, la app responde igual.'}
          </Text>

          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <GhostButton label="Actualizar" icon="refresh" onPress={download} />
            </View>
            <View style={{ flex: 1 }}>
              <GhostButton label="Borrar" icon="trash-outline" onPress={remove} color={p.textMuted} />
            </View>
          </View>
        </View>
      ) : progress === null ? (
        <View style={{ gap: space.md }}>
          <Text style={[type.body, { color: p.text }]}>
            Descarga las zonas de {DEFAULT_RADIUS_KM} km alrededor de donde estás y la app seguirá
            respondiendo aunque te quedes sin datos móviles en pleno campo.
          </Text>
          <PrimaryButton label="Descargar mi zona" icon="cloud-download-outline" onPress={download} />
        </View>
      ) : null}

      {progress ? (
        <View style={{ gap: space.sm, marginTop: meta ? space.md : 0 }}>
          <Text style={[type.caption, { color: p.textMuted }]}>{STEP_LABEL[progress.step]}</Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: p.skeleton, overflow: 'hidden' }}>
            <View
              style={{
                width: `${Math.round(progress.pct * 100)}%`,
                height: 6,
                borderRadius: 3,
                backgroundColor: p.accent,
              }}
            />
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={{ marginTop: space.md }}>
          <Banner tone="warn">{error}</Banner>
        </View>
      ) : null}

      <Text style={[type.caption, { color: p.textFaint, fontSize: 12, marginTop: space.md }]}>
        Los NOTAM no se descargan: cambian a diario y uno viejo es peor que ninguno. Sin cobertura la
        app te avisa de que faltan.
      </Text>
    </Card>
  );
}
