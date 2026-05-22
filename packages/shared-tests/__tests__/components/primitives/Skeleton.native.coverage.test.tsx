import { describe, it, expect } from '@jest/globals';
import TestRenderer from 'react-test-renderer';
import { Skeleton } from '@beakerstack/shared/components/primitives/Skeleton.native';

describe('Skeleton.native — coverage gaps', () => {
  it('Skeleton.Text uses default line count of 3', () => {
    const tree = TestRenderer.create(<Skeleton.Text />);
    const lines = tree.root.findAll(
      node =>
        typeof node.props.style?.height === 'number' &&
        node.props.style.height === 12
    );
    expect(lines.length).toBe(3);
  });
});
