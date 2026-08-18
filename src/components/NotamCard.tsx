import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, space, type } from '../theme';
import { getNotamsAt, type Notam } from '../api/notam';
import { Card, Chip, SectionTitle, SkeletonRows } from './ui';
import { Chevron, Collapsible } from './motion';
import type { Coords } from '../types';

const ENAIRE_NOTAM_URL = 'https://drones.enaire.es/';

/**
 * Avisos temporales. Son los que te pillan por sorpresa: ejercicios militares,
 * espectáculos aéreos, zonas activadas sólo unos días.
 */
export function NotamCard({ coords }: { coords: Coords }) {
  const p = usePalette();
  const [notams, setNotams] = useState<Notam[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    getNotamsAt(coords.lat, coords.lon, controller.signal)
      .then((n) => !controller.signal.aborted && setNotams(n))
      .catch(() => !controller.signal.aborted && setFailed(true))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [coords.lat, coords.lon]);

  if (loading) {
    return (
      <Card>
        <SectionTitle>Avisos temporales (NOTAM)</SectionTitle>
        <SkeletonRows rows={1} />
      </Card>
    );
  }

  if (failed) {
    return (
      <Card>
        <SectionTitle>Avisos temporales (NOTAM)</SectionTitle>
        <Text style={[type.caption, { color: p.textMuted }]}>
          No se han podido consultar los NOTAM. Compruébalos en el visor oficial antes de volar.
        </Text>
        <Pressable
          onPress={() => Linking.openURL(ENAIRE_NOTAM_URL).catch(() => {})}
          style={{ marginTop: space.sm }}
        >
          <Text style={[type.caption, { color: p.accent, textDecorationLine: 'underline' }]}>
            Abrir ENAIRE Drones
          </Text>
        </Pressable>
      </Card>
    );
  }

  const list = notams ?? [];
  const active = list.filter((n) => n.activeNow);
  const upcoming = list.filter((n) => !n.activeNow);
  const warn = p.scheme === 'dark' ? '#E8A33D' : '#8F5300';

  return (
    <Card>
      <SectionTitle>Avisos temporales (NOTAM)</SectionTitle>

      {list.length === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#07835A" />
          <Text style={[type.body, { color: p.text, flex: 1 }]}>
            No hay ningún NOTAM publicado sobre este punto.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="megaphone" size={22} color={warn} />
            <Text style={[type.body, { color: p.text, flex: 1 }]}>
              {active.length > 0
                ? `${active.length} ${active.length === 1 ? 'aviso en vigor' : 'avisos en vigor'} sobre este punto${upcoming.length ? ` y ${upcoming.length} más por venir` : ''}.`
                : `${upcoming.length} ${upcoming.length === 1 ? 'aviso programado' : 'avisos programados'} sobre este punto.`}
            </Text>
          </View>
          {list.slice(0, 6).map((n) => (
            <NotamRow key={n.id + n.fromLabel} notam={n} />
          ))}
        </View>
      )}

      <Text style={[type.caption, { color: p.textFaint, fontSize: 12, marginTop: space.md }]}>
        Fuente: servicio de NOTAM para UAS de ENAIRE. El horario viene en texto libre y no se
        interpreta: léelo. Un NOTAM en vigor puede prohibir el vuelo aunque las zonas salgan en verde.
      </Text>
    </Card>
  );
}

function NotamRow({ notam }: { notam: Notam }) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const warn = p.scheme === 'dark' ? '#E8A33D' : '#8F5300';

  return (
    <View
      style={{
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: notam.activeNow ? warn + '66' : p.cardBorder,
        backgroundColor: notam.activeNow ? warn + (p.scheme === 'dark' ? '14' : '0D') : 'transparent',
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, minHeight: 52 }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={[type.captionStrong, { color: p.text }]}>{notam.id}</Text>
            <Chip label={notam.activeNow ? 'En vigor' : 'Programado'} color={notam.activeNow ? warn : p.textMuted} />
          </View>
          <Text style={[type.caption, { color: p.textMuted, fontSize: 12 }]} numberOfLines={1}>
            {notam.fromLabel} → {notam.toLabel}
          </Text>
        </View>
        <Chevron open={open} color={p.textFaint} size={16} />
      </Pressable>

      <Collapsible open={open}>
        <View style={{ paddingHorizontal: space.md, paddingBottom: space.md, gap: space.sm }}>
          {notam.schedule ? (
            <Row label="Horario" value={notam.schedule} />
          ) : null}
          {notam.levels ? <Row label="Alturas" value={notam.levels} /> : null}
          {notam.lowerM !== null && notam.upperM !== null ? (
            <Row label="Equivale a" value={`${notam.lowerM} – ${notam.upperM} m`} />
          ) : null}
          <Text style={[type.caption, { color: p.text }]}>{notam.text}</Text>
        </View>
      </Collapsible>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Text style={[type.caption, { color: p.textFaint, fontSize: 12, width: 68 }]}>{label}</Text>
      <Text style={[type.caption, { color: p.textMuted, fontSize: 12, flex: 1 }]}>{value}</Text>
    </View>
  );
}
