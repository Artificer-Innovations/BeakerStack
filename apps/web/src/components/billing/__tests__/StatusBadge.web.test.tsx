import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge.web';

describe('StatusBadge', () => {
  it('maps known statuses', () => {
    render(<StatusBadge status='paid' />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('falls back to raw label for unknown statuses', () => {
    render(<StatusBadge status='custom_status' />);
    expect(screen.getByText('custom_status')).toBeInTheDocument();
  });

  it('treats empty status as unknown label', () => {
    const { container } = render(<StatusBadge status='' />);
    expect(container.querySelector('span')?.textContent).toBe('');
  });
});
