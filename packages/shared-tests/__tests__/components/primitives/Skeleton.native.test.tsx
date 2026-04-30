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
});
