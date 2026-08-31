import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePalette } from '../hooks/useTheme';
import { getLocale, t } from '../i18n';
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
import { missingRequestFields } from '../logic/request';
import { coordinationFor, coordinationPriority } from '../logic/coordination';
import { useSettings } from '../state/SettingsContext';
import { useFleet } from '../state/FleetContext';
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
  const router = useRouter();
  const { operator, drone } = useSettings();
  const { activeDrone } = useFleet();
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

  /**
   * Con quién se tramita y por dónde. Antes esto se sacaba de los campos
   * estructurados de ENAIRE, que en los CTR y los ATZ vienen vacíos: el
   * contacto vive dentro del HTML del mensaje y se perdía por el camino. Ahora
   * lo resuelve `coordination.ts`, que además sabe distinguir a ENAIRE de
   * Skyway, Saerco, Aena o una dependencia militar.
   */
  const coordination = coordinationFor(zone);
  const contacts = coordination?.contacts ?? { emails: [], phones: [], urls: [] };

  const contactLinks: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string; url: string }> = [
    ...contacts.emails.map((e) => ({
      icon: 'mail-outline' as const,
      text: e,
      url: `mailto:${e}`,
    })),
    ...contacts.phones.map((ph) => ({
      icon: 'call-outline' as const,
      text: ph,
      url: `tel:${ph.replace(/[\s()-]/g, '')}`,
    })),
    // La plataforma tiene su propio botón arriba: repetirla aquí sólo estorba.
    ...contacts.urls
      .filter((u) => !(coordination?.viaPlatform && u.includes('planea')))
      .map((u) => ({ icon: 'globe-outline' as const, text: u, url: u })),
  ];

  /**
   * La solicitud ya no se abre desde aquí. Antes este botón lanzaba el cliente
   * de correo con un borrador a medio escribir y el piloto terminaba de
   * rellenarlo allí dentro; ahora lleva a una pantalla que pregunta lo que
   * falta —fecha, horas, altura, para qué— antes de redactar nada.
   */
  const canRequest = Boolean(requestContext && contacts.emails.length > 0);
  const missing = missingRequestFields(operator, activeDrone);

  const leadLabel =
    coordination?.leadHours != null
      ? coordination.leadHours >= 24 && coordination.leadHours % 24 === 0
        ? t('zoneCard.leadDays', coordination.leadHours / 24)
        : t('zoneCard.leadHours', coordination.leadHours)
      : null;

  const subtitle = zone.advisory
    ? t('zoneCard.advisorySubtitle')
    : t('zoneCard.subtitle', zoneTypeLabel(zone.type), verticalBandShort(zone));

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
        accessibilityLabel={t('zoneCard.a11y', zone.title, subtitle)}
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
              <Chip label={t('zoneCard.chipAdvisory')} color={p.tint} icon="megaphone-outline" />
            ) : (
              <Chip label={zoneTypeLabel(zone.type)} color={tint} icon="shield-outline" />
            )}
            <Chip label={layerLabel(zone.layer)} color={layerColor[zone.layer]} />
            {zone.vertical.usedReferencePoint ? (
              <Chip
                label={t('zoneCard.chipReferencePoint')}
                color={p.tint}
                icon="git-compare-outline"
              />
            ) : null}
            {zone.timing !== 'PERMANENTE' ? (
              <Chip
                label={
                  zone.timing === 'CADUCADA'
                    ? t('zoneCard.chipExpired')
                    : t('zoneCard.chipLimited')
                }
                color={systemColor('orange', p)}
                icon="time-outline"
              />
            ) : null}
            <Chip label={zone.identifier} />
          </View>

          {!zone.advisory ? (
            <Text style={[type.callout, { color: p.label }]}>{zoneTypeExplain(zone.type)}</Text>
          ) : null}

          {zone.reasons.length > 0 && !zone.advisory ? (
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              {zone.reasons
                .map((r) => reasonExplain(r) ?? t('reason.fallback', reasonLabel(r)))
                .join(' ')}
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

          {coordination ? (
            <View style={{ gap: space.sm }}>
              {/* Sin nombre pero con contacto no es «no se sabe»: es un gestor
                  que no está en la lista, y sus direcciones salen aquí debajo.
                  Decir que ENAIRE no publica nada sería mentira. */}
              {coordination.name || contactLinks.length === 0 || leadLabel ? (
                <Text style={[type.footnote, { color: p.labelSecondary }]}>
                  {coordination.name
                    ? t('zoneCard.managedBy', coordination.name)
                    : contactLinks.length === 0
                      ? t('zoneCard.managerUnknown')
                      : ''}
                  {leadLabel ? (coordination.name ? ` ${leadLabel}` : leadLabel) : ''}
                </Text>
              ) : null}
              {/* La EARO sólo tiene sentido en espacio aéreo controlado y en
                  el entorno de un aeródromo: es lo que exige el capítulo V del
                  RD 517/2024. Ofrecerla en una zona de ferrocarril o en una
                  restricción de vuelo fotográfico sería mandar al piloto a
                  redactar un documento que allí no le pide nadie. */}
              {requestContext && coordinationPriority(zone) <= 5 ? (
                <GhostButton
                  label={t('zoneCard.earoButton')}
                  icon="document-text-outline"
                  onPress={() =>
                    router.push({
                      pathname: '/earo',
                      params: {
                        lat: String(requestContext.result.coords.lat),
                        lon: String(requestContext.result.coords.lon),
                        height: String(requestContext.result.flightHeightAgl),
                      },
                    })
                  }
                />
              ) : null}

              {coordination.viaPlatform && coordination.platformUrl ? (
                <>
                  <GhostButton
                    label={t('zoneCard.openPlanea')}
                    icon="open-outline"
                    onPress={() => Linking.openURL(coordination.platformUrl!).catch(() => {})}
                  />
                  <Text style={[type.caption, { color: p.labelTertiary }]}>
                    {t('zoneCard.planeaNote')}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}

          {canRequest && requestContext ? (
            <View style={{ gap: space.sm }}>
              <GhostButton
                label={t('zoneCard.requestButton')}
                icon="mail-open-outline"
                onPress={() =>
                  router.push({
                    pathname: '/solicitud',
                    params: {
                      lat: String(requestContext.result.coords.lat),
                      lon: String(requestContext.result.coords.lon),
                      zone: zone.identifier,
                      label: requestContext.place ?? '',
                      height: String(requestContext.result.flightHeightAgl),
                    },
                  })
                }
              />
              <Text style={[type.footnote, { color: p.labelTertiary }]}>
                {missing.length > 0
                  ? t('zoneCard.requestMissing', missing.join(', '))
                  : t('zoneCard.requestReady')}
                {/* El correo va siempre en español, aunque la app esté en inglés:
                    lo lee el gestor de la zona, no el piloto. */}
                {getLocale() === 'es' ? '' : ' ' + t('zoneCard.requestSpanish')}
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
            <Text style={[emphasize(type.footnote), { color: p.tint }]}>
              {t('zoneCard.officialDetail')}
            </Text>
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
                  {t('zoneCard.noOfficialText')}
                </Text>
              )}
              <View style={{ marginTop: space.xs, backgroundColor: p.surfaceSunken, borderRadius: radius.md }}>
                <TechRow label={t('zoneCard.techIdentifier')} value={zone.identifier} />
                <TechRow label={t('zoneCard.techType')} value={zone.type} />
                <TechRow label={t('zoneCard.techReasons')} value={zone.reasons.join(', ') || '—'} />
                <TechRow label={t('zoneCard.techLimits')} value={rawBandLabel(zone)} />
                <TechRow label={t('zoneCard.techLayer')} value={layerLabel(zone.layer)} />
                {zone.updatedAt ? (
                  <TechRow
                    label={t('zoneCard.techUpdated')}
                    value={zone.updatedAt.replace('T', ' ')}
                    last
                  />
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
