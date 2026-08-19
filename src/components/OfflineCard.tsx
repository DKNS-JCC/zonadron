import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { space, systemColor, tabular, type, emphasize } from '../theme';
import { deletePack, getPackMeta, type PackMeta } from '../offline/pack';
import { Card, GhostButton, PrimaryButton, SectionTitle } from './ui';
import { timeAgo } from '../state/HistoryContext';

/** A partir de aquí conviene volver a descargar: las zonas cambian. */
const STALE_DAYS = 14;

export function OfflineCard() {
  const p = usePalette();
  const router = useRouter();
  const [meta, setMeta] = useState<PackMeta | null>(null);

  const refresh = useCallback(() => {
    getPackMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);
  // Al volver de elegir zona, la tarjeta tiene que reflejar la descarga nueva.
  useFocusEffect(refresh);

  const remove = useCallback(async () => {
    await deletePack();
    setMeta(null);
  }, []);

  const open = () => router.push('/descargar');

  const ageDays = meta
    ? Math.floor((Date.now() - new Date(meta.createdAt).getTime()) / 86400000)
    : 0;
  const stale = ageDays >= STALE_DAYS;
  const warn = systemColor('orange', p);
  const ok = systemColor('green', p);

  return (
    <Card>
      <SectionTitle>Volar sin cobertura</SectionTitle>

      {meta ? (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons
              name={stale ? 'time-outline' : 'cloud-done-outline'}
              size={26}
              color={stale ? warn : ok}
            />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[emphasize(type.callout), { color: p.label }]} numberOfLines={1}>
                {meta.label}
              </Text>
              <Text style={[type.footnote, tabular, { color: p.labelSecondary }]}>
                {meta.radiusKm} km de radio · {meta.zoneCount} zonas ·{' '}
                {(meta.bytes / 1024 / 1024).toFixed(1)} MB
              </Text>
            </View>
          </View>

          <Text style={[type.footnote, { color: stale ? warn : p.labelSecondary }]}>
            Descargada {timeAgo(meta.createdAt)}.
            {stale
              ? ' Las zonas de ENAIRE cambian: conviene volver a descargarla antes de fiarte.'
              : ' Si te quedas sin datos dentro de esa área, la app responde igual.'}
          </Text>

          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <GhostButton label="Cambiar zona" icon="map-outline" onPress={open} />
            </View>
            <View style={{ flex: 1 }}>
              <GhostButton label="Borrar" icon="trash-outline" onPress={remove} color={p.labelSecondary} />
            </View>
          </View>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <Text style={[type.callout, { color: p.label }]}>
            Elige en el mapa la zona donde vas a volar y descárgala. Dentro de esa área la app sigue
            respondiendo aunque te quedes sin datos móviles.
          </Text>
          <PrimaryButton label="Elegir zona en el mapa" icon="map-outline" onPress={open} />
        </View>
      )}

      <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.md }]}>
        Los NOTAM no se descargan: cambian a diario y uno viejo es peor que ninguno. Sin cobertura la
        app te avisa de que faltan.
      </Text>
    </Card>
  );
}
