/**
 * Reglas de los sitios guardados.
 *
 * Guardar una coordenada y su nombre de calle sirve de poco: dos meses después
 * «Cervera de Buitrago, Madrid» no te dice si ese era el sitio bueno del
 * pantano o el que tenía el tendido eléctrico encima. Lo que convierte un punto
 * en un sitio útil es lo que le pones tú encima: un nombre que reconozcas, la
 * nota de cómo se llega, y a qué altura sueles volar ahí.
 *
 * Este módulo es sólo el modelo y sus reglas; guardarlo es cosa de
 * `src/state/FavoritesContext.tsx`. Aquí no se toca ni almacenamiento ni React,
 * igual que en `fleet.ts`, para que se pueda probar sin montar nada.
 */

import type { FavoriteEntry } from '../state/FavoritesContext';

/**
 * Cómo se llama un sitio: lo que hayas escrito tú, y si no, el nombre que vino
 * de la búsqueda inversa. Nunca se queda vacío.
 */
export function favoriteName(f: FavoriteEntry): string {
  const own = (f.name ?? '').trim();
  if (own) return own;
  const label = f.label.trim();
  if (label) return label;
  return `${f.lat.toFixed(4)}, ${f.lon.toFixed(4)}`;
}

/**
 * La segunda línea de la lista: el nombre del sitio según el mapa, pero sólo
 * cuando aporta algo. Si no le has puesto nombre propio, repetir la dirección
 * debajo de sí misma es ruido.
 */
export function favoritePlaceLine(f: FavoriteEntry): string | null {
  const own = (f.name ?? '').trim();
  if (!own) return null;
  const label = f.label.trim();
  return label && label !== own ? label : null;
}

/** Primera línea de la nota, para enseñarla en la lista sin ocupar tres filas. */
export function favoriteNotePreview(f: FavoriteEntry): string | null {
  const note = (f.note ?? '').trim();
  if (!note) return null;
  const first = note.split('\n').find((l) => l.trim().length > 0) ?? '';
  return first.trim() || null;
}

/** Coordenadas en el formato que se pega en cualquier sitio. */
export function favoriteCoords(f: FavoriteEntry): string {
  return `${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}`;
}

/** true si el sitio tiene algo escrito encima y no es sólo una coordenada. */
export function favoriteHasDetail(f: FavoriteEntry): boolean {
  return Boolean((f.name ?? '').trim() || (f.note ?? '').trim() || f.heightM);
}

/**
 * Texto comparable: sin mayúsculas y sin tildes. Buscar "presa" tiene que
 * encontrar "La Presa" y buscar "arganda" tiene que encontrar "Argandá".
 *
 * `normalize` va dentro de un try por prudencia: el motor de JavaScript del
 * móvil no es el del navegador, y una búsqueda que se cae es peor que una
 * búsqueda que no distingue tildes.
 */
function fold(value: string): string {
  const lower = value.toLowerCase();
  try {
    return lower.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch {
    return lower;
  }
}

/**
 * Tus sitios que casan con lo que estás escribiendo.
 *
 * Busca en el nombre que les has puesto, en el del mapa y en las notas: si
 * apuntaste "aparcar junto al merendero", escribir "merendero" tiene que
 * traerte el sitio. Es local e instantáneo, así que sale antes que los
 * resultados de internet y con una sola letra.
 */
export function matchFavorites(
  favorites: FavoriteEntry[],
  query: string,
  limit = 5,
): FavoriteEntry[] {
  const q = fold(query.trim());
  if (!q) return [];

  const scored: { f: FavoriteEntry; score: number }[] = [];
  for (const f of favorites) {
    const name = fold(favoriteName(f));
    const label = fold(f.label);
    const note = fold(f.note ?? '');

    // El orden importa: primero los que empiezan por lo que escribes, luego los
    // que lo llevan dentro del nombre, y al final los que sólo lo tienen en la
    // nota — que son un acierto útil, pero menos evidente.
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (name.includes(q)) score = 1;
    else if (label.includes(q)) score = 2;
    else if (note.includes(q)) score = 3;
    if (score >= 0) scored.push({ f, score });
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.f);
}
