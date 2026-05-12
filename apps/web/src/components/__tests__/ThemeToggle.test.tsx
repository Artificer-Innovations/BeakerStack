import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { ThemeToggle } from '../ThemeToggle';

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders Light, System, and Dark buttons', () => {
    renderToggle();
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'System' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument();
  });

  it('clicking Dark applies dark class to documentElement', async () => {
    const user = userEvent.setup();
    renderToggle();
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('clicking Light removes dark class', async () => {
    const user = userEvent.setup();
    renderToggle();
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    await user.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('clicking System clears stored preference', async () => {
    localStorage.setItem('beakerstack:theme', 'dark');
    const user = userEvent.setup();
    renderToggle();
    await user.click(screen.getByRole('button', { name: 'System' }));
    expect(localStorage.getItem('beakerstack:theme')).toBeNull();
  });
});
