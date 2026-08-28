import React from 'react';
import { Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../hooks/useTheme';
import { t } from '../i18n';
import { emphasize, radius, space, type, verdictTint } from '../theme';
import {
  authorityFor,
  countryFlag,
  isEasaState,
  EASA_AUTHORITIES_URL,
  type OutsideCountry,
} from '../logic/airspace';
import { Card, GhostButton } from './ui';

/**
 * Qué hacer cuando el punto no es español.
 *
 * El veredicto de arriba ya dice que esta app no aplica aquí; esta tarjeta es la
 * parte útil: por qué no aplica, qué sí sigue valiendo si el país está en el
 * ámbito europeo, y a quién preguntar. Sin esto el mensaje se quedaría en un
 * "no lo sé" y el usuario acabaría volando igual.
 *
 * Los enlaces van siempre a la portada de la autoridad —o a su mapa de zonas
 * cuando el país publica uno estable— y nunca a rutas profundas que se caen
 * solas al año. Lo que no esté en el directorio cae en la lista de autoridades
 * nacionales de la EASA. Ver `src/logic/airspace.ts`.
 */
export function OutsideSpainCard({
  country,
  offline,
}: {
  country: OutsideCountry;
  offline?: boolean;
}) {
  const p = usePalette();
  const router = useRouter();
  const tint = verdictTint('FUERA_DE_ESPANA', p);

  const flag = countryFlag(country.code);
  const authority = authorityFor(country.code);
  const easa = isEasaState(country.code);

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: p.surfaceSunken,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {flag ? (
            <Text style={{ fontSize: 24 }}>{flag}</Text>
          ) : (
            <Ionicons name="earth" size={24} color={tint} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[emphasize(type.headline), { color: p.label }]}>{t('outside.title')}</Text>
          <Text style={[type.subheadline, { color: p.labelSecondary }]}>
            {country.name ? t('outside.inCountry', country.name) : t('outside.inUnknown')}
          </Text>
        </View>
      </View>

      <Text style={[type.callout, { color: p.label, marginTop: space.lg }]}>
        {t('outside.body')}
      </Text>

      {/* El matiz que de verdad se usa: en la UE las reglas generales que ya
          conoces siguen valiendo y lo único que cambia es el mapa de zonas.
          Fuera de la UE no se puede dar nada por hecho, y se dice. */}
      <View
        style={{
          flexDirection: 'row',
          gap: space.md,
          alignItems: 'flex-start',
          backgroundColor: p.surfaceSunken,
          borderRadius: radius.md,
          padding: space.md,
          marginTop: space.lg,
        }}
      >
        <Ionicons
          name={easa ? 'checkmark-circle-outline' : 'alert-circle-outline'}
          size={18}
          color={tint}
          style={{ marginTop: 1 }}
        />
        <Text style={[type.footnote, { color: p.labelSecondary, flex: 1 }]}>
          {easa && country.name ? t('outside.easa', country.name) : t('outside.nonEasa')}
        </Text>
      </View>

      {offline ? (
        <Text style={[type.caption, { color: p.labelSecondary, marginTop: space.md }]}>
          {t('outside.offlineNote')}
        </Text>
      ) : null}

      <View style={{ gap: space.sm, marginTop: space.lg }}>
        {authority ? (
          <GhostButton
            label={
              authority.isMap
                ? t('outside.authorityMap', authority.name)
                : t('outside.authority', authority.name)
            }
            icon={authority.isMap ? 'map-outline' : 'open-outline'}
            onPress={() => open(authority.url)}
          />
        ) : null}

        {/* Si no hay entrada propia —o la hay, pero el usuario quiere el resto—
            la lista oficial de la EASA lleva a la autoridad de cada país. */}
        {authority && !easa ? null : (
          <GhostButton
            label={t('outside.easaList')}
            icon="list-outline"
            onPress={() => open(EASA_AUTHORITIES_URL)}
          />
        )}

        <GhostButton
          label={t('outside.searchSpain')}
          icon="search-outline"
          onPress={() => router.push('/buscar')}
        />
      </View>
    </Card>
  );
}
