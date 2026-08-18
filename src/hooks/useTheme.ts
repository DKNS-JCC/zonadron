import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type Palette } from '../theme';

export function usePalette(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkPalette : lightPalette;
}
