import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenScroll } from '../src/components/Screen';
import {
  Banner,
  Card,
  GhostButton,
  PrimaryButton,
  SectionTitle,
  Separator,
  SkeletonRows,
} from '../src/components/ui';
import { Field } from '../src/components/Field';
import { Segmented, Select, type Option } from '../src/components/Select';
import { Chevron, Collapsible } from '../src/components/motion';
import { usePalette } from '../src/hooks/useTheme';
import { useSettings } from '../src/state/SettingsContext';
import { useFleet } from '../src/state/FleetContext';
import { checkPoint } from '../src/logic/query';
import { coordinationsFor } from '../src/logic/coordination';
import {
  aircraftFromFleet,
  defaultComms,
  defaultConOps,
  EARO_TEMPLATE_VERSION,
  impactEnergyJoules,
  missingEaroFields,
  MITIGATIONS,
  pendingByHand,
  suggestedMitigations,
  type Configuration,
  type EaroAircraft,
  type EaroComms,
  type EaroConOps,
  type EaroContext,
  type EaroDaylight,
  type EaroScope,
} from '../src/logic/earo';
import { earoSupported, generateEaro, shareEaro } from '../src/documents/earoDocx';
import { t } from '../src/i18n';
import { radius, space, systemColor, type } from '../src/theme';
import { verticalBandShort } from '../src/logic/verdict';

/**
 * La EARO, preguntada por pantalla.
 *
 * Es el documento más largo que genera la app —un acuerdo de una docena de
 * páginas con anexos— y también el que más se parece a un cuestionario: casi
 * todo son decisiones cerradas sobre cómo vas a volar. Por eso aquí no hay
 * ningún campo libre donde debería haber una lista, y por eso el catálogo de
 * atenuaciones viene con las que corresponden a tu ConOps ya marcadas en vez
 * de con las treinta y tres para que elijas a ciegas.
 *
 * Lo que la app no puede hacer se dice al final, en su propia tarjeta, y se
 * dice siempre: la firma es tuya y las evidencias del Anexo II —las capturas
 * de NOTAM y ATIS y los procedimientos del aeródromo— también. Un EARO sin eso
 * vuelve con reparos, y es mejor leerlo aquí que enterarse en una semana.
 *
 * Si se llega desde una zona, la consulta al punto rellena sola con quién se
 * firma y a qué dependencias se aplica, que es la parte que más cuesta saber.
 */
export default function EaroScreen() {
  const p = usePalette();
  const params = useLocalSearchParams<{ lat?: string; lon?: string; height?: string }>();

  const { operator, drone: droneProfile, flightHeight } = useSettings();
  const { drones } = useFleet();

  const lat = Number(params.lat);
  const lon = Number(params.lon);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lon);

  const [conops, setConops] = useState<EaroConOps>(() => defaultConOps(droneProfile));
  const [comms, setComms] = useState<EaroComms>(() => defaultComms(operator));
  const [atspName, setAtspName] = useState('');
  const [atspContact, setAtspContact] = useState('');
  const [scope, setScope] = useState<EaroScope[]>([]);
  const [aircraft, setAircraft] = useState<EaroAircraft[]>([]);
  const [mitigations, setMitigations] = useState<string[]>(() =>
    suggestedMitigations(defaultConOps(droneProfile), defaultComms(operator)),
  );
  const [signPlace, setSignPlace] = useState('');

  const [loading, setLoading] = useState(hasPoint);
  const [openMitigations, setOpenMitigations] = useState(false);
  const [generated, setGenerated] = useState<{ uri: string; fileName: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* --- Prellenado desde el punto ------------------------------------ */

  const prefill = useCallback(async () => {
    if (!hasPoint) return;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await checkPoint({ lat, lon }, Number(params.height) || flightHeight, controller.signal);
      if (controller.signal.aborted) return;
      const tramites = coordinationsFor(res.verdict.affecting);
      const primero = tramites.find((c) => c.name) ?? tramites[0];
      if (primero) {
        setAtspName(primero.name);
        setAtspContact([...primero.contacts.emails, ...primero.contacts.phones].join(' / '));
      }
      setScope(
        tramites.map((c) => ({
          label: `${c.zone.category ? `${c.zone.category} ` : ''}${c.zone.title} (${c.zone.identifier})`.trim(),
          note: verticalBandShort(c.zone as never),
        })),
      );
    } catch {
      // Sin conexión se rellena a mano: la EARO no es un trámite de urgencia.
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [hasPoint, lat, lon, params.height, flightHeight]);

  useEffect(() => {
    void prefill();
    return () => abortRef.current?.abort();
  }, [prefill]);

  /* --- Aeronaves ------------------------------------------------------ */

  const toggleAircraft = (id: string) => {
    setAircraft((prev) => {
      if (prev.some((a) => a.droneId === id)) return prev.filter((a) => a.droneId !== id);
      const drone = drones.find((d) => d.id === id);
      return drone ? [...prev, aircraftFromFleet(drone)] : prev;
    });
  };

  const patchAircraft = (id: string, patch: Partial<EaroAircraft>) => {
    setAircraft((prev) => prev.map((a) => (a.droneId === id ? { ...a, ...patch } : a)));
  };

  /* --- Atenuaciones --------------------------------------------------- */

  // Cuando cambia el ConOps se vuelven a proponer: si pasas a vuelo nocturno,
  // la luz verde intermitente tiene que aparecer sola.
  const resuggest = (nextConops: EaroConOps, nextComms: EaroComms) => {
    setMitigations(suggestedMitigations(nextConops, nextComms));
  };

  const patchConops = (patch: Partial<EaroConOps>) => {
    setConops((prev) => {
      const next = { ...prev, ...patch };
      resuggest(next, comms);
      return next;
    });
  };

  const patchComms = (patch: Partial<EaroComms>) => {
    setComms((prev) => {
      const next = { ...prev, ...patch };
      resuggest(conops, next);
      return next;
    });
  };

  const toggleMitigation = (code: string) => {
    setMitigations((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  /* --- Contexto y estado --------------------------------------------- */

  const ctx: EaroContext = useMemo(
    () => ({
      operator,
      droneProfile,
      aircraft,
      atspName,
      atspContact,
      scope,
      conops,
      comms,
      mitigations: MITIGATIONS.filter((m) => mitigations.includes(m.code)).map((m) => m.code),
      signPlace,
    }),
    [operator, droneProfile, aircraft, atspName, atspContact, scope, conops, comms, mitigations, signPlace],
  );

  const missing = missingEaroFields(ctx);

  const generate = async () => {
    setBusy(true);
    setError(null);
    const res = await generateEaro(ctx);
    setBusy(false);
    if (res.ok) {
      setGenerated({ uri: res.uri, fileName: res.fileName });
    } else {
      setGenerated(null);
      setError(
        res.reason === 'unsupported'
          ? t('earoForm.unsupported')
          : res.reason === 'template'
            ? t('earoForm.errorTemplate')
            : t('earoForm.errorWrite'),
      );
    }
  };

  /* --- Opciones ------------------------------------------------------- */

  const daylightOptions: Option<EaroDaylight>[] = [
    { id: 'DIURNO', label: t('earoForm.day') },
    { id: 'NOCTURNO', label: t('earoForm.night') },
    { id: 'AMBOS', label: t('earoForm.both') },
  ];

  const zoneOptions: Option<'DENTRO' | 'FUERA'>[] = [
    { id: 'DENTRO', label: t('earoForm.inside') },
    { id: 'FUERA', label: t('earoForm.outside') },
  ];

  const configOptions: Option<Configuration>[] = [
    { id: 'MULTIRROTOR', label: t('earoForm.multirotor') },
    { id: 'ALA_FIJA', label: t('earoForm.fixedWing') },
  ];

  const yesNo = (value: boolean, onChange: (v: boolean) => void, label: string) => (
    <Segmented
      label={label}
      value={value ? 'SI' : 'NO'}
      options={[
        { id: 'NO', label: t('earoForm.no') },
        { id: 'SI', label: t('earoForm.yes') },
      ]}
      onChange={(v) => onChange(v === 'SI')}
    />
  );

  const numberField = (
    label: string,
    value: number | null,
    onChange: (n: number | null) => void,
    hint?: string,
  ) => (
    <Field
      label={label}
      value={value === null ? '' : String(value).replace('.', ',')}
      onChange={(text) => {
        const clean = text.replace(',', '.').replace(/[^\d.]/g, '');
        const n = Number(clean);
        onChange(clean === '' || !Number.isFinite(n) ? null : n);
      }}
      keyboardType="numeric"
      hint={hint}
    />
  );

  return (
    <ScreenScroll contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
      <Stack.Screen options={{ title: t('earoForm.title') }} />

      <Banner>{t('earoForm.intro')}</Banner>

      {loading ? (
        <Card>
          <SkeletonRows rows={3} />
        </Card>
      ) : null}

      {/* --------------------------- gestor --------------------------- */}
      <Card>
        <SectionTitle>{t('earoForm.atspTitle')}</SectionTitle>
        <View style={{ gap: space.md }}>
          <Field
            label={t('earoForm.atspName')}
            value={atspName}
            onChange={setAtspName}
            hint={t('earoForm.atspNameHint')}
          />
          <Field label={t('earoForm.atspContact')} value={atspContact} onChange={setAtspContact} />
          <Field label={t('earoForm.signPlace')} value={signPlace} onChange={setSignPlace} />
        </View>
      </Card>

      {/* --------------------------- ámbito --------------------------- */}
      <Card>
        <SectionTitle>{t('earoForm.scopeTitle')}</SectionTitle>
        <View style={{ gap: space.md }}>
          {scope.length === 0 ? (
            <Text style={[type.footnote, { color: p.labelTertiary }]}>
              {t('earoForm.scopeEmpty')}
            </Text>
          ) : null}
          {scope.map((s, i) => (
            <View key={`${s.label}-${i}`} style={{ gap: space.sm }}>
              {i > 0 ? <Separator /> : null}
              <Field
                label={t('earoForm.scopeLabel')}
                value={s.label}
                onChange={(label) =>
                  setScope((prev) => prev.map((x, j) => (j === i ? { ...x, label } : x)))
                }
              />
              <Field
                label={t('earoForm.scopeNote')}
                value={s.note}
                onChange={(note) =>
                  setScope((prev) => prev.map((x, j) => (j === i ? { ...x, note } : x)))
                }
              />
              <GhostButton
                label={t('earoForm.scopeRemove')}
                icon="trash-outline"
                onPress={() => setScope((prev) => prev.filter((_, j) => j !== i))}
              />
            </View>
          ))}
          <GhostButton
            label={t('earoForm.scopeAdd')}
            icon="add-circle-outline"
            onPress={() => setScope((prev) => [...prev, { label: '', note: '' }])}
          />
        </View>
      </Card>

      {/* --------------------------- ConOps --------------------------- */}
      <Card>
        <SectionTitle>{t('earoForm.conopsTitle')}</SectionTitle>
        <View style={{ gap: space.md }}>
          <Field
            label={t('earoForm.subcategories')}
            value={conops.subcategories}
            onChange={(subcategories) => patchConops({ subcategories })}
            autoCapitalize="characters"
          />
          {numberField(
            t('earoForm.maxHeight'),
            conops.maxHeightAgl,
            (n) => patchConops({ maxHeightAgl: n ?? 0 }),
            t('earoForm.maxHeightHint'),
          )}
          <Segmented
            label={t('earoForm.daylight')}
            value={conops.daylight}
            options={daylightOptions}
            onChange={(daylight) => patchConops({ daylight })}
          />
          <Segmented
            label={t('earoForm.insideZone')}
            value={conops.insideAerodromeZone ? 'DENTRO' : 'FUERA'}
            options={zoneOptions}
            onChange={(v) => patchConops({ insideAerodromeZone: v === 'DENTRO' })}
          />
          {numberField(
            t('earoForm.range'),
            conops.horizontalRangeM,
            (n) => patchConops({ horizontalRangeM: n ?? 0 }),
            t('earoForm.rangeHint'),
          )}
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1 }}>
              {numberField(t('earoForm.contingencyH'), conops.contingencyHorizontalM, (n) =>
                patchConops({ contingencyHorizontalM: n ?? 0 }),
              )}
            </View>
            <View style={{ flex: 1 }}>
              {numberField(t('earoForm.contingencyV'), conops.contingencyVerticalM, (n) =>
                patchConops({ contingencyVerticalM: n ?? 0 }),
              )}
            </View>
          </View>
          {numberField(
            t('earoForm.session'),
            conops.maxSessionMinutes,
            (n) => patchConops({ maxSessionMinutes: n ?? 0 }),
            t('earoForm.sessionHint'),
          )}
          {yesNo(
            conops.fromMovingVehicle,
            (v) => patchConops({ fromMovingVehicle: v }),
            t('earoForm.vehicle'),
          )}
          {yesNo(conops.tethered, (v) => patchConops({ tethered: v }), t('earoForm.tethered'))}
          {yesNo(conops.fpv, (v) => patchConops({ fpv: v }), t('earoForm.fpv'))}
        </View>
      </Card>

      {/* ------------------------- aeronaves -------------------------- */}
      <Card>
        <SectionTitle>{t('earoForm.aircraftTitle')}</SectionTitle>
        {drones.length === 0 ? (
          <Text style={[type.footnote, { color: p.labelTertiary }]}>
            {t('earoForm.aircraftEmpty')}
          </Text>
        ) : (
          <View style={{ gap: space.sm }}>
            {drones.map((d) => {
              const chosen = aircraft.find((a) => a.droneId === d.id) ?? null;
              const label = d.alias.trim() || [d.manufacturer, d.model].filter(Boolean).join(' ');
              const energy = chosen
                ? impactEnergyJoules(chosen.mtomKg, chosen.speedMs)
                : null;
              return (
                <View key={d.id} style={{ gap: space.sm }}>
                  <Pressable
                    onPress={() => toggleAircraft(d.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: Boolean(chosen) }}
                    accessibilityLabel={label}
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
                      name={chosen ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={chosen ? p.tint : p.labelTertiary}
                    />
                    <Text style={[type.callout, { color: p.label, flex: 1 }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </Pressable>

                  {chosen ? (
                    <View
                      style={{
                        gap: space.md,
                        paddingLeft: space.lg,
                        paddingBottom: space.sm,
                      }}
                    >
                      <Segmented
                        label={t('earoForm.config')}
                        value={chosen.configuration}
                        options={configOptions}
                        onChange={(configuration) => patchAircraft(d.id, { configuration })}
                      />
                      {numberField(t('earoForm.mtom'), chosen.mtomKg, (n) =>
                        patchAircraft(d.id, { mtomKg: n }),
                      )}
                      {numberField(
                        t('earoForm.size'),
                        chosen.characteristicSizeM,
                        (n) => patchAircraft(d.id, { characteristicSizeM: n }),
                        t('earoForm.sizeHint'),
                      )}
                      {numberField(t('earoForm.speed'), chosen.speedMs, (n) =>
                        patchAircraft(d.id, { speedMs: n }),
                      )}
                      {numberField(t('earoForm.autonomy'), chosen.autonomyMin, (n) =>
                        patchAircraft(d.id, { autonomyMin: n }),
                      )}
                      <Text style={[type.footnote, { color: p.labelSecondary }]}>
                        {energy !== null
                          ? t('earoForm.energy', energy)
                          : t('earoForm.energyUnknown')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* ----------------------- comunicaciones ----------------------- */}
      <Card>
        <SectionTitle>{t('earoForm.commsTitle')}</SectionTitle>
        <View style={{ gap: space.md }}>
          <Field
            label={t('earoForm.arcid')}
            value={comms.arcid}
            onChange={(arcid) => patchComms({ arcid })}
            autoCapitalize="characters"
            hint={t('earoForm.arcidHint')}
          />
          <Field
            label={t('earoForm.callsign')}
            value={comms.callsign}
            onChange={(callsign) => patchComms({ callsign })}
            autoCapitalize="characters"
          />
          <Field
            label={t('earoForm.primary')}
            value={comms.primary}
            onChange={(primary) => patchComms({ primary })}
          />
          <Field
            label={t('earoForm.alternate')}
            value={comms.alternate}
            onChange={(alternate) => patchComms({ alternate })}
          />
          {yesNo(
            comms.hasAirBandRadio,
            (v) => patchComms({ hasAirBandRadio: v }),
            t('earoForm.radio'),
          )}
          {yesNo(
            comms.hasRadioCertificate,
            (v) => patchComms({ hasRadioCertificate: v }),
            t('earoForm.radioCert'),
          )}
        </View>
      </Card>

      {/* ------------------------ atenuaciones ------------------------ */}
      <Card>
        <SectionTitle>{t('earoForm.mitigationsTitle')}</SectionTitle>
        <Text style={[type.footnote, { color: p.labelSecondary }]}>
          {t('earoForm.selected', mitigations.length)}
        </Text>
        <Text style={[type.caption, { color: p.labelTertiary, marginTop: 4 }]}>
          {t('earoForm.mitigationsHint')}
        </Text>
        <Pressable
          onPress={() => setOpenMitigations((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: openMitigations }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            minHeight: 40,
            marginTop: space.sm,
          }}
        >
          <Chevron open={openMitigations} color={p.tint} size={14} />
          <Text style={[type.footnote, { color: p.tint }]}>{t('earoForm.mitigationsOpen')}</Text>
        </Pressable>
        <Collapsible open={openMitigations}>
          <View style={{ gap: space.xs }}>
            {MITIGATIONS.map((m) => {
              const checked = mitigations.includes(m.code);
              return (
                <Pressable
                  key={m.code}
                  onPress={() => toggleMitigation(m.code)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`${m.code}. ${m.measure}`}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    gap: space.sm,
                    paddingVertical: space.sm,
                    paddingHorizontal: space.sm,
                    borderRadius: radius.sm,
                    backgroundColor: pressed ? p.surfaceSunken : 'transparent',
                  })}
                >
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={checked ? p.tint : p.labelTertiary}
                    style={{ marginTop: 1 }}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[type.footnote, { color: p.label }]}>
                      {m.code} · {m.strategic ? t('earoForm.strategic') : t('earoForm.tactical')}
                    </Text>
                    <Text style={[type.caption, { color: p.labelSecondary }]}>{m.measure}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Collapsible>
      </Card>

      {/* -------------------------- generar --------------------------- */}
      <Card>
        <SectionTitle>{t('earoForm.generateTitle')}</SectionTitle>
        <View style={{ gap: space.md }}>
          {error ? <Banner tone="warn">{error}</Banner> : null}

          <Text
            style={[
              type.footnote,
              { color: missing.length > 0 ? systemColor('orange', p) : p.labelSecondary },
            ]}
          >
            {missing.length > 0 ? t('earoForm.missing', missing.join(', ')) : t('earoForm.ready')}
          </Text>

          <View style={{ gap: space.sm }}>
            <Text style={[type.footnote, { color: p.label }]}>{t('earoForm.byHandTitle')}</Text>
            {pendingByHand().map((item) => (
              <View key={item} style={{ flexDirection: 'row', gap: space.sm }}>
                <Ionicons
                  name="ellipse"
                  size={6}
                  color={p.labelTertiary}
                  style={{ marginTop: 7 }}
                />
                <Text style={[type.caption, { color: p.labelSecondary, flex: 1 }]}>{item}</Text>
              </View>
            ))}
          </View>

          <PrimaryButton
            label={t('earoForm.generate')}
            icon="document-text-outline"
            loading={busy}
            disabled={!earoSupported}
            onPress={() => {
              void generate();
            }}
          />

          {generated ? (
            <>
              <Text style={[type.footnote, { color: p.labelSecondary }]}>
                {t('earoForm.generated', generated.fileName)}
              </Text>
              <GhostButton
                label={t('earoForm.share')}
                icon="share-outline"
                onPress={() => {
                  void shareEaro(generated.uri);
                }}
              />
            </>
          ) : null}

          <Text style={[type.caption, { color: p.labelTertiary }]}>
            {t('earoForm.version', EARO_TEMPLATE_VERSION)}
          </Text>
        </View>
      </Card>
    </ScreenScroll>
  );
}
