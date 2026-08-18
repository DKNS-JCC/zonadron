import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { radius, shadow, space, type, verdictStyles } from '../theme';
import type { QueryResult } from '../types';
import { HeightControl } from './HeightControl';
import { Chevron, Collapsible, FadeInUp } from './motion';
import { timeAgo } from '../state/HistoryContext';

/**
 * La respuesta. Ocupa el primer sitio de la pantalla y se lee de un vistazo:
 * color sólido, titular grande y blanco, y el resto subordinado.
 *
 * El control de altura vive DENTRO de la tarjeta, plegado. Antes iba encima, y
 * eso obligaba a pasar por un formulario para llegar a la respuesta.
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
  const p = usePalette();
  const [openHeight, setOpenHeight] = useState(false);
  const style = verdictStyles[result.verdict.level];

  return (
    <FadeInUp animationKey={`${result.verdict.level}-${result.queriedAt}`}>
      <View
        style={[
          {
            backgroundColor: style.color,
            borderRadius: radius.xl,
            padding: compact ? space.lg : space.xl,
            overflow: 'hidden',
          },
          shadow,
        ]}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`${result.verdict.headline}. ${result.verdict.summary}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: compact ? 44 : 54,
              height: compact ? 44 : 54,
              borderRadius: 27,
              backgroundColor: '#FFFFFF2E',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={style.icon as keyof typeof Ionicons.glyphMap}
              size={compact ? 26 : 32}
              color="#fff"
            />
          </View>
          <Text
            style={[
              type.title,
              { color: '#fff', flex: 1, fontSize: compact ? 21 : 26, lineHeight: compact ? 25 : 31 },
            ]}
          >
            {result.verdict.headline}
          </Text>
          {onRefresh ? (
            <Pressable
              onPress={onRefresh}
              accessibilityRole="button"
              accessibilityLabel="Volver a consultar"
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
            >
              {refreshing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="refresh" size={21} color="#FFFFFFD9" />
              )}
            </Pressable>
          ) : null}
        </View>

        <Text style={[type.body, { color: '#FFFFFFEA', marginTop: space.md }]}>
          {result.verdict.summary}
        </Text>

        <MaxHeightBand result={result} compact={compact} />

        {place ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.md }}>
            <Ionicons name="location" size={14} color="#FFFFFFB8" />
            <Text style={[type.caption, { color: '#FFFFFFB8', flex: 1 }]} numberOfLines={2}>
              {place}
            </Text>
          </View>
        ) : null}

        {/* Altura: chip pulsable que despliega el selector */}
        <View style={{ marginTop: space.lg, gap: space.sm }}>
          <Pressable
            onPress={() => onHeightChange && setOpenHeight((v) => !v)}
            disabled={!onHeightChange}
            accessibilityRole={onHeightChange ? 'button' : undefined}
            accessibilityState={{ expanded: openHeight }}
            accessibilityLabel={`Altura de vuelo: ${result.flightHeightAgl} metros sobre el terreno. Tocar para cambiar.`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              alignSelf: 'flex-start',
              backgroundColor: pressed ? '#FFFFFF3D' : '#FFFFFF26',
              borderRadius: radius.pill,
              paddingLeft: space.md,
              paddingRight: onHeightChange ? space.sm + 2 : space.md,
              minHeight: 40,
            })}
          >
            <Ionicons name="swap-vertical" size={15} color="#fff" />
            <Text style={[type.captionStrong, { color: '#fff', fontSize: 14 }]}>
              hasta {result.flightHeightAgl} m sobre el terreno
            </Text>
            {onHeightChange ? <Chevron open={openHeight} color="#FFFFFFCC" size={15} /> : null}
          </Pressable>

          {onHeightChange ? (
            <Collapsible open={openHeight}>
              <View style={{ paddingTop: space.sm }}>
                <HeightControl value={result.flightHeightAgl} onChange={onHeightChange} onColor />
                <Text style={[type.caption, { color: '#FFFFFFB8', marginTop: space.sm }]}>
                  Las zonas que empiezan por encima de esta altura dejan de contar. Cambiarla cambia
                  la respuesta de verdad.
                </Text>
              </View>
            </Collapsible>
          ) : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: space.md,
          }}
        >
          <Ionicons name="time-outline" size={13} color="#FFFFFF9E" />
          <Text style={[type.caption, { color: '#FFFFFF9E', fontSize: 12 }]}>
            Consultado a ENAIRE {timeAgo(result.queriedAt)}
          </Text>
        </View>
      </View>
    </FadeInUp>
  );
}

/**
 * El techo libre: hasta dónde puedes subir sin pedirle permiso a nadie.
 *
 * Es la lectura que de verdad se usa en el campo. Antes había que ir probando
 * alturas en el selector hasta ver cuál dejaba de salir en rojo.
 */
function MaxHeightBand({ result, compact }: { result: QueryResult; compact?: boolean }) {
  const { metres, limitedBy, legalLimit } = result.verdict.maxFreeHeight;

  if (metres === null) {
    return (
      <View style={bandStyle}>
        <Ionicons name="help-circle" size={20} color="#FFFFFFD9" />
        <Text style={[type.caption, { color: '#FFFFFFEA', flex: 1 }]}>
          {result.verdict.maxFreeHeight.label}
        </Text>
      </View>
    );
  }

  if (metres <= 0) {
    return (
      <View style={bandStyle}>
        <Ionicons name="close-circle" size={20} color="#FFFFFFD9" />
        <Text style={[type.captionStrong, { color: '#fff', flex: 1, fontSize: 14 }]}>
          Ni siquiera a ras de suelo puedes volar aquí sin autorización.
        </Text>
      </View>
    );
  }

  return (
    <View style={bandStyle}>
      <Ionicons name="arrow-up-circle" size={compact ? 22 : 26} color="#FFFFFFE0" />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
          <Text style={{ color: '#fff', fontSize: compact ? 24 : 30, fontWeight: '800', letterSpacing: -0.8 }}>
            {metres}
          </Text>
          <Text style={[type.bodyStrong, { color: '#fff' }]}>m</Text>
          <Text style={[type.caption, { color: '#FFFFFFC7', flex: 1 }]}>
            sin pedir permiso
          </Text>
        </View>
        <Text style={[type.caption, { color: '#FFFFFFC7', fontSize: 12 }]}>
          {legalLimit
            ? 'Es el límite general de la categoría abierta, no hay ninguna zona por debajo.'
            : `Por encima entras en ${limitedBy}.`}
        </Text>
      </View>
    </View>
  );
}

const bandStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: space.md,
  backgroundColor: '#FFFFFF24',
  borderRadius: radius.md,
  padding: space.md,
  marginTop: space.md,
};

/** Versión mínima para la hoja del mapa: una línea con color y titular. */
export function VerdictPill({ result }: { result: QueryResult }) {
  const p = usePalette();
  const style = verdictStyles[result.verdict.level];
  const affecting = result.verdict.affecting.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: style.color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={style.icon as keyof typeof Ionicons.glyphMap} size={22} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.subtitle, { color: p.text }]} numberOfLines={1}>
          {result.verdict.headline}
        </Text>
        <Text style={[type.caption, { color: p.textMuted }]} numberOfLines={1}>
          {result.verdict.maxFreeHeight.metres !== null
            ? result.verdict.maxFreeHeight.metres > 0
              ? `Hasta ${result.verdict.maxFreeHeight.metres} m sin permiso · ${affecting} ${affecting === 1 ? 'zona' : 'zonas'}`
              : `Sin autorización, aquí no se vuela · ${affecting} ${affecting === 1 ? 'zona' : 'zonas'}`
            : `${affecting} ${affecting === 1 ? 'zona te afecta' : 'zonas te afectan'} a ${result.flightHeightAgl} m`}
        </Text>
      </View>
    </View>
  );
}
