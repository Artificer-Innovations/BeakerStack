import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Skeleton } from '@beakerstack/shared/components/primitives/Skeleton.web';

describe('Skeleton.web — coverage gaps', () => {
  it('Skeleton.Text uses default line count of 3', () => {
    const { container } = render(<Skeleton.Text />);
    const lines = container.querySelectorAll('.space-y-2 .animate-pulse');
    expect(lines.length).toBe(3);
  });

  it('Skeleton.Text supports alternate last line widths', () => {
    const { container: fullContainer } = render(
      <Skeleton.Text lastLineWidth='full' />
    );
    expect(fullContainer.querySelector('.w-full')).toBeInTheDocument();

    const { container: halfContainer } = render(
      <Skeleton.Text lastLineWidth='1/2' />
    );
    expect(halfContainer.querySelector('[class*="w-1/2"]')).toBeInTheDocument();

    const { container: defaultContainer } = render(<Skeleton.Text lines={2} />);
    expect(
      defaultContainer.querySelector('[class*="w-3/4"]')
    ).toBeInTheDocument();
  });

  it('Skeleton.Text uses default className and last line width', () => {
    const { container } = render(<Skeleton.Text />);
    expect(container.querySelector('[class*="w-3/4"]')).toBeInTheDocument();
  });

  it('Skeleton block skips default width class when explicit width is provided', () => {
    const { container } = render(<Skeleton width={120} />);
    const block = container.querySelector('[role="status"]');
    expect(block).toBeInTheDocument();
    expect(block?.className).not.toMatch(/\bw-full\b/);
  });
});
