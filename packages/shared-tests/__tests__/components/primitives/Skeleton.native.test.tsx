import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Skeleton } from '@beakerstack/shared/components/primitives/Skeleton.native';

describe('Skeleton (Native)', () => {
  it('renders block with progressbar role', () => {
    render(<Skeleton />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('Skeleton.Text renders wrapper progressbar', () => {
    render(<Skeleton.Text lines={3} />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('applies rounded variants and custom dimensions', () => {
    const { rerender } = render(
      <Skeleton rounded='none' height={20} width={40} />
    );
    expect(screen.getByRole('progressbar')).toBeTruthy();

    rerender(<Skeleton rounded='full' />);
    expect(screen.getByRole('progressbar')).toBeTruthy();

    rerender(<Skeleton rounded='sm' />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('Skeleton.Text applies lastLineWidth variants', () => {
    const { rerender } = render(
      <Skeleton.Text lines={2} lastLineWidth='full' />
    );
    expect(screen.getByRole('progressbar')).toBeTruthy();

    rerender(<Skeleton.Text lines={2} lastLineWidth='1/2' />);
    expect(screen.getByRole('progressbar')).toBeTruthy();

    rerender(<Skeleton.Text lines={2} lastLineWidth='3/4' />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });
});
