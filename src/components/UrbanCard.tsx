import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { t, type MessageKey } from '../i18n';
import {
  CATASTRO_SOURCE,
  SIOSE_SOURCE,
  checkUrbanContext,
  urbanCaseLabel,
  type CatastroKind,
  type UrbanContext,
  type UrbanLevel,
} from '../api/urbano';
import { describePlace } from '../api/geocode';
import {
  emphasize,
  noticeTint,
  radius,
  shadow,
  space,
  systemColor,
  type,
  type Palette,
} from '../theme';
import type { Coords, EvaluatedZone } from '../types';
import { Chevron, Collapsible } from './motion';
import { GhostButton, Separator, SkeletonRows } from './ui';

/**
 * Entorno urbano.
 *
 * Va plegada porque en la mayoría de las consultas la respuesta cabe en una
 * línea: la pantalla de resultado ya tiene bastantes tarjetas y ésta no puede
 * costar otro bloque de texto. Lo de dentro es el porqué —qué ha dicho cada
 * fuente— y el botón a la norma, que es lo que de verdad hay que leer cuando
 * la respuesta es que sí.
 *
 * Nunca pinta de verde un "aquí no pasa nada": lo más afirmativo que sabe
 * decir es que no lo ha detectado. Ver `src/api/urbano.ts`.
 *
 * El aviso de entorno urbano de ENAIRE —el mismo para toda España, que sólo
 * dice "compruébalo tú"— se recoge aquí en vez de salir como una zona más:
 * son la misma pregunta, y enseñarlas por separado obliga al usuario a
 * conciliar dos tarjetas que hablan de lo mismo. Manda lo que hemos podido
 * averiguar del punto; el aviso de ENAIRE queda de red de seguridad para
 * cuando no hay datos.
 */
export function UrbanCard({
  coords,
  enaireNotice,
}: {
  coords: Coords;
  /** Aviso general de entorno urbano de ENAIRE, si viene en la consulta. */
  enaireNotice?: EvaluatedZone | null;
}) {
  const p = usePalette();
  const router = useRouter();
  const [context, setContext] = useState<UrbanContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    // La comunidad autónoma sale de la búsqueda inversa que la pantalla ya ha
    // pedido: aquí es un acierto de caché, no una petición nueva.
    describePlace(coords.lat, coords.lon, controller.signal)
      .then((details) => {
        if (controller.signal.aborted) return null;
        setPlace(details.neighbourhood ?? details.city);
        return checkUrbanContext(coords, details.regionIso, controller.signal);
      })
      .then((result) => {
        if (controller.signal.aborted || !result) return;
        setContext(result);
      })
      .catch(() => {})
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [coords.lat, coords.lon]);

  if (loading) {
    return (
      <Card>
        <SkeletonRows rows={1} />
      </Card>
    );
  }

  if (!context) return null;

  const tone = toneFor(context.level, p);
  const applies = context.level === 'urbano' || context.level === 'probable' || context.level === 'parque';
  // Sin datos propios, lo único que queda es el recordatorio de ENAIRE.
  const sinDatos = context.level === 'sin-datos' || context.level === 'sin-region';

  return (
    <Card>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t('urban.title')}. ${headline(context.level)}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          padding: space.lg,
          minHeight: 60,
          backgroundColor: pressed ? p.surfaceSunken : 'transparent',
        })}
      >
        <Ionicons name={iconFor(context.level)} size={22} color={tone} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[emphasize(type.callout), { color: p.label }]} numberOfLines={1}>
            {headline(context.level)}
          </Text>
          <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
            {summary(context, place)}
          </Text>
        </View>
        <Chevron open={open} color={p.labelTertiary} size={15} />
      </Pressable>

      <Collapsible open={open}>
        <Separator inset={space.lg} />
        <View style={{ padding: space.lg, gap: space.md }}>
          <Text style={[type.footnote, { color: p.label }]}>{explanation(context.level)}</Text>

          {/* Por qué decimos ciudad si el suelo de debajo es una carretera. */}
          {context.surrounded ? (
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              {t('urban.surrounded')}
            </Text>
          ) : null}

          {sinDatos && enaireNotice ? (
            <Text style={[type.footnote, { color: p.labelSecondary }]}>
              {t('urban.enaireFallback')}
            </Text>
          ) : null}

          {/* Qué ha contestado cada fuente, sin interpretar. */}
          {context.level !== 'sin-region' ? (
            <View style={{ gap: 4 }}>
              <SourceLine
                label={CATASTRO_SOURCE}
                value={context.direccion ?? t(CATASTRO_KEYS[context.catastro])}
              />
              <SourceLine
                label={SIOSE_SOURCE}
                value={
                  context.cobertura
                    ? `${context.cobertura}${context.siose !== null ? ` (${context.siose})` : ''}`
                    : t('urban.siose.none')
                }
              />
              {enaireNotice ? (
                <SourceLine label={t('urban.enaireLabel')} value={enaireNotice.title} />
              ) : null}
            </View>
          ) : null}

          {applies ? (
            <GhostButton
              label={t('urban.readRule')}
              icon="book-outline"
              onPress={() => router.push({ pathname: '/normas', params: { seccion: 'urbano' } })}
            />
          ) : null}

          <Text style={[type.caption, { color: p.labelTertiary }]}>{t('urban.footnote')}</Text>
        </View>
      </Collapsible>
    </Card>
  );
}

/** Contenedor con la misma forma que las demás tarjetas, pero sin relleno. */
function Card({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View
      style={[
        { backgroundColor: p.surface, borderRadius: radius.lg, overflow: 'hidden' },
        shadow.chip,
      ]}
    >
      {children}
    </View>
  );
}

function SourceLine({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
      <Text style={[type.caption, { color: p.labelTertiary, flex: 1 }]}>{label}</Text>
      <Text style={[type.caption, { color: p.labelSecondary, flex: 1.4, textAlign: 'right' }]}>
        {value}
      </Text>
    </View>
  );
}

function toneFor(level: UrbanLevel, p: Palette): string {
  switch (level) {
    case 'urbano':
      return systemColor('orange', p);
    case 'probable':
    case 'parque':
      return noticeTint(p);
    case 'no-detectado':
      return systemColor('green', p);
    default:
      return p.labelSecondary;
  }
}

function iconFor(level: UrbanLevel): keyof typeof Ionicons.glyphMap {
  switch (level) {
    case 'urbano':
      return 'business';
    case 'probable':
      return 'business-outline';
    case 'parque':
      return 'leaf-outline';
    case 'no-detectado':
      return 'checkmark-circle';
    default:
      return 'help-circle-outline';
  }
}

const HEADLINE_KEYS = {
  urbano: 'urban.headline.urbano',
  probable: 'urban.headline.probable',
  parque: 'urban.headline.parque',
  'no-detectado': 'urban.headline.noDetectado',
  'sin-region': 'urban.headline.sinRegion',
  'sin-datos': 'urban.headline.sinDatos',
} satisfies Record<UrbanLevel, MessageKey>;

const EXPLAIN_KEYS = {
  urbano: 'urban.explain.urbano',
  probable: 'urban.explain.probable',
  parque: 'urban.explain.parque',
  'no-detectado': 'urban.explain.noDetectado',
  'sin-region': 'urban.explain.sinRegion',
  'sin-datos': 'urban.explain.sinDatos',
} satisfies Record<UrbanLevel, MessageKey>;

const CATASTRO_KEYS = {
  urbana: 'urban.catastro.urbana',
  rustica: 'urban.catastro.rustica',
  'sin-parcela': 'urban.catastro.sinParcela',
  'sin-servicio': 'urban.catastro.sinServicio',
} satisfies Record<CatastroKind, MessageKey>;

function headline(level: UrbanLevel): string {
  return t(HEADLINE_KEYS[level]);
}

function explanation(level: UrbanLevel): string {
  return t(EXPLAIN_KEYS[level]);
}

/** Una línea que resume lo encontrado, con el barrio si lo sabemos. */
function summary(context: UrbanContext, place: string | null): string {
  const caso = urbanCaseLabel(context.supuesto);
  const bits = [caso, place].filter(Boolean) as string[];
  if (bits.length > 0) return bits.join(' · ');
  return t('urban.summaryFallback');
}
