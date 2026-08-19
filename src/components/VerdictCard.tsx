import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import {
  emphasize,
  HIT_SLOP,
  radius,
  shadow,
  space,
  tabular,
  type,
  verdictStyles,
} from '../theme';
import type { QueryResult } from '../types';
import { HeightControl } from './HeightControl';
import { Appear, Chevron, Collapsible, PressableScale } from './motion';
import { timeAgo } from '../state/HistoryContext';

/**
 * La respuesta.
 *
 * Ocupa el primer sitio de la pantalla y se lee de un vistazo: relleno sólido,
 * titular grande y todo lo demás subordinado. El color va en una capa sólida, no
 * sobre un material translúcido, para que el blanco se lea al sol.
 */
export function VerdictCard({
  result,
  place,
  onHeightChange,
  onRefresh,
  refreshing,
  compact,
}: {
  result: QueryResult;
  place?: string | null;
  onHeightChange?: (h: number) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  compact?: boolean;
}) {
  const [openHeight, setOpenHeight] = useState(false);
  const style = verdictStyles[result.verdict.level];

  return (
    <Appear animationKey={`${result.verdict.level}-${result.queriedAt}`}>
      <View
        style={[
          {
            backgroundColor: style.solid,
            borderRadius: radius.xl,
            padding: compact ? space.lg : space.xl,
            overflow: 'hidden',
          },
          shadow.panel,
        ]}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`${result.verdict.headline}. ${result.verdict.summary}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <Ionicons
            name={ICONS[result.verdict.level]}
            size={compact ? 26 : 30}
            color="#FFFFFF"
            style={{ marginTop: 1 }}
          />
          <Text
            style={[
              compact ? type.title2 : type.title1,
              { color: '#FFFFFF', flex: 1 },
            ]}
          >
            {result.verdict.headline}
          </Text>
          {onRefresh ? (
            <Pressable
              onPress={onRefresh}
              accessibilityRole="button"
              accessibilityLabel="Volver a consultar"
              hitSlop={HIT_SLOP}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              {refreshing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="refresh" size={20} color="#FFFFFFCC" />
              )}
            </Pressable>
          ) : null}
        </View>

        <Text style={[type.callout, { color: '#FFFFFFE6', marginTop: space.md }]}>
          {result.verdict.summary}
        </Text>

        <MaxHeightBand result={result} compact={compact} />

        {place ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.md }}>
            <Ionicons name="location" size={13} color="#FFFFFFB3" />
            <Text style={[type.footnote, { color: '#FFFFFFB3', flex: 1 }]} numberOfLines={2}>
              {place}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: space.lg, gap: space.sm }}>
          <PressableScale
            onPress={() => onHeightChange && setOpenHeight((v) => !v)}
            disabled={!onHeightChange}
            accessibilityRole={onHeightChange ? 'button' : undefined}
            accessibilityState={{ expanded: openHeight }}
            accessibilityLabel={`Altura de vuelo: ${result.flightHeightAgl} metros sobre el terreno. Tocar para cambiar.`}
            hitSlop={HIT_SLOP}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              alignSelf: 'flex-start',
              backgroundColor: '#FFFFFF26',
              borderRadius: radius.sm,
              paddingLeft: space.md,
              paddingRight: onHeightChange ? space.sm : space.md,
              minHeight: 36,
            }}
          >
            <Ionicons name="swap-vertical" size={14} color="#FFFFFF" />
            <Text style={[emphasize(type.footnote), { color: '#FFFFFF' }]}>
              hasta {result.flightHeightAgl} m sobre el terreno
            </Text>
            {onHeightChange ? <Chevron open={openHeight} color="#FFFFFFCC" size={14} /> : null}
          </PressableScale>

          {onHeightChange ? (
            <Collapsible open={openHeight}>
              <View style={{ paddingTop: space.sm }}>
                <HeightControl value={result.flightHeightAgl} onChange={onHeightChange} onColor />
                <Text style={[type.footnote, { color: '#FFFFFFB3', marginTop: space.sm }]}>
                  Las zonas que empiezan por encima de esta altura dejan de contar. Cambiarla cambia
                  la respuesta de verdad.
                </Text>
              </View>
            </Collapsible>
          ) : null}
        </View>

        <Text style={[type.caption, { color: '#FFFFFF99', marginTop: space.md }]}>
          Consultado a ENAIRE {timeAgo(result.queriedAt)}
        </Text>
      </View>
    </Appear>
  );
}

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  LIBRE: 'checkmark-circle',
  CONDICIONES: 'alert-circle',
  AUTORIZACION: 'shield-half',
  PROHIBIDO: 'close-circle',
  DESCONOCIDO: 'help-circle',
};

/**
 * El techo libre: hasta dónde se puede subir sin pedirle permiso a nadie. Es la
 * lectura que de verdad se usa en el campo.
 */
function MaxHeightBand({ result, compact }: { result: QueryResult; compact?: boolean }) {
  const { metres, limitedBy, legalLimit } = result.verdict.maxFreeHeight;

  const band: React.ComponentProps<typeof View>['style'] = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: '#FFFFFF1F',
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.lg,
  };

  if (metres === null) {
    return (
      <View style={band}>
        <Ionicons name="help-circle" size={19} color="#FFFFFFCC" />
        <Text style={[type.footnote, { color: '#FFFFFFE6', flex: 1 }]}>
          {result.verdict.maxFreeHeight.label}
        </Text>
      </View>
    );
  }

  if (metres <= 0) {
    return (
      <View style={band}>
        <Ionicons name="close-circle" size={19} color="#FFFFFFCC" />
        <Text style={[emphasize(type.footnote), { color: '#FFFFFF', flex: 1 }]}>
          Ni a ras de suelo puedes volar aquí sin autorización.
        </Text>
      </View>
    );
  }

  return (
    <View style={band}>
      <Ionicons name="arrow-up-circle" size={compact ? 22 : 26} color="#FFFFFFE6" />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
          <Text
            style={[
              tabular,
              { color: '#FFFFFF', fontSize: compact ? 26 : 32, fontWeight: '700', letterSpacing: -0.7 },
            ]}
          >
            {metres}
          </Text>
          <Text style={[emphasize(type.callout), { color: '#FFFFFF' }]}>m</Text>
          <Text style={[type.footnote, { color: '#FFFFFFCC', flex: 1 }]}>sin pedir permiso</Text>
        </View>
        <Text style={[type.caption, { color: '#FFFFFFCC' }]}>
          {legalLimit
            ? 'Es el límite general de la categoría abierta, no hay ninguna zona por debajo.'
            : `Por encima entras en ${limitedBy}.`}
        </Text>
      </View>
    </View>
  );
}

/** Versión mínima para la hoja del mapa: una línea con color y titular. */
export function VerdictPill({ result }: { result: QueryResult }) {
  const p = usePalette();
  const style = verdictStyles[result.verdict.level];
  const affecting = result.verdict.affecting.length;
  const free = result.verdict.maxFreeHeight.metres;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: style.solid,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={ICONS[result.verdict.level]} size={20} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[emphasize(type.headline), { color: p.label }]} numberOfLines={1}>
          {result.verdict.headline}
        </Text>
        <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
          {free !== null
            ? free > 0
              ? `Hasta ${free} m sin permiso · ${affecting} ${affecting === 1 ? 'zona' : 'zonas'}`
              : `Sin autorización, aquí no se vuela · ${affecting} ${affecting === 1 ? 'zona' : 'zonas'}`
            : `${affecting} ${affecting === 1 ? 'zona te afecta' : 'zonas te afectan'}`}
        </Text>
      </View>
    </View>
  );
}
