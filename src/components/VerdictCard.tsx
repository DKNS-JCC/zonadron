import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { t } from '../i18n';
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
  accuracy,
  onHeightChange,
  onRefresh,
  refreshing,
  isFavorite,
  onToggleFavorite,
  protectedArea,
  compact,
}: {
  result: QueryResult;
  place?: string | null;
  /** Precisión de la posición, en metros. */
  accuracy?: number | null;
  onHeightChange?: (h: number) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  /**
   * Espacio protegido estricto (parque, reserva) que cubre el punto, si lo hay.
   * No cambia el nivel del veredicto —el dato que se guarda y se comparte
   * sigue siendo el de ENAIRE— pero sí cómo se pinta: ver `softened`.
   */
  protectedArea?: { name: string; designation: string | null } | null;
  compact?: boolean;
}) {
  const [openHeight, setOpenHeight] = useState(false);

  /**
   * Un verde de «todo correcto» dentro de un parque nacional es engañoso: la
   * pregunta que hace el usuario es «¿puedo volar aquí?», no «¿qué dice
   * ENAIRE?». Cuando el veredicto sería LIBRE pero hay una figura estricta
   * encima, la tarjeta se pinta como CONDICIONES y lo explica. El veredicto en
   * sí no se toca: sigue siendo LIBRE en el historial, en el diario y al
   * compartir, porque ENAIRE efectivamente no restringe este punto.
   */
  const softened = Boolean(protectedArea) && result.verdict.level === 'LIBRE';
  const style = softened ? verdictStyles.CONDICIONES : verdictStyles[result.verdict.level];

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
        accessibilityLabel={
          softened
            ? t(
                'verdictCard.a11ySoftened',
                result.verdict.headline,
                protectedArea!.name,
                result.verdict.summary,
              )
            : t('verdictCard.a11y', result.verdict.headline, result.verdict.summary)
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <Ionicons
            // Un tic de «correcto» sobre fondo naranja se contradice a sí mismo.
            name={softened ? 'alert-circle' : ICONS[result.verdict.level]}
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
          {onToggleFavorite ? (
            <Pressable
              onPress={onToggleFavorite}
              accessibilityRole="button"
              accessibilityLabel={
                isFavorite ? t('verdictCard.favoriteRemove') : t('verdictCard.favoriteAdd')
              }
              accessibilityState={{ selected: isFavorite }}
              hitSlop={HIT_SLOP}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={20} color="#FFFFFFCC" />
            </Pressable>
          ) : null}
          {onRefresh ? (
            <Pressable
              onPress={onRefresh}
              accessibilityRole="button"
              accessibilityLabel={t('verdictCard.refresh')}
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

        {/* Por qué esto no está en verde. Sin esta línea el naranja sería un
            misterio: ENAIRE no restringe el punto, pero el parque sí puede. */}
        {softened ? (
          <View
            style={{
              flexDirection: 'row',
              gap: space.sm,
              alignItems: 'flex-start',
              backgroundColor: '#FFFFFF26',
              borderRadius: radius.md,
              padding: space.md,
              marginTop: space.md,
            }}
          >
            <Ionicons name="leaf" size={16} color="#FFFFFF" style={{ marginTop: 1 }} />
            <Text style={[type.footnote, { color: '#FFFFFF', flex: 1 }]}>
              {t(
                'verdictCard.protectedNote',
                protectedArea!.name,
                protectedArea!.designation ? ` (${protectedArea!.designation})` : '',
              )}
            </Text>
          </View>
        ) : null}

        {/* Un NOTAM en vigor puede prohibir el vuelo aunque las zonas salgan en
            verde: no se interpreta su horario en texto libre (ver NotamCard),
            pero que exista uno activo ahora sí es un hecho, y tiene que verse
            aquí y no sólo al final de la pantalla. */}
        {activeNotamCount(result) > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              backgroundColor: '#FFFFFF',
              borderRadius: radius.sm,
              paddingHorizontal: space.sm,
              paddingVertical: 5,
              marginTop: space.md,
            }}
          >
            <Ionicons name="megaphone" size={13} color="#8A4B00" />
            <Text style={[emphasize(type.caption2), { color: '#8A4B00' }]}>
              {t('verdictCard.notams', activeNotamCount(result))}
            </Text>
          </View>
        ) : null}

        <MaxHeightBand result={result} compact={compact} />

        {/* El lugar, y colgando de él la precisión: es un matiz de dónde estás,
            no una alarma, así que va en el mismo tono tenue y sin icono propio. */}
        {place || accuracy != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.md }}>
            <Ionicons name="location" size={13} color="#FFFFFFB3" />
            <Text style={[type.footnote, { color: '#FFFFFFB3', flex: 1 }]} numberOfLines={2}>
              {place}
              {place && accuracy != null ? ' · ' : ''}
              {accuracy != null ? `±${Math.round(accuracy)} m` : ''}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: space.lg, gap: space.sm }}>
          <PressableScale
            onPress={() => onHeightChange && setOpenHeight((v) => !v)}
            disabled={!onHeightChange}
            accessibilityRole={onHeightChange ? 'button' : undefined}
            accessibilityState={{ expanded: openHeight }}
            accessibilityLabel={t('verdictCard.heightA11y', result.flightHeightAgl)}
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
              {t('verdictCard.heightLabel', result.flightHeightAgl)}
            </Text>
            {onHeightChange ? <Chevron open={openHeight} color="#FFFFFFCC" size={14} /> : null}
          </PressableScale>

          {onHeightChange ? (
            <Collapsible open={openHeight}>
              <View style={{ paddingTop: space.sm }}>
                <HeightControl value={result.flightHeightAgl} onChange={onHeightChange} onColor />
                <Text style={[type.footnote, { color: '#FFFFFFB3', marginTop: space.sm }]}>
                  {t('verdictCard.heightHint')}
                </Text>
              </View>
            </Collapsible>
          ) : null}
        </View>

        <Text style={[type.caption, { color: '#FFFFFF99', marginTop: space.md }]}>
          {t('verdictCard.queriedAt', timeAgo(result.queriedAt))}
        </Text>
      </View>
    </Appear>
  );
}

/** NOTAM en vigor ahora mismo. undefined/null: sin consultar (offline o fallo). */
function activeNotamCount(result: QueryResult): number {
  return result.notams?.filter((n) => n.activeNow).length ?? 0;
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
          {t('verdictCard.noHeight')}
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
          <Text style={[type.footnote, { color: '#FFFFFFCC', flex: 1 }]}>
            {t('verdictCard.freeSuffix')}
          </Text>
        </View>
        <Text style={[type.caption, { color: '#FFFFFFCC' }]}>
          {legalLimit
            ? t('verdictCard.freeLegal')
            : t('verdictCard.freeLimitedBy', limitedBy ?? '')}
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
              ? t('verdictPill.free', free, affecting)
              : t('verdictPill.blocked', affecting)
            : t('verdictPill.zones', affecting)}
        </Text>
      </View>
    </View>
  );
}
