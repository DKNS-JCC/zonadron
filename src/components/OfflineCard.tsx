import React, { useCallback, useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { t } from '../i18n';
import { space, systemColor, tabular, type, emphasize } from '../theme';
import { deletePack, getPackMeta, type PackMeta } from '../offline/pack';
import { useSettings } from '../state/SettingsContext';
import { Card, GhostButton, PrimaryButton, SectionTitle, Separator } from './ui';
import { timeAgo } from '../state/HistoryContext';

/** A partir de aquí conviene volver a descargar: las zonas cambian. */
const STALE_DAYS = 14;

/**
 * Volar sin cobertura: el paquete descargado y lo que depende de él.
 *
 * El mapa de altura libre vive aquí y no en una tarjeta aparte porque no
 * funciona sin paquete: separarlos obligaba a explicar «necesita la zona
 * descargada más arriba», que es un apaño de maquetación disfrazado de texto.
 */
export function OfflineCard() {
  const p = usePalette();
  const router = useRouter();
  const { showCoverage, setShowCoverage } = useSettings();
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
      <SectionTitle>{t('offline.title')}</SectionTitle>

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
                {t(
                  'offline.packSummary',
                  meta.radiusKm,
                  meta.zoneCount,
                  (meta.bytes / 1024 / 1024).toFixed(1),
                )}
              </Text>
            </View>
          </View>

          <Text style={[type.footnote, { color: stale ? warn : p.labelSecondary }]}>
            {t('offline.downloaded', timeAgo(meta.createdAt))}
            {stale ? t('offline.stale') : t('offline.fresh')}
          </Text>

          {meta.elevationComplete === false ? (
            <Text style={[type.footnote, { color: warn }]}>{t('offline.noElevation')}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <GhostButton label={t('offline.change')} icon="map-outline" onPress={open} />
            </View>
            <View style={{ flex: 1 }}>
              <GhostButton
                label={t('offline.delete')}
                icon="trash-outline"
                onPress={remove}
                color={p.labelSecondary}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <Text style={[type.callout, { color: p.label }]}>{t('offline.empty')}</Text>
          <PrimaryButton label={t('offline.pick')} icon="map-outline" onPress={open} />
        </View>
      )}

      <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.md }]}>
        {t('offline.notamsFootnote')}
      </Text>

      <View style={{ marginVertical: space.md }}>
        <Separator />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[emphasize(type.callout), { color: p.label }]}>
            {t('offline.coverageTitle')}
          </Text>
          <Text style={[type.footnote, { color: p.labelSecondary }]}>
            {t('offline.coverageBody')}
          </Text>
        </View>
        <Switch
          value={showCoverage}
          onValueChange={(v) => {
            Haptics.selectionAsync().catch(() => {});
            setShowCoverage(v);
          }}
          accessibilityLabel={t('offline.coverageTitle')}
          disabled={!meta}
          trackColor={{ true: p.tint, false: p.separator }}
          thumbColor="#fff"
        />
      </View>
    </Card>
  );
}
