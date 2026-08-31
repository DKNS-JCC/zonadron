import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenScroll } from '../src/components/Screen';
import { Banner, Card, GhostButton, PrimaryButton, SectionTitle, SkeletonRows } from '../src/components/ui';
import { Field } from '../src/components/Field';
import { HeightControl } from '../src/components/HeightControl';
import { DateField, TimeField } from '../src/components/DateTimeField';
import { Segmented, Select, type Option } from '../src/components/Select';
import { Chevron, Collapsible } from '../src/components/motion';
import { usePalette } from '../src/hooks/useTheme';
import { useSettings } from '../src/state/SettingsContext';
import { useFleet } from '../src/state/FleetContext';
import { useDocuments } from '../src/state/DocumentsContext';
import { checkPoint } from '../src/logic/query';
import {
  buildMailto,
  buildRequestBody,
  missingOperatorFields,
} from '../src/logic/request';
import { missingDroneFields } from '../src/logic/fleet';
import {
  checkLeadTime,
  durationLabel,
  emptyOperation,
  missingOperationFields,
  purposeLabel,
  PURPOSE_IDS,
  timeRangeLabel,
  type Daylight,
  type FlightMode,
  type OperationDetails,
  type PurposeId,
} from '../src/logic/operation';
import { coordinationFor, coordinationsFor } from '../src/logic/coordination';
import { openStored } from '../src/documents/files';
import { t } from '../src/i18n';
import { radius, space, systemColor, type } from '../src/theme';
import type { EvaluatedZone, QueryResult } from '../src/types';

/**
 * La solicitud, preguntada en vez de escrita a mano.
 *
 * Antes esta pantalla no existía: la tarjeta de la zona abría directamente el
 * cliente de correo con un borrador lleno de `[COMPLETAR]`, y el piloto los
 * rellenaba allí, con el pulgar, normalmente de pie y con prisa. De ahí salió
 * una solicitud real pidiendo volar el mismo día, con la altura escrita en
 * prosa y sin adjuntar el único papel que luego le pidieron.
 *
 * Así que aquí se pregunta antes: cuándo, con qué, para qué y con qué papeles.
 * Lo que la app ya sabe —tus datos, el dron, la zona, el terreno— viene puesto;
 * lo que no puede saber tiene su campo, con selector de fecha y hora del
 * sistema para que no haya forma de escribir un 31 de febrero.
 *
 * La consulta a ENAIRE se rehace cuando cambias la altura, igual que en la
 * pantalla de resultado: subir de 60 a 120 m puede meterte en zonas que antes
 * no te afectaban, y sería grave preparar la solicitud contra la lista vieja.
 */
export default function SolicitudScreen() {
  const p = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{
    lat?: string;
    lon?: string;
    zone?: string;
    label?: string;
    height?: string;
  }>();

  const { operator, drone: droneProfile, flightHeight } = useSettings();
  const { drones, activeId } = useFleet();
  const { documents, forOwner } = useDocuments();

  const lat = Number(params.lat);
  const lon = Number(params.lon);
  const valid = Number.isFinite(lat) && Number.isFinite(lon);
  const startHeight = Number(params.height) || flightHeight;

  const [operation, setOperation] = useState<OperationDetails>(() =>
    emptyOperation(startHeight, activeId),
  );
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const patch = useCallback((next: Partial<OperationDetails>) => {
    setOperation((prev) => ({ ...prev, ...next }));
  }, []);

  /* --- La consulta, y su repetición cuando cambia la altura ---------- */

  const run = useCallback(
    async (height: number) => {
      if (!valid) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const res = await checkPoint({ lat, lon }, height, controller.signal);
        if (controller.signal.aborted) return;
        setResult(res);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : t('point.unexpectedError'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [lat, lon, valid],
  );

  // Se espera un momento antes de repetir la consulta: mientras se arrastra el
  // control de altura no tiene sentido lanzar una petición por cada metro.
  useEffect(() => {
    const timer = setTimeout(() => {
      void run(operation.heightAgl);
    }, 500);
    return () => clearTimeout(timer);
  }, [run, operation.heightAgl]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /* --- A qué zona se le pide ---------------------------------------- */

  /**
   * A qué zona se le pide. Normalmente viene dicho desde la tarjeta que has
   * tocado; si no, se coge la primera por orden de trámite —el aeródromo antes
   * que el ATZ, y el ATZ antes que el CTR, como pide ENAIRE en su guía— y de
   * entre ésas, la primera a la que se le pueda escribir.
   */
  const zone: EvaluatedZone | null = useMemo(() => {
    const affecting = result?.verdict.affecting ?? [];
    if (affecting.length === 0) return null;
    const wanted = (params.zone ?? '').trim();
    const named = affecting.find((z) => z.identifier === wanted);
    if (named) return named;
    const ordered = coordinationsFor(affecting);
    const withEmail = ordered.find((c) => c.contacts.emails.length > 0);
    return (withEmail?.zone as EvaluatedZone | undefined) ?? affecting[0];
  }, [result, params.zone]);

  /* --- Lo que falta --------------------------------------------------- */

  const aircraft = useMemo(
    () => drones.find((d) => d.id === operation.droneId) ?? null,
    [drones, operation.droneId],
  );
  const missing = [
    ...missingOperatorFields(operator),
    ...missingDroneFields(aircraft),
    ...missingOperationFields(operation),
  ];
  const lead = checkLeadTime(operation, result?.zones ?? []);

  const attachments = useMemo(() => {
    const mine = [...forOwner(null), ...(operation.droneId ? forOwner(operation.droneId) : [])];
    return mine;
  }, [forOwner, operation.droneId, documents]);

  const attachmentTitles = attachments
    .filter((d) => operation.attachments.includes(d.id))
    .map((d) => d.title);

  const requestContext =
    result && zone
      ? {
          result,
          place: params.label ?? null,
          operator,
          drone: droneProfile,
          aircraft,
          operation,
          attachmentTitles,
        }
      : null;

  const coordination = zone ? coordinationFor(zone) : null;
  const mailto = zone && requestContext ? buildMailto(zone, requestContext) : null;
  const preview = zone && requestContext ? buildRequestBody(zone, requestContext) : '';

  /* --- Opciones de los desplegables ---------------------------------- */

  const droneOptions: Option<string>[] = drones.map((d) => ({
    id: d.id,
    label: d.alias.trim() || [d.manufacturer, d.model].filter(Boolean).join(' ') || d.id,
    hint: d.serial.trim() ? d.serial : undefined,
  }));

  const purposeOptions: Option<PurposeId>[] = PURPOSE_IDS.map((id) => ({
    id,
    label: purposeLabel(id),
  }));

  const modeOptions: Option<FlightMode>[] = [
    { id: 'VLOS', label: t('solicitud.modeVlos') },
    { id: 'BVLOS', label: t('solicitud.modeBvlos') },
  ];

  const daylightOptions: Option<Daylight>[] = [
    { id: 'DIURNO', label: t('solicitud.day') },
    { id: 'NOCTURNO', label: t('solicitud.night') },
  ];

  const toggleAttachment = (id: string) => {
    setOperation((prev) => ({
      ...prev,
      attachments: prev.attachments.includes(id)
        ? prev.attachments.filter((a) => a !== id)
        : [...prev.attachments, id],
    }));
  };

  const shareAttachments = async () => {
    for (const doc of attachments) {
      if (operation.attachments.includes(doc.id)) await openStored(doc);
    }
  };

  if (!valid) {
    return (
      <ScreenScroll>
        <Stack.Screen options={{ title: t('solicitud.title') }} />
        <Banner tone="warn">{t('point.invalidCoords')}</Banner>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
      <Stack.Screen options={{ title: t('solicitud.title') }} />

      {error ? <Banner tone="warn">{error}</Banner> : null}

      {loading && !result ? (
        <Card>
          <SkeletonRows rows={4} />
        </Card>
      ) : null}

      {!loading && result && !zone ? (
        <Banner>{t('solicitud.zoneNotFound')}</Banner>
      ) : null}

      {zone ? (
        <Card>
          <SectionTitle>{t('solicitud.forZone')}</SectionTitle>
          <Text style={[type.callout, { color: p.label }]}>{zone.title}</Text>
          <Text style={[type.footnote, { color: p.labelSecondary }]}>
            {zone.identifier}
            {params.label ? ` · ${params.label}` : ''}
          </Text>
        </Card>
      ) : null}

      {/* ---------------------------- cuándo ---------------------------- */}
      <Card>
        <SectionTitle>{t('solicitud.whenTitle')}</SectionTitle>
        <View style={{ gap: space.md }}>
          <DateField
            label={t('solicitud.date')}
            value={operation.date}
            onChange={(date) => patch({ date })}
          />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <TimeField
                label={t('solicitud.start')}
                value={operation.startTime}
                onChange={(startTime) => patch({ startTime })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TimeField
                label={t('solicitud.end')}
                value={operation.endTime}
                onChange={(endTime) => patch({ endTime })}
              />
            </View>
          </View>

          {timeRangeLabel(operation) ? (
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              {timeRangeLabel(operation)} · {durationLabel(operation)}
            </Text>
          ) : null}
          <Text style={[type.caption, { color: p.labelTertiary }]}>{t('solicitud.utcNote')}</Text>

          {lead.warning ? <Banner tone="warn">{lead.warning}</Banner> : null}
        </View>
      </Card>

      {/* ---------------------------- qué ------------------------------- */}
      <Card>
        <SectionTitle>{t('solicitud.whatTitle')}</SectionTitle>
        <View style={{ gap: space.md }}>
          {droneOptions.length > 0 ? (
            <Select
              label={t('solicitud.drone')}
              value={operation.droneId}
              options={droneOptions}
              onChange={(droneId) => patch({ droneId })}
              placeholder={t('solicitud.dronePlaceholder')}
            />
          ) : (
            <GhostButton
              label={t('solicitud.noDrones')}
              icon="add-circle-outline"
              onPress={() => router.push('/perfil')}
            />
          )}

          <View style={{ gap: 6 }}>
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              {t('solicitud.height')}
            </Text>
            <HeightControl
              value={operation.heightAgl}
              onChange={(heightAgl) => patch({ heightAgl })}
            />
          </View>

          <Field
            label={t('solicitud.radius')}
            value={String(operation.radiusM)}
            onChange={(v) => patch({ radiusM: Math.max(0, Number(v.replace(/\D/g, '')) || 0) })}
            keyboardType="numeric"
            hint={t('solicitud.radiusHint')}
          />

          <Segmented
            label={t('solicitud.mode')}
            value={operation.mode}
            options={modeOptions}
            onChange={(mode) => patch({ mode })}
            hint={t('solicitud.modeHint')}
          />

          <Segmented
            label={t('solicitud.daylight')}
            value={operation.daylight}
            options={daylightOptions}
            onChange={(daylight) => patch({ daylight })}
          />
        </View>
      </Card>

      {/* ---------------------------- para qué -------------------------- */}
      <Card>
        <SectionTitle>{t('solicitud.whyTitle')}</SectionTitle>
        <View style={{ gap: space.md }}>
          <Select
            label={t('solicitud.purpose')}
            value={operation.purpose}
            options={purposeOptions}
            onChange={(purpose) => patch({ purpose })}
          />
          <Field
            label={t('solicitud.purposeDetail')}
            value={operation.purposeDetail}
            onChange={(purposeDetail) => patch({ purposeDetail })}
            hint={t('solicitud.purposeDetailHint')}
          />
          <Field
            label={t('solicitud.notes')}
            value={operation.notes}
            onChange={(notes) => patch({ notes })}
            multiline
          />
        </View>
      </Card>

      {/* ---------------------------- papeles --------------------------- */}
      <Card>
        <SectionTitle>{t('solicitud.docsTitle')}</SectionTitle>
        {attachments.length === 0 ? (
          <Text style={[type.footnote, { color: p.labelTertiary }]}>{t('solicitud.docsEmpty')}</Text>
        ) : (
          <View style={{ gap: space.xs }}>
            {attachments.map((doc) => {
              const checked = operation.attachments.includes(doc.id);
              return (
                <Pressable
                  key={doc.id}
                  onPress={() => toggleAttachment(doc.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={doc.title}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                    minHeight: 40,
                    paddingHorizontal: space.sm,
                    borderRadius: radius.sm,
                    backgroundColor: pressed ? p.surfaceSunken : 'transparent',
                  })}
                >
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={checked ? p.tint : p.labelTertiary}
                  />
                  <Text style={[type.callout, { color: p.label, flex: 1 }]} numberOfLines={1}>
                    {doc.title}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={[type.caption, { color: p.labelTertiary }]}>{t('solicitud.docsHint')}</Text>
          </View>
        )}
      </Card>

      {/* ---------------------------- enviar ---------------------------- */}
      <Card>
        <SectionTitle>{t('solicitud.sendTitle')}</SectionTitle>
        <View style={{ gap: space.md }}>
          {coordination && coordination.contacts.emails.length > 0 ? (
            <View style={{ gap: 2 }}>
              {coordination.name ? (
                <Text style={[type.footnote, { color: p.labelSecondary }]}>
                  {t('zoneCard.managedBy', coordination.name)}
                </Text>
              ) : null}
              {coordination.contacts.emails.map((email) => (
                <Text key={email} style={[type.callout, { color: p.label }]}>
                  {email}
                </Text>
              ))}
            </View>
          ) : coordination?.viaPlatform ? (
            <Banner tone="warn">{t('solicitud.viaPlanea')}</Banner>
          ) : (
            <Banner tone="warn">{t('solicitud.noRecipient')}</Banner>
          )}

          <Text
            style={[
              type.footnote,
              { color: missing.length > 0 ? systemColor('orange', p) : p.labelSecondary },
            ]}
          >
            {missing.length > 0 ? t('solicitud.missing', missing.join(', ')) : t('solicitud.ready')}
          </Text>

          <Pressable
            onPress={() => setShowPreview((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showPreview }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 }}
          >
            <Chevron open={showPreview} color={p.tint} size={14} />
            <Text style={[type.footnote, { color: p.tint }]}>{t('solicitud.preview')}</Text>
          </Pressable>
          <Collapsible open={showPreview}>
            <View
              style={{
                backgroundColor: p.surfaceSunken,
                borderRadius: radius.md,
                padding: space.md,
              }}
            >
              <Text style={[type.caption, { color: p.labelSecondary }]}>{preview}</Text>
            </View>
          </Collapsible>

          <PrimaryButton
            label={t('solicitud.open')}
            icon="mail-open-outline"
            disabled={!mailto}
            onPress={() => {
              if (mailto) Linking.openURL(mailto).catch(() => {});
            }}
          />
          {operation.attachments.length > 0 ? (
            <GhostButton
              label={t('solicitud.share')}
              icon="share-outline"
              onPress={() => {
                void shareAttachments();
              }}
            />
          ) : null}
        </View>
      </Card>
    </ScreenScroll>
  );
}
