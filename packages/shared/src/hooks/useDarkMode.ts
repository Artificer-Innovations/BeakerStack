import { useState, useEffect } from 'react';
import type { ThemeColors } from '../types/theme';
import { LIGHT_COLORS, DARK_COLORS } from '../types/theme';

export type { ThemeColors };

export function useDarkMode(): { dark: boolean; colors: ThemeColors } {
  const [dark, setDark] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { dark, colors: dark ? DARK_COLORS : LIGHT_COLORS };
}
