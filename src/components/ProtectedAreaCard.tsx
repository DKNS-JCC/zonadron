import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
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
        <SectionTitle>Espacios naturales protegidos</SectionTitle>
        <SkeletonRows rows={1} />
      </Card>
    );
  }

  // No se ha podido consultar: callar es peor que decirlo, porque el usuario
  // se quedaría sin saber que este apartado existe siquiera.
  if (areas === null) {
    return (
      <Card>
        <SectionTitle>Espacios naturales protegidos</SectionTitle>
        <Text style={[type.callout, { color: p.label }]}>
          No se ha podido consultar el inventario de espacios protegidos. Compruébalo por tu cuenta si
          vas a volar en campo abierto.
        </Text>
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
      <SectionTitle>Espacios naturales protegidos</SectionTitle>

      {areas.length === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Ionicons name="checkmark-circle" size={24} color={systemColor('green', p)} />
          <Text style={[type.callout, { color: p.label, flex: 1 }]}>
            Este punto no está dentro de ningún espacio protegido ni de Red Natura 2000.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name={strict ? 'leaf' : 'leaf-outline'} size={26} color={tone} />
            <Text style={[type.callout, { color: p.label, flex: 1 }]}>
              {areas.length === 1
                ? 'Estás dentro de un espacio protegido.'
                : `Estás dentro de ${areas.length} espacios protegidos.`}
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
                    Lo gestiona {a.organism}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          <Text style={[type.footnote, { color: p.label }]}>
            {strict
              ? 'En parques y reservas el vuelo suele estar prohibido, o exige permiso del gestor del espacio. Pídelo antes de ir.'
              : 'Cada espacio tiene sus propias normas (PRUG o PORN): el vuelo puede estar prohibido, exigir autorización o estar permitido. Pregunta al organismo que lo gestiona.'}
          </Text>
        </View>
      )}

      <Text style={[type.footnote, { color: p.labelTertiary, marginTop: space.md }]}>
        Fuente: {PROTECTED_SOURCE}. Es información ambiental, aparte de las zonas de ENAIRE: no cambia
        el veredicto de arriba, se suma a él.
      </Text>
    </Card>
  );
}
