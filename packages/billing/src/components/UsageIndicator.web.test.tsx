import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UsageIndicator } from './UsageIndicator.web.js';
import { useUsage } from '../hooks/useUsage.js';

vi.mock('../hooks/useUsage.js', () => ({ useUsage: vi.fn() }));

describe('UsageIndicator (web)', () => {
  beforeEach(() => {
    vi.mocked(useUsage).mockReturnValue({
      used: 3,
      limit: 10,
      remaining: 7,
      resetsAt: '2026-06-01T00:00:00.000Z',
      loading: false,
    });
  });

  it('renders default text variant', () => {
    render(<UsageIndicator meter='ai' />);
    expect(screen.getByText(/3 of 10 used/)).toBeInTheDocument();
    expect(screen.getByText(/7 left/)).toBeInTheDocument();
  });

  it('renders compact variant', () => {
    render(<UsageIndicator meter='ai' variant='compact' />);
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('renders expanded with test id', () => {
    render(
      <UsageIndicator
        meter='ai'
        variant='expanded'
        label='AI'
        description='Cap'
      />
    );
    expect(screen.getByTestId('usage-indicator-expanded')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('shows loading ellipsis', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 0,
      limit: 10,
      remaining: 10,
      resetsAt: null,
      loading: true,
    });
    render(<UsageIndicator meter='ai' />);
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('uses em dash when resetsAt is empty on default variant', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 1,
      limit: 5,
      remaining: 4,
      resetsAt: '',
      loading: false,
    });
    render(<UsageIndicator meter='ai' />);
    expect(screen.getByText(/resets —/)).toBeInTheDocument();
  });

  it('does not append remaining when remaining is null', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 2,
      limit: 5,
      remaining: null,
      resetsAt: '2026-01-01T00:00:00.000Z',
      loading: false,
    });
    render(<UsageIndicator meter='ai' />);
    expect(screen.getByText(/2 of 5 used/)).toBeInTheDocument();
    expect(screen.queryByText(/left/)).not.toBeInTheDocument();
  });

  it('shows infinity for unlimited limit on default variant', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 4,
      limit: null,
      remaining: null,
      resetsAt: '',
      loading: false,
    });
    render(<UsageIndicator meter='ai' />);
    expect(screen.getByText(/4 of ∞ used/)).toBeInTheDocument();
  });

  it('renders compact with infinity when limit is null', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 1,
      limit: null,
      remaining: null,
      resetsAt: '',
      loading: false,
    });
    render(<UsageIndicator meter='ai' variant='compact' />);
    expect(screen.getByText('1/∞')).toBeInTheDocument();
  });

  it('renders compact loading ellipsis', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 0,
      limit: 10,
      remaining: 10,
      resetsAt: '',
      loading: true,
    });
    render(<UsageIndicator meter='ai' variant='compact' />);
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('renders expanded unlimited copy when limit is null', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 6,
      limit: null,
      remaining: null,
      resetsAt: '',
      loading: false,
    });
    const { container } = render(
      <UsageIndicator meter='ai' variant='expanded' />
    );
    expect(
      screen.getByText(/6 used this period · unlimited/)
    ).toBeInTheDocument();
    expect(container.querySelector('[style*="height: 8px"]')).toBeNull();
  });

  it('renders expanded cap line with em dash when limit set but resetsAt empty', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 2,
      limit: 8,
      remaining: 6,
      resetsAt: '',
      loading: false,
    });
    render(<UsageIndicator meter='ai' variant='expanded' />);
    expect(screen.getByText(/2 of 8 used · resets —/)).toBeInTheDocument();
  });

  it('renders expanded progress at 0% when limit is zero', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 3,
      limit: 0,
      remaining: null,
      resetsAt: '2026-03-01T00:00:00.000Z',
      loading: false,
    });
    const { container } = render(
      <UsageIndicator meter='ai' variant='expanded' />
    );
    const inner = container.querySelector('[style*="width"]') as HTMLElement;
    expect(inner?.style.width).toBe('0%');
  });

  it('caps expanded bar width at 100% when used exceeds limit', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 50,
      limit: 10,
      remaining: 0,
      resetsAt: '2026-04-01T00:00:00.000Z',
      loading: false,
    });
    const { container } = render(
      <UsageIndicator meter='ai' variant='expanded' />
    );
    expect(
      [...container.querySelectorAll('div')].some(
        el => (el as HTMLElement).style.width === '100%'
      )
    ).toBe(true);
  });

  it('renders bar variant with track and caption', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 4,
      limit: 10,
      remaining: 6,
      resetsAt: '2026-05-01T00:00:00.000Z',
      loading: false,
    });
    const { container } = render(
      <UsageIndicator meter='ai' variant='bar' className='wrap' />
    );
    expect(container.querySelector('.wrap')).toBeInTheDocument();
    expect(screen.getByText(/4 of 10 used/)).toBeInTheDocument();
    const inner = container.querySelector(
      '[style*="background: rgb(59, 130, 246)"]'
    ) as HTMLElement | undefined;
    expect(inner?.style.width).toBe('40%');
  });

  it('falls back to default variant when bar requested but limit is null', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 2,
      limit: null,
      remaining: null,
      resetsAt: '',
      loading: false,
    });
    render(<UsageIndicator meter='ai' variant='bar' />);
    expect(screen.getByText(/2 of ∞ used/)).toBeInTheDocument();
  });

  it('applies className and style to default root', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 1,
      limit: 2,
      remaining: 1,
      resetsAt: '2026-01-01T00:00:00.000Z',
      loading: false,
    });
    const { container } = render(
      <UsageIndicator
        meter='ai'
        className='usage-root'
        style={{ marginTop: 12 }}
      />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('usage-root');
    expect(root.style.marginTop).toBe('12px');
  });
});
