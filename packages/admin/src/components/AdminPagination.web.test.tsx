import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPagination } from './AdminPagination.web.js';

describe('AdminPagination', () => {
  beforeEach(() => {
    cleanup();
  });
  it('shows no results when total is zero', () => {
    render(
      <AdminPagination total={0} limit={25} offset={0} onPageChange={vi.fn()} />
    );
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('shows range and enables next page', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminPagination
        total={50}
        limit={25}
        offset={0}
        onPageChange={onPageChange}
      />
    );
    expect(screen.getByText(/Showing 1–25 of 50/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(25);
  });

  it('handles limit of zero without NaN page numbers', () => {
    render(
      <AdminPagination total={10} limit={0} offset={0} onPageChange={vi.fn()} />
    );
    expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();
    expect(screen.getByText(/Showing 1–1 of 10/)).toBeInTheDocument();
  });

  it('previous page decrements offset', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminPagination
        total={50}
        limit={25}
        offset={25}
        onPageChange={onPageChange}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });
});
