import { describe, it, expect } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';
import { LucideLockIcon } from '../LucideLockIcon';

describe('LucideLockIcon', () => {
  it('renders without crashing with default props', () => {
    expect(() => render(<LucideLockIcon />)).not.toThrow();
  });

  it('renders without crashing with custom size and color', () => {
    expect(() => render(<LucideLockIcon size={24} color='#000000' />)).not.toThrow();
  });
});
