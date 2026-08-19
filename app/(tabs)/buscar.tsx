import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenScroll } from '../../src/components/Screen';
import {
  Banner,
  Card,
  EmptyState,
  ScreenTitle,
  SectionTitle,
  Separator,
  SkeletonRows,
} from '../../src/components/ui';
import { HistoryList } from '../../src/components/HistoryList';
import { Appear } from '../../src/components/motion';
import { noWebOutline } from '../../src/components/HeightControl';
import { usePalette } from '../../src/hooks/useTheme';
import { useHistory } from '../../src/state/HistoryContext';
import { searchPlaces, type Place } from '../../src/api/geocode';
import { radius, shadow, space, type, emphasize } from '../../src/theme';

const DEBOUNCE_MS = 300;

export default function BuscarScreen() {
  const p = usePalette();
  const router = useRouter();
  const { entries } = useHistory();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async (text: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (text.trim().length < 3) {
      // Antes se salía aquí sin apagar el indicador, y el "Buscando…" se
      // quedaba girando para siempre al borrar caracteres.
      setLoading(false);
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const places = await searchPlaces(text, controller.signal);
      if (controller.signal.aborted) return;
      setResults(places);
      setSearched(true);
    } catch {
      if (controller.signal.aborted) return;
      setError('No se ha podido buscar. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => run(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submit = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    run(query);
  };

  const open = (lat: number, lon: number, label: string | null) => {
    Keyboard.dismiss();
    router.push({
      pathname: '/resultado',
      params: { lat: String(lat), lon: String(lon), ...(label ? { label } : {}) },
    });
  };

  const showIdle = query.trim().length === 0;
  const showRecents = showIdle && entries.length > 0;

  return (
    <ScreenScroll>
      <ScreenTitle
        title="Buscar un lugar"
        subtitle="Una dirección, un municipio o unas coordenadas, para consultar ese punto."
      />

      {/* Campo de búsqueda del sistema: una pastilla que se levanta del fondo
          agrupado, sin marco. El foco se nota en el símbolo y en el cursor, no
          engordando un borde de color. */}
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: p.surface,
            borderRadius: 10,
            paddingHorizontal: space.md,
            minHeight: 44,
          },
          shadow.chip,
        ]}
      >
        <Ionicons name="search" size={17} color={focused ? p.labelSecondary : p.labelTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ej. Playa de la Malvarrosa, o 39.47, -0.32"
          placeholderTextColor={p.labelTertiary}
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={submit}
          accessibilityLabel="Buscar un lugar"
          style={[type.callout, { flex: 1, color: p.label, paddingVertical: 11 }, noWebOutline]}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={12} accessibilityLabel="Borrar búsqueda">
            <Ionicons name="close-circle" size={17} color={p.labelTertiary} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <Card>
          <SkeletonRows rows={3} />
        </Card>
      ) : null}

      {error ? <Banner tone="warn">{error}</Banner> : null}

      {!loading && results.length > 0 ? (
        <Appear animationKey={results[0]?.id}>
          <View style={{ gap: space.md }}>
            <SectionTitle>Resultados</SectionTitle>
            <View
              style={[
                {
                  backgroundColor: p.surface,
                  borderRadius: radius.lg,
                  overflow: 'hidden',
                },
                shadow.chip,
              ]}
            >
              {results.map((place, i) => (
                <View key={place.id}>
                  {i > 0 ? <Separator inset={space.lg + 20 + space.md} /> : null}
                  <Pressable
                    onPress={() => open(place.lat, place.lon, place.name)}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      paddingHorizontal: space.lg,
                      paddingVertical: space.md,
                      minHeight: 60,
                      backgroundColor: pressed ? p.surfaceSunken : 'transparent',
                    })}
                  >
                    <Ionicons name="location-outline" size={20} color={p.labelSecondary} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={[emphasize(type.callout), { color: p.label }]} numberOfLines={1}>
                        {place.name}
                      </Text>
                      {place.detail ? (
                        <Text style={[type.footnote, { color: p.labelSecondary }]} numberOfLines={1}>
                          {place.detail}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={p.labelTertiary} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </Appear>
      ) : null}

      {searched && !loading && results.length === 0 && !error ? (
        <Banner>No se ha encontrado ningún lugar con ese nombre en España.</Banner>
      ) : null}

      {showRecents ? (
        <View style={{ gap: space.md }}>
          <SectionTitle>Últimas consultas</SectionTitle>
          <HistoryList onOpen={open} />
        </View>
      ) : null}

      {showIdle && entries.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Busca cualquier punto de España"
          subtitle="También puedes pegar unas coordenadas directamente, por ejemplo 39.47, -0.32."
        />
      ) : null}
    </ScreenScroll>
  );
}
