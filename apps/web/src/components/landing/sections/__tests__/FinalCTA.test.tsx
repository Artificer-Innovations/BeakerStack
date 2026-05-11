import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinalCTA } from '../FinalCTA';

const base = {
  headline: 'Start building today.',
  subhead: 'Everything wired in.',
  ctaLabel: 'Get started free',
  ctaHref: '/signup',
};

function renderFinalCTA(overrides = {}) {
  return render(
    <MemoryRouter>
      <FinalCTA config={{ ...base, ...overrides }} />
    </MemoryRouter>
  );
}

describe('FinalCTA', () => {
  it('renders headline', () => {
    renderFinalCTA();
    expect(
      screen.getByRole('heading', { name: 'Start building today.' })
    ).toBeInTheDocument();
  });

  it('renders subhead', () => {
    renderFinalCTA();
    expect(screen.getByText('Everything wired in.')).toBeInTheDocument();
  });

  it('renders primary CTA with correct label and href', () => {
    renderFinalCTA();
    const link = screen.getByRole('link', { name: 'Get started free' });
    expect(link).toHaveAttribute('href', '/signup');
  });
});
