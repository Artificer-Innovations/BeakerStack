import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Profiler } from '../components/Profiler.web.js';

describe('Profiler', () => {
  it('renders children', () => {
    render(
      <Profiler name='test'>
        <div>child</div>
      </Profiler>
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('calls onRender after mount', () => {
    const onRender = vi.fn();
    render(
      <Profiler name='test' onRender={onRender}>
        <div>content</div>
      </Profiler>
    );
    expect(onRender).toHaveBeenCalled();
  });

  it('uses noop when onRender is omitted', () => {
    expect(() =>
      render(
        <Profiler name='noop-test'>
          <div>content</div>
        </Profiler>
      )
    ).not.toThrow();
  });
});
