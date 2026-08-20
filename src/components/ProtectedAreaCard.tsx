import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { t } from '../i18n';
import { radius, space, systemColor, type, emphasize } from '../theme';
import { isStrictFigure, PROTECTED_SOURCE, type ProtectedArea } from '../api/protected';
import { Card, Chip, SectionTitle, SkeletonRows } from './ui';

/**
 * Espacios naturales protegidos.
 *
 * Es el hueco que ENAIRE no cubre: sus zonas son de espacio aéreo, no de
 * protección ambiental, así que un punto puede salir limpio en ENAIRE y estar
 * dentro de un parque nacional. No toca el nivel del veredicto —cada espacio
 * lo regula su PRUG o PORN y va de prohibido a permitido— pero sí dice dónde
 * estás y a quién preguntarle.
 *
 * Los datos llegan por prop desde ResultView (ver useProtectedAreas): el
 * veredicto los necesita también, y no tiene sentido pedirlos dos veces.
 */
export function ProtectedAreaCard({
  areas,
}: {
  /** undefined: cargando. null: no se ha podido consultar. */
  areas: ProtectedArea[] | null | undefined;
}) {
  const p = usePalette();

  if (areas === undefined) {
    return (
      <Card>
        <SectionTitle>{t('protected.title')}</SectionTitle>
        <SkeletonRows rows={1} />
      </Card>
    );
  }

  // No se ha podido consultar: callar es peor que decirlo, porque el usuario
  // se quedaría sin saber que este apartado existe siquiera.
  if (areas === null) {
    return (
      <Card>
        <SectionTitle>{t('protected.title')}</SectionTitle>
        <Text style={[type.callout, { color: p.label }]}>{t('protected.failed')}</Text>
      </Card>
    );
  }

  const warn = systemColor('orange', p);
  const strict = areas.some((a) => isStrictFigure(a.designation));
  // Estar dentro de un espacio protegido nunca se pinta en tono neutro: aunque
  // la figura no sea de las estrictas, hay normas propias que comprobar y
  // enseñarlo en gris se lee como «no pasa nada».
  const tone = warn;

  return (
    <Card>
      <SectionTitle>{t('protected.title')}</SectionTitle>

      {areas.length === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Ionicons name="checkmark-circle" size={24} color={systemColor('green', p)} />
          <Text style={[type.callout, { color: p.label, flex: 1 }]}>{t('protected.none')}</Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name={strict ? 'leaf' : 'leaf-outline'} size={26} color={tone} />
            <Text style={[type.callout, { color: p.label, flex: 1 }]}>
              {areas.length === 1
                ? t('protected.insideOne')
                : t('protected.insideMany', areas.length)}
            </Text>
          </View>

          <View style={{ backgroundColor: p.surfaceSunken, borderRadius: radius.md, padding: space.md, gap: space.md }}>
            {areas.map((a) => (
              <View key={`${a.source}:${a.name}`} style={{ gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                  <Text style={[emphasize(type.subheadline), { color: p.label }]}>{a.name}</Text>
                  {a.designation ? <Chip label={a.designation} color={warn} /> : null}
                </View>
                {a.organism ? (
                  <Text style={[type.caption, { color: p.labelSecondary }]}>
                    {t('protected.managedBy', a.organism)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          <Text style={[type.footnote, { color: p.label }]}>
            {strict ? t('protected.strict') : t('protected.loose')}
          </Text>
        </View>
      )}

      <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.md }]}>
        {t('protected.footnote', PROTECTED_SOURCE)}
      </Text>
    </Card>
  );
}
