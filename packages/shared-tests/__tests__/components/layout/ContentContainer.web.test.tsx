import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';

describe('ContentContainer (Web)', () => {
  it('renders children in a div by default', () => {
    render(<ContentContainer>Hello</ContentContainer>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders with content variant classes by default', () => {
    const { container } = render(<ContentContainer>X</ContentContainer>);
    expect(container.firstElementChild?.className).toMatch(/max-w/);
  });

  it('renders prose variant', () => {
    const { container } = render(
      <ContentContainer variant='prose'>Prose</ContentContainer>
    );
    expect(container.firstElementChild?.className).toMatch(/max-w-prose/);
  });

  it('merges custom className', () => {
    const { container } = render(
      <ContentContainer className='extra-class'>Y</ContentContainer>
    );
    expect(container.firstElementChild?.className).toMatch(/extra-class/);
  });

  it('renders as a custom element via as prop', () => {
    const { container } = render(
      <ContentContainer as='main'>Z</ContentContainer>
    );
    expect(container.querySelector('main')).toBeTruthy();
    expect(screen.getByText('Z')).toBeInTheDocument();
  });
});
