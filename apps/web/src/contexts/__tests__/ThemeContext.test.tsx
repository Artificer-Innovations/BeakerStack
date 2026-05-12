import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { useTheme as useThemeFromHook } from '../../hooks/useTheme';

function TestConsumer() {
  const { preference, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid='preference'>{preference}</span>
      <span data-testid='resolved'>{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  it('re-exports useTheme via hooks/useTheme', () => {
    expect(useThemeFromHook).toBeDefined();
  });

  it('useTheme throws when used outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useTheme must be used within ThemeProvider'
    );
    spy.mockRestore();
  });

  it('defaults to system preference when nothing is stored', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('preference').textContent).toBe('system');
  });

  it('reads stored dark preference from localStorage', () => {
    localStorage.setItem('beakerstack:theme', 'dark');
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('preference').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
  });

  it('reads stored light preference from localStorage', () => {
    localStorage.setItem('beakerstack:theme', 'light');
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('preference').textContent).toBe('light');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });

  it('setTheme dark persists to localStorage and applies dark class', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(screen.getByTestId('preference').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(localStorage.getItem('beakerstack:theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setTheme light persists to localStorage and removes dark class', async () => {
    document.documentElement.classList.add('dark');
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    await user.click(screen.getByRole('button', { name: 'Light' }));
    expect(screen.getByTestId('preference').textContent).toBe('light');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
    expect(localStorage.getItem('beakerstack:theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setTheme system removes stored preference from localStorage', async () => {
    localStorage.setItem('beakerstack:theme', 'dark');
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    await user.click(screen.getByRole('button', { name: 'System' }));
    expect(screen.getByTestId('preference').textContent).toBe('system');
    expect(localStorage.getItem('beakerstack:theme')).toBeNull();
  });

  it('applies dark class to documentElement when theme is dark', () => {
    localStorage.setItem('beakerstack:theme', 'dark');
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('responds to OS preference changes while in system mode', async () => {
    let osListener: ((e: Partial<MediaQueryListEvent>) => void) | null = null;
    const mockMq = {
      matches: false,
      addEventListener: vi.fn(
        (_: string, fn: (e: Partial<MediaQueryListEvent>) => void) => {
          osListener = fn;
        }
      ),
      removeEventListener: vi.fn(),
    };
    vi.spyOn(window, 'matchMedia').mockReturnValue(
      mockMq as unknown as MediaQueryList
    );

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId('resolved').textContent).toBe('light');

    act(() => {
      osListener?.({ matches: true } as MediaQueryListEvent);
    });
    expect(screen.getByTestId('resolved').textContent).toBe('dark');

    act(() => {
      osListener?.({ matches: false } as MediaQueryListEvent);
    });
    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });
});
