import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, shadow, space, systemColor, type, verdictStyles, emphasize, tabular } from '../theme';
import type { EvaluatedZone } from '../types';
import {
  layerColor,
  layerLabel,
  reasonExplain,
  reasonLabel,
  zoneTypeExplain,
  zoneTypeLabel,
} from '../logic/labels';
import { actionAdvice, rawBandLabel, verticalBandShort } from '../logic/verdict';
import { toParagraphs } from '../logic/html';
import { Chip, GhostButton, Separator } from './ui';
import { buildMailto, missingOperatorFields } from '../logic/request';
import { useSettings } from '../state/SettingsContext';
import type { QueryResult } from '../types';
import { Chevron, Collapsible } from './motion';

const TYPE_TINT: Record<string, keyof typeof verdictStyles> = {
  PROHIBITED: 'PROHIBIDO',
  REQ_AUTHORIZATION: 'AUTORIZACION',
  CONDITIONAL: 'CONDICIONES',
  NO_RESTRICTION: 'LIBRE',
  UNKNOWN: 'DESCONOCIDO',
};

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  PROHIBITED: 'close-circle',
  REQ_AUTHORIZATION: 'shield-half',
  CONDITIONAL: 'alert-circle',
  NO_RESTRICTION: 'checkmark-circle',
  UNKNOWN: 'help-circle',
};

/**
 * Una zona. Plegada es una fila de lista; desplegada enseña todo.
 *
 * La fila sigue la forma de una lista agrupada del sistema: un símbolo con
 * color a la izquierda, dos líneas de texto y la punta de flecha a la derecha.
 * El color vive sólo en el símbolo, que es donde significa algo; la fila no se
 * tiñe ni se enmarca.
 */
export function ZoneCard({
  zone,
  dimmed,
  defaultOpen,
  /** Contexto necesario para preparar la solicitud de autorización por correo. */
  requestContext,
}: {
  zone: EvaluatedZone;
  dimmed?: boolean;
  defaultOpen?: boolean;
  requestContext?: { result: QueryResult; place?: string | null };
}) {
  const p = usePalette();
  const { operator, drone } = useSettings();
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [openOfficial, setOpenOfficial] = useState(false);

  const level = TYPE_TINT[zone.type] ?? 'DESCONOCIDO';
  const tint = zone.advisory
    ? p.tint
    : p.scheme === 'dark'
      ? verdictStyles[level].onDark
      : verdictStyles[level].onLight;
  const symbolColor = dimmed ? p.labelTertiary : tint;
  const paragraphs = toParagraphs(zone.officialText);

  const contactLinks: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string; url: string }> = [];
  if (zone.contact.email)
    contactLinks.push({ icon: 'mail-outline', text: zone.contact.email, url: `mailto:${zone.contact.email}` });
  if (zone.contact.phone)
    contactLinks.push({ icon: 'call-outline', text: zone.contact.phone, url: `tel:${zone.contact.phone.replace(/\s+/g, '')}` });
  if (zone.contact.url)
    contactLinks.push({ icon: 'globe-outline', text: zone.contact.url, url: zone.contact.url });

  const mailto =
    requestContext && !zone.advisory && zone.type !== 'NO_RESTRICTION' && zone.contact.email
      ? buildMailto(zone, {
          result: requestContext.result,
          place: requestContext.place,
          operator,
          drone,
        })
      : null;
  const missing = missingOperatorFields(operator);

  const subtitle = zone.advisory
    ? 'Aviso de ENAIRE para toda España'
    : `${zoneTypeLabel[zone.type]} · ${verticalBandShort(zone)}`;

  return (
    <View
      style={[
        {
          backgroundColor: p.surface,
          borderRadius: radius.lg,
          overflow: 'hidden',
          opacity: dimmed ? 0.72 : 1,
        },
        shadow.chip,
      ]}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${zone.title}. ${subtitle}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          minHeight: 64,
          backgroundColor: pressed ? p.surfaceSunken : 'transparent',
        })}
      >
        <Ionicons
          name={zone.advisory ? 'megaphone' : (TYPE_ICON[zone.type] ?? 'help-circle')}
          size={22}
          color={symbolColor}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.subheadline, emphasize(type.subheadline), { color: p.label }]} numberOfLines={2}>
            {zone.title}
          </Text>
          <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Chevron open={open} color={p.labelTertiary} size={15} />
      </Pressable>

      <Collapsible open={open}>
        <Separator inset={space.lg} />
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {zone.advisory ? (
              <Chip label="Aviso general" color={p.tint} icon="megaphone-outline" />
            ) : (
              <Chip label={zoneTypeLabel[zone.type]} color={tint} icon="shield-outline" />
            )}
            <Chip label={layerLabel[zone.layer]} color={layerColor[zone.layer]} />
            {zone.vertical.usedReferencePoint ? (
              <Chip label="Alturas desde el aeródromo" color={p.tint} icon="git-compare-outline" />
            ) : null}
            {zone.timing !== 'PERMANENTE' ? (
              <Chip
                label={zone.timing === 'CADUCADA' ? 'No vigente' : 'Aplicación limitada'}
                color={systemColor('orange', p)}
                icon="time-outline"
              />
            ) : null}
            <Chip label={zone.identifier} />
          </View>

          {!zone.advisory ? (
            <Text style={[type.callout, { color: p.label }]}>{zoneTypeExplain[zone.type]}</Text>
          ) : null}

          {zone.reasons.length > 0 && !zone.advisory ? (
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              {zone.reasons.map((r) => reasonExplain[r] ?? `Motivo: ${reasonLabel[r] ?? r}.`).join(' ')}
            </Text>
          ) : null}

          <View
            style={{
              backgroundColor: p.surfaceSunken,
              borderRadius: radius.md,
              padding: space.md,
              flexDirection: 'row',
              gap: space.sm + 2,
            }}
          >
            <Ionicons name="navigate-circle" size={18} color={p.tint} style={{ marginTop: 1 }} />
            <Text style={[type.footnote, { color: p.label, flex: 1 }]}>{actionAdvice(zone)}</Text>
          </View>

          {mailto ? (
            <View style={{ gap: space.sm }}>
              <GhostButton
                label="Preparar solicitud por correo"
                icon="mail-open-outline"
                onPress={() => Linking.openURL(mailto).catch(() => {})}
              />
              <Text style={[type.footnote, { color: p.labelTertiary }]}>
                {missing.length > 0
                  ? `Se abrirá tu correo con la solicitud redactada. Te falta por rellenar en Ajustes: ${missing.join(', ')}; esos huecos aparecerán como [COMPLETAR].`
                  : 'Se abrirá tu app de correo con la solicitud ya redactada y tus datos rellenados. Revísala antes de enviarla: la envías tú, no la app.'}
              </Text>
            </View>
          ) : null}

          {contactLinks.length > 0 ? (
            <View style={{ gap: space.sm }}>
              {contactLinks.map((c) => (
                <Pressable
                  key={c.url}
                  onPress={() => Linking.openURL(c.url).catch(() => {})}
                  accessibilityRole="link"
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                    opacity: pressed ? 0.6 : 1,
                    minHeight: 32,
                  })}
                >
                  <Ionicons name={c.icon} size={15} color={p.tint} />
                  <Text style={[type.footnote, { color: p.tint, flex: 1 }]} numberOfLines={1}>
                    {c.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {!zone.advisory ? (
            <Text style={[type.footnote, { color: p.labelTertiary }]}>{zone.vertical.explanation}</Text>
          ) : null}

          {zone.timingNote ? (
            <Text style={[type.footnote, { color: systemColor('orange', p) }]}>
              {zone.timingNote}
            </Text>
          ) : null}

          <Separator />

          <Pressable
            onPress={() => setOpenOfficial((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: openOfficial }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 }}
          >
            <Chevron open={openOfficial} color={p.tint} size={14} />
            <Text style={[emphasize(type.footnote), { color: p.tint }]}>Detalle oficial de ENAIRE</Text>
          </Pressable>

          <Collapsible open={openOfficial}>
            <View style={{ gap: space.sm }}>
              {paragraphs.length > 0 ? (
                paragraphs.map((para, i) => (
                  <Text key={i} style={[type.footnote, { color: p.label }]}>
                    {para}
                  </Text>
                ))
              ) : (
                <Text style={[type.footnote, { color: p.labelSecondary, fontStyle: 'italic' }]}>
                  ENAIRE no publica un texto descriptivo para esta zona. La información disponible es
                  la de los campos estructurados que aparecen debajo.
                </Text>
              )}
              <View style={{ marginTop: space.xs, backgroundColor: p.surfaceSunken, borderRadius: radius.md }}>
                <TechRow label="Identificador" value={zone.identifier} />
                <TechRow label="Tipo (ED-318)" value={zone.type} />
                <TechRow label="Motivos" value={zone.reasons.join(', ') || '—'} />
                <TechRow label="Límites publicados" value={rawBandLabel(zone)} />
                <TechRow label="Capa" value={layerLabel[zone.layer]} />
                {zone.updatedAt ? (
                  <TechRow label="Actualizada" value={zone.updatedAt.replace('T', ' ')} last />
                ) : null}
              </View>
            </View>
          </Collapsible>
        </View>
      </Collapsible>
    </View>
  );
}

function TechRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: space.md,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: p.separator,
      }}
    >
      <Text style={[type.caption, { color: p.labelSecondary }]}>{label}</Text>
      <Text
        style={[type.caption, tabular, { color: p.label, flexShrink: 1, textAlign: 'right' }]}
      >
        {value}
      </Text>
    </View>
  );
}
