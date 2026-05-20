import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ObservabilityContext, useObservability } from '../context.js';
import type { ObservabilityHandle } from '../types.js';

function Consumer() {
  const obs = useObservability();
  return <div>{obs ? 'has-handle' : 'no-handle'}</div>;
}

const mockHandle: ObservabilityHandle = {
  captureException: () => {},
  captureMessage: () => {},
  setUser: () => {},
  addBreadcrumb: () => {},
  withScope: (fn) => fn(null),
  startSpan: (_name, fn) => fn(),
};

describe('useObservability', () => {
  it('throws when outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow('useObservability must be called inside');
    spy.mockRestore();
  });

  it('returns handle when inside provider', () => {
    render(
      <ObservabilityContext.Provider value={mockHandle}>
        <Consumer />
      </ObservabilityContext.Provider>
    );
    expect(screen.getByText('has-handle')).toBeInTheDocument();
  });
});
