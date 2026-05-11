import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FAQ } from '../FAQ';

const config = {
  heading: 'Frequently asked questions',
  items: [
    { q: 'What is BeakerStack?', a: 'A starter kit.' },
    { q: 'Is it free?', a: 'Yes, there is a free tier.' },
  ],
};

describe('FAQ', () => {
  it('renders section heading', () => {
    render(<FAQ config={config} />);
    expect(
      screen.getByRole('heading', { name: 'Frequently asked questions' })
    ).toBeInTheDocument();
  });

  it('renders each question', () => {
    render(<FAQ config={config} />);
    expect(screen.getByText('What is BeakerStack?')).toBeInTheDocument();
    expect(screen.getByText('Is it free?')).toBeInTheDocument();
  });

  it('renders each answer in the DOM', () => {
    render(<FAQ config={config} />);
    expect(screen.getByText('A starter kit.')).toBeInTheDocument();
    expect(screen.getByText('Yes, there is a free tier.')).toBeInTheDocument();
  });

  it('renders all items when multiple are provided', () => {
    render(<FAQ config={config} />);
    const details = document.querySelectorAll('details');
    expect(details).toHaveLength(2);
  });

  it('renders empty list without error', () => {
    render(<FAQ config={{ heading: 'FAQ', items: [] }} />);
    expect(screen.getByRole('heading', { name: 'FAQ' })).toBeInTheDocument();
  });
});
