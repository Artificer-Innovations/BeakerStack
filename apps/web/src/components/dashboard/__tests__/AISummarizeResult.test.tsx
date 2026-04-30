import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AISummarizeResult } from '../AISummarizeResult';

describe('AISummarizeResult', () => {
  it('shows placeholder when there are no entries', () => {
    render(<AISummarizeResult entries={[]} />);
    expect(screen.getByText(/Simulate AI summarize/i)).toBeInTheDocument();
  });

  it('renders entry timestamps and text', () => {
    render(
      <AISummarizeResult
        entries={[
          {
            id: '1',
            at: Date.UTC(2024, 5, 1, 12, 0, 0),
            text: 'Hello\nworld',
          },
        ]}
      />
    );
    expect(screen.getByRole('listitem')).toHaveTextContent('Hello');
    expect(screen.getByRole('listitem')).toHaveTextContent('world');
    expect(screen.getByText(/2024/i)).toBeInTheDocument();
  });
});
