import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenScroll } from '../../src/components/Screen';
import { Card, GhostButton, ScreenTitle, SectionTitle } from '../../src/components/ui';
import { FavoritesList } from '../../src/components/FavoritesList';
import { usePalette } from '../../src/hooks/useTheme';
import { useFavorites } from '../../src/state/FavoritesContext';
import { useFlightLog } from '../../src/state/FlightLogContext';
import { verdictLevelLabel } from '../../src/logic/labels';
import { timeAgo } from '../../src/state/HistoryContext';
import { space, type } from '../../src/theme';

/**
 * Cuaderno: los sitios que te importan y lo que has volado, en un sitio —
 * antes repartido entre la pestaña de Buscar (favoritos) y Ajustes (diario).
 * Las Normas, que antes eran su propia pestaña, se abren desde aquí: es
 * contenido de referencia que se consulta de vez en cuando, no algo que
 * necesite un hueco fijo en la barra.
 */
export default function CuadernoScreen() {
  const p = usePalette();
  const router = useRouter();
  const { favorites } = useFavorites();
  const { entries: flights } = useFlightLog();

  const open = (lat: number, lon: number, label: string | null) => {
    router.push({
      pathname: '/resultado',
      params: { lat: String(lat), lon: String(lon), ...(label ? { label } : {}) },
    });
  };

  const lastFlight = flights[0] ?? null;

  return (
    <ScreenScroll>
      <ScreenTitle
        title="Cuaderno"
        subtitle="Tus sitios guardados, tus vuelos registrados y la normativa, todo en un mismo sitio."
      />

      <View style={{ gap: space.md }}>
        <SectionTitle>Favoritos</SectionTitle>
        {favorites.length > 0 ? (
          <FavoritesList onOpen={open} />
        ) : (
          <Card>
            <Text style={[type.callout, { color: p.labelSecondary }]}>
              Guarda un sitio tocando la estrella en cualquier resultado — el campo donde entrenas, la
              finca de un cliente — para tenerlo siempre a mano aquí.
            </Text>
          </Card>
        )}
      </View>

      <View style={{ gap: space.md }}>
        <SectionTitle>Diario de vuelos</SectionTitle>
        <Card>
          {lastFlight ? (
            <>
              <Text style={[type.callout, { color: p.label }]}>
                {flights.length} vuelo{flights.length === 1 ? '' : 's'} registrado{flights.length === 1 ? '' : 's'}.
              </Text>
              <Text style={[type.footnote, { color: p.labelSecondary, marginTop: 2 }]}>
                Último: {lastFlight.label ?? `${lastFlight.lat.toFixed(4)}, ${lastFlight.lon.toFixed(4)}`} ·{' '}
                {verdictLevelLabel[lastFlight.verdictLevel]} · {timeAgo(lastFlight.loggedAt)}
              </Text>
            </>
          ) : (
            <Text style={[type.callout, { color: p.labelSecondary }]}>
              Todavía no has registrado ningún vuelo. Desde el resultado de cualquier consulta, toca
              "Registrar vuelo" después de volar.
            </Text>
          )}
          <View style={{ marginTop: space.md }}>
            <GhostButton
              label={flights.length > 0 ? 'Abrir diario completo' : 'Abrir diario'}
              icon="book-outline"
              onPress={() => router.push('/diario')}
            />
          </View>
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <SectionTitle>Normativa</SectionTitle>
        <Card>
          <Text style={[type.callout, { color: p.labelSecondary }]}>
            Lo esencial de la normativa española y europea, la categoría que te aplica según tu dron, y
            de dónde sale cada dato de esta app.
          </Text>
          <View style={{ marginTop: space.md }}>
            <GhostButton label="Ver normas" icon="shield-checkmark-outline" onPress={() => router.push('/normas')} />
          </View>
        </Card>
      </View>
    </ScreenScroll>
  );
}
