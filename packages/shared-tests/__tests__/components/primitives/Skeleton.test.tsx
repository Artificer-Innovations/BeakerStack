import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Skeleton } from '@beakerstack/shared/components/primitives/Skeleton.web';

describe('Skeleton (Web)', () => {
  it('renders with status role and loading label', () => {
    render(<Skeleton data-testid='sk' />);
    const el = screen.getByTestId('sk');
    expect(el).toHaveAttribute('role', 'status');
    expect(el).toHaveAttribute('aria-label', 'Loading');
  });

  it('applies default height and pulse classes', () => {
    render(<Skeleton data-testid='sk' />);
    const el = screen.getByTestId('sk');
    expect(el.className).toMatch(/animate-pulse/);
    expect(el).toHaveStyle({ minHeight: '16px' });
  });

  it('does not add w-full when className includes width utility', () => {
    render(<Skeleton data-testid='sk' className='w-24' />);
    const el = screen.getByTestId('sk');
    expect(el.className).toMatch(/w-24/);
    expect(el.className).not.toMatch(/\bw-full\b/);
  });

  it('applies rounded variants', () => {
    const { rerender } = render(<Skeleton data-testid='sk' rounded='full' />);
    expect(screen.getByTestId('sk').className).toMatch(/rounded-full/);

    rerender(<Skeleton data-testid='sk' rounded='none' />);
    expect(screen.getByTestId('sk').className).toMatch(/rounded-none/);
  });

  it('Skeleton.Text renders multiple lines', () => {
    const { container } = render(<Skeleton.Text lines={4} />);
    const statuses = container.querySelectorAll('[role="status"]');
    expect(statuses.length).toBe(5);
    expect(statuses[0].className).toMatch(/space-y-2/);
  });

  it('Skeleton.Text applies lastLineWidth', () => {
    const { rerender, container } = render(
      <Skeleton.Text lines={2} lastLineWidth='1/2' />
    );
    let lastLine = container.querySelector('.w-1\\/2');
    expect(lastLine).toBeTruthy();

    rerender(<Skeleton.Text lines={2} lastLineWidth='full' />);
    lastLine = container.querySelector('.space-y-2 .w-full');
    expect(lastLine).toBeTruthy();
  });
});
