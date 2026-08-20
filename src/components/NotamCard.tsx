import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { t } from '../i18n';
import { radius, space, systemColor, type, emphasize } from '../theme';
import type { Notam } from '../api/notam';
import { Card, Chip, SectionTitle, Separator } from './ui';
import { Chevron, Collapsible } from './motion';

const ENAIRE_NOTAM_URL = 'https://drones.enaire.es/';

/**
 * Avisos temporales. Son los que te pillan por sorpresa: ejercicios militares,
 * espectáculos aéreos, zonas activadas sólo unos días.
 *
 * `notams` viene ya resuelto desde `checkPoint()` (src/logic/query.ts): se
 * pide una sola vez por consulta, junto con las zonas, para que este panel y
 * el aviso de la tarjeta de veredicto (VerdictCard) cuenten siempre lo mismo.
 * undefined o null significa que no se ha podido consultar; no que no haya.
 */
export function NotamCard({ notams }: { notams: Notam[] | null | undefined }) {
  const p = usePalette();

  if (notams == null) {
    return (
      <Card>
        <SectionTitle>{t('notam.title')}</SectionTitle>
        <Text style={[type.callout, { color: p.label }]}>{t('notam.failed')}</Text>
        <Pressable
          onPress={() => Linking.openURL(ENAIRE_NOTAM_URL).catch(() => {})}
          style={{ marginTop: space.sm, minHeight: 36, justifyContent: 'center' }}
        >
          <Text style={[emphasize(type.subheadline), { color: p.tint }]}>
            {t('notam.openEnaire')}
          </Text>
        </Pressable>
      </Card>
    );
  }

  const list = notams;
  const active = list.filter((n) => n.activeNow);
  const upcoming = list.filter((n) => !n.activeNow);
  const warn = systemColor('orange', p);

  return (
    <Card>
      <SectionTitle>{t('notam.title')}</SectionTitle>

      {list.length === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Ionicons name="checkmark-circle" size={24} color={systemColor('green', p)} />
          <Text style={[type.callout, { color: p.label, flex: 1 }]}>{t('notam.none')}</Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="megaphone" size={24} color={warn} />
            <Text style={[type.callout, { color: p.label, flex: 1 }]}>
              {active.length > 0
                ? t(
                    'notam.active',
                    active.length,
                    upcoming.length ? t('notam.andUpcoming', upcoming.length) : '',
                  )
                : t('notam.upcoming', upcoming.length)}
            </Text>
          </View>
          <View style={{ backgroundColor: p.surfaceSunken, borderRadius: radius.md, overflow: 'hidden' }}>
            {list.slice(0, 6).map((n, i) => (
              <View key={n.id + n.fromLabel}>
                {i > 0 ? <Separator inset={space.md} /> : null}
                <NotamRow notam={n} />
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.md }]}>
        {t('notam.footnote')}
      </Text>
    </Card>
  );
}

function NotamRow({ notam }: { notam: Notam }) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const warn = systemColor('orange', p);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          padding: space.md,
          minHeight: 52,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: notam.activeNow ? warn : p.labelTertiary,
          }}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={[emphasize(type.subheadline), { color: p.label }]}>{notam.id}</Text>
            <Chip
              label={notam.activeNow ? t('notam.chipActive') : t('notam.chipScheduled')}
              color={notam.activeNow ? warn : p.labelSecondary}
            />
          </View>
          <Text style={[type.caption, { color: p.labelSecondary }]} numberOfLines={1}>
            {notam.fromLabel} → {notam.toLabel}
          </Text>
        </View>
        <Chevron open={open} color={p.labelTertiary} size={15} />
      </Pressable>

      <Collapsible open={open}>
        <View style={{ paddingHorizontal: space.md, paddingBottom: space.md, gap: space.sm }}>
          {notam.schedule ? <Row label={t('notam.rowSchedule')} value={notam.schedule} /> : null}
          {notam.levels ? <Row label={t('notam.rowLevels')} value={notam.levels} /> : null}
          {notam.lowerM !== null && notam.upperM !== null ? (
            <Row label={t('notam.rowEquals')} value={`${notam.lowerM} – ${notam.upperM} m`} />
          ) : null}
          <Text style={[type.footnote, { color: p.label }]}>{notam.text}</Text>
        </View>
      </Collapsible>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Text style={[type.caption, { color: p.labelTertiary, width: 68 }]}>{label}</Text>
      <Text style={[type.caption, { color: p.labelSecondary, flex: 1 }]}>{value}</Text>
    </View>
  );
}
