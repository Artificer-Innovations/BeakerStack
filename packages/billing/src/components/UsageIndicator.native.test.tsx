import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UsageIndicator } from './UsageIndicator.native.js';
import { useUsage } from '../hooks/useUsage.js';

vi.mock('../hooks/useUsage.js', () => ({ useUsage: vi.fn() }));

describe('UsageIndicator (native)', () => {
  beforeEach(() => {
    vi.mocked(useUsage).mockReturnValue({
      used: 2,
      limit: 5,
      remaining: 3,
      resetsAt: '2026-06-01T00:00:00.000Z',
      loading: false,
    });
  });

  it('renders text variant with remaining', () => {
    render(<UsageIndicator meter='ai' />);
    expect(screen.getByText(/2 of 5 used/)).toBeInTheDocument();
    expect(screen.getByText(/3 left/)).toBeInTheDocument();
  });

  it('renders compact variant', () => {
    render(<UsageIndicator meter='ai' variant='compact' />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('renders expanded variant with label and progress track', () => {
    render(
      <UsageIndicator
        meter='ai'
        variant='expanded'
        label='AI usage'
        description='Resets each billing period'
      />
    );
    expect(screen.getByText('AI usage')).toBeInTheDocument();
    expect(screen.getByText('Resets each billing period')).toBeInTheDocument();
  });

  it('renders bar variant when limit is set', () => {
    render(<UsageIndicator meter='ai' variant='bar' />);
    expect(screen.getByText(/2 of 5 used/)).toBeInTheDocument();
  });

  it('renders infinity symbol when limit is null', () => {
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

  it('renders unlimited expanded copy when limit is null', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 4,
      limit: null,
      remaining: null,
      resetsAt: '',
      loading: false,
    });
    render(<UsageIndicator meter='ai' variant='expanded' />);
    expect(screen.getByText(/unlimited/)).toBeInTheDocument();
  });

  it('falls back to default text for bar variant when limit is null', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 4,
      limit: null,
      remaining: null,
      resetsAt: '',
      loading: false,
    });
    render(<UsageIndicator meter='ai' variant='bar' />);
    expect(screen.getByText(/4 of ∞ used/)).toBeInTheDocument();
  });

  it('omits remaining suffix when remaining is null', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 2,
      limit: 5,
      remaining: null,
      resetsAt: '',
      loading: false,
    });
    render(<UsageIndicator meter='ai' />);
    expect(screen.getByText(/2 of 5 used/)).toBeInTheDocument();
    expect(screen.queryByText(/left/)).toBeNull();
  });

  it('renders expanded caption without reset date when resetsAt is empty', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 2,
      limit: 5,
      remaining: 3,
      resetsAt: '',
      loading: false,
    });
    render(<UsageIndicator meter='ai' variant='expanded' />);
    expect(screen.getByText(/2 of 5 used · resets —/)).toBeInTheDocument();
  });

  it('shows ellipsis while loading', () => {
    vi.mocked(useUsage).mockReturnValue({
      used: 0,
      limit: 5,
      remaining: 5,
      resetsAt: '',
      loading: true,
    });
    render(<UsageIndicator meter='ai' variant='compact' />);
    expect(screen.getByText('…')).toBeInTheDocument();
  });
});
