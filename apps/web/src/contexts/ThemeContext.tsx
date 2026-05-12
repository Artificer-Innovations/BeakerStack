import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const THEME_KEY = 'beakerstack:theme';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  return getSystemDark() ? 'dark' : 'light';
}

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    // private browsing / CSP
  }
  return 'system';
}

function applyClass(isDark: boolean): void {
  document.documentElement.classList.toggle('dark', isDark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readStored);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolve(readStored())
  );

  // Keep DOM in sync whenever resolved theme changes.
  useEffect(() => {
    applyClass(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  // Watch OS preference while user has 'system' selected.
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const next: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(next);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  function setTheme(pref: ThemePreference) {
    setPreference(pref);
    setResolvedTheme(resolve(pref));
    try {
      if (pref === 'system') {
        localStorage.removeItem(THEME_KEY);
      } else {
        localStorage.setItem(THEME_KEY, pref);
      }
    } catch {
      // private browsing / CSP
    }
  }

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
