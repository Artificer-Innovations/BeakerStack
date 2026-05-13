import { useState, useEffect } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import type { ThemeColors } from '../types/theme';
import { LIGHT_COLORS, DARK_COLORS } from '../types/theme';

export type { ThemeColors };

export function useDarkMode(): { dark: boolean; colors: ThemeColors } {
  const scheme = useColorScheme();
  const [dark, setDark] = useState(scheme === 'dark');

  useEffect(() => {
    // Appearance.addChangeListener covers Android versions that don't fire
    // useColorScheme synchronously on foreground theme changes.
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setDark(colorScheme === 'dark');
    });
    return () => sub.remove();
  }, []);

  return { dark, colors: dark ? DARK_COLORS : LIGHT_COLORS };
}
