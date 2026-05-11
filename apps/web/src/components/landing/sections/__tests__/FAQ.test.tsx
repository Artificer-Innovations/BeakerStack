import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FAQ } from '../FAQ';

const faqConfig = {
  heading: 'Frequently Asked Questions',
  items: [
    { q: 'What is BeakerStack?', a: 'An open-source SaaS template.' },
    { q: 'Is it free?', a: 'Yes, MIT licensed.' },
    { q: 'Does it support mobile?', a: 'Yes, React Native included.' },
  ],
};

describe('FAQ', () => {
  it('renders the section heading', () => {
    render(<FAQ config={faqConfig} />);
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });

  it('renders all FAQ questions', () => {
    render(<FAQ config={faqConfig} />);
    expect(screen.getByText('What is BeakerStack?')).toBeInTheDocument();
    expect(screen.getByText('Is it free?')).toBeInTheDocument();
    expect(screen.getByText('Does it support mobile?')).toBeInTheDocument();
  });

  it('renders all FAQ answers', () => {
    render(<FAQ config={faqConfig} />);
    expect(
      screen.getByText('An open-source SaaS template.')
    ).toBeInTheDocument();
    expect(screen.getByText('Yes, MIT licensed.')).toBeInTheDocument();
    expect(screen.getByText('Yes, React Native included.')).toBeInTheDocument();
  });

  it('renders FAQ items as details elements', () => {
    const { container } = render(<FAQ config={faqConfig} />);
    const details = container.querySelectorAll('details');
    expect(details.length).toBe(3);
  });

  it('renders summary for each FAQ item', () => {
    const { container } = render(<FAQ config={faqConfig} />);
    const summaries = container.querySelectorAll('summary');
    expect(summaries.length).toBe(3);
  });

  it('renders empty FAQ section when items array is empty', () => {
    render(<FAQ config={{ heading: 'FAQ', items: [] }} />);
    expect(screen.getByText('FAQ')).toBeInTheDocument();
  });
});
