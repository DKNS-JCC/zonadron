import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, shadow, space, type, verdictStyles } from '../theme';
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
import { Chip, Divider, GhostButton } from './ui';
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

/**
 * Una zona. Plegada ocupa una fila; desplegada enseña todo.
 *
 * Antes cada tarjeta repetía íntegra la explicación genérica del tipo de zona,
 * así que un resultado de cuatro zonas eran cuatro párrafos idénticos y más de
 * dos mil píxeles de scroll.
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
    ? p.accent
    : p.scheme === 'dark'
      ? verdictStyles[level].onDark
      : verdictStyles[level].onLight;
  const barColor = dimmed ? p.cardBorder : tint;
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
          backgroundColor: p.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: p.cardBorder,
          overflow: 'hidden',
          opacity: dimmed ? 0.8 : 1,
        },
        shadow,
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
          backgroundColor: pressed ? p.accentSoft : 'transparent',
          minHeight: 68,
        })}
      >
        <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: barColor }} />
        <View style={{ flex: 1, paddingVertical: space.md, paddingHorizontal: space.md + 2, gap: 3 }}>
          <Text style={[type.subtitle, { color: p.text }]} numberOfLines={2}>
            {zone.title}
          </Text>
          <Text style={[type.caption, { color: tint }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={{ paddingRight: space.md }}>
          <Chevron open={open} color={p.textFaint} />
        </View>
      </Pressable>

      <Collapsible open={open}>
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {zone.advisory ? (
              <Chip label="Aviso general" color={p.accent} icon="megaphone-outline" />
            ) : (
              <Chip label={zoneTypeLabel[zone.type]} color={tint} icon="shield-outline" />
            )}
            <Chip label={layerLabel[zone.layer]} color={layerColor[zone.layer]} />
            {zone.vertical.usedReferencePoint ? (
              <Chip label="Alturas desde el aeródromo" color={p.accent} icon="git-compare-outline" />
            ) : null}
            {zone.timing !== 'PERMANENTE' ? (
              <Chip
                label={zone.timing === 'CADUCADA' ? 'No vigente' : 'Aplicación limitada'}
                color={p.scheme === 'dark' ? '#E8A33D' : '#8F5300'}
                icon="time-outline"
              />
            ) : null}
            <Chip label={zone.identifier} />
          </View>

          {!zone.advisory ? (
            <Text style={[type.body, { color: p.text }]}>{zoneTypeExplain[zone.type]}</Text>
          ) : null}

          {zone.reasons.length > 0 && !zone.advisory ? (
            <Text style={[type.caption, { color: p.textMuted }]}>
              {zone.reasons.map((r) => reasonExplain[r] ?? `Motivo: ${reasonLabel[r] ?? r}.`).join(' ')}
            </Text>
          ) : null}

          <View
            style={{
              backgroundColor: p.accentSoft,
              borderRadius: radius.md,
              padding: space.md,
              flexDirection: 'row',
              gap: space.sm + 2,
            }}
          >
            <Ionicons name="navigate-circle" size={18} color={p.accent} style={{ marginTop: 1 }} />
            <Text style={[type.caption, { color: p.text, flex: 1 }]}>{actionAdvice(zone)}</Text>
          </View>

          {mailto ? (
            <View style={{ gap: space.sm }}>
              <GhostButton
                label="Preparar solicitud por correo"
                icon="mail-open-outline"
                onPress={() => Linking.openURL(mailto).catch(() => {})}
              />
              <Text style={[type.caption, { color: p.textFaint }]}>
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
                  <Ionicons name={c.icon} size={15} color={p.accent} />
                  <Text
                    style={[type.caption, { color: p.accent, flex: 1, textDecorationLine: 'underline' }]}
                    numberOfLines={1}
                  >
                    {c.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {!zone.advisory ? (
            <Text style={[type.caption, { color: p.textFaint }]}>{zone.vertical.explanation}</Text>
          ) : null}

          {zone.timingNote ? (
            <Text
              style={[type.caption, { color: p.scheme === 'dark' ? '#E8A33D' : '#8F5300' }]}
            >
              {zone.timingNote}
            </Text>
          ) : null}

          <Divider spaced={false} />

          <Pressable
            onPress={() => setOpenOfficial((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: openOfficial }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 }}
          >
            <Chevron open={openOfficial} color={p.accent} size={16} />
            <Text style={[type.captionStrong, { color: p.accent }]}>
              Detalle oficial de ENAIRE
            </Text>
          </Pressable>

          <Collapsible open={openOfficial}>
            <View style={{ gap: space.sm }}>
              {paragraphs.length > 0 ? (
                paragraphs.map((para, i) => (
                  <Text key={i} style={[type.caption, { color: p.text }]}>
                    {para}
                  </Text>
                ))
              ) : (
                <Text style={[type.caption, { color: p.textMuted, fontStyle: 'italic' }]}>
                  ENAIRE no publica un texto descriptivo para esta zona. La información disponible es
                  la de los campos estructurados que aparecen debajo.
                </Text>
              )}
              <Divider spaced={false} />
              <View style={{ gap: 3 }}>
                <TechRow label="Identificador" value={zone.identifier} />
                <TechRow label="Tipo (ED-318)" value={zone.type} />
                <TechRow label="Motivos" value={zone.reasons.join(', ') || '—'} />
                <TechRow label="Límites publicados" value={rawBandLabel(zone)} />
                <TechRow label="Capa" value={layerLabel[zone.layer]} />
                {zone.updatedAt ? (
                  <TechRow label="Actualizada" value={zone.updatedAt.replace('T', ' ')} />
                ) : null}
              </View>
            </View>
          </Collapsible>
        </View>
      </Collapsible>
    </View>
  );
}

function TechRow({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Text style={[type.caption, { color: p.textFaint, fontSize: 12 }]}>{label}</Text>
      <Text
        style={[type.caption, { color: p.textMuted, fontSize: 12, flexShrink: 1, textAlign: 'right' }]}
      >
        {value}
      </Text>
    </View>
  );
}
