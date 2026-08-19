import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
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
        <SectionTitle>Avisos temporales (NOTAM)</SectionTitle>
        <Text style={[type.callout, { color: p.label }]}>
          No se han podido consultar los NOTAM. Compruébalos en el visor oficial antes de volar.
        </Text>
        <Pressable
          onPress={() => Linking.openURL(ENAIRE_NOTAM_URL).catch(() => {})}
          style={{ marginTop: space.sm, minHeight: 36, justifyContent: 'center' }}
        >
          <Text style={[emphasize(type.subheadline), { color: p.tint }]}>Abrir ENAIRE Drones</Text>
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
      <SectionTitle>Avisos temporales (NOTAM)</SectionTitle>

      {list.length === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Ionicons name="checkmark-circle" size={24} color={systemColor('green', p)} />
          <Text style={[type.callout, { color: p.label, flex: 1 }]}>
            No hay ningún NOTAM publicado sobre este punto.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="megaphone" size={24} color={warn} />
            <Text style={[type.callout, { color: p.label, flex: 1 }]}>
              {active.length > 0
                ? `${active.length} ${active.length === 1 ? 'aviso en vigor' : 'avisos en vigor'} sobre este punto${upcoming.length ? ` y ${upcoming.length} más por venir` : ''}.`
                : `${upcoming.length} ${upcoming.length === 1 ? 'aviso programado' : 'avisos programados'} sobre este punto.`}
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
        Fuente: servicio de NOTAM para UAS de ENAIRE. El horario viene en texto libre y no se
        interpreta: léelo. Un NOTAM en vigor puede prohibir el vuelo aunque las zonas salgan en verde.
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
              label={notam.activeNow ? 'En vigor' : 'Programado'}
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
          {notam.schedule ? <Row label="Horario" value={notam.schedule} /> : null}
          {notam.levels ? <Row label="Alturas" value={notam.levels} /> : null}
          {notam.lowerM !== null && notam.upperM !== null ? (
            <Row label="Equivale a" value={`${notam.lowerM} – ${notam.upperM} m`} />
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
