import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type Palette } from '../theme';
import { useSettings } from '../state/SettingsContext';

/**
 * Qué aspecto toca ahora mismo.
 *
 * Por defecto manda el sistema — es lo que espera cualquiera que tenga puesto el
 * modo oscuro automático al anochecer, que es justo cuando se vuela. Pero se
 * puede forzar desde Ajustes: con el móvil al sol, el modo claro se lee mejor
 * aunque el sistema haya decidido lo contrario.
 */
export function useScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const { appearance } = useSettings();
  if (appearance === 'claro') return 'light';
  if (appearance === 'oscuro') return 'dark';
  return system === 'dark' ? 'dark' : 'light';
}

export function usePalette(): Palette {
  return useScheme() === 'dark' ? darkPalette : lightPalette;
}
