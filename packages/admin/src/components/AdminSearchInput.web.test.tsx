import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminSearchInput } from './AdminSearchInput.web.js';

describe('AdminSearchInput', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders search input with default placeholder', () => {
    render(<AdminSearchInput />);
    expect(screen.getByPlaceholderText('Search by email…')).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AdminSearchInput onChange={onChange} />);
    await user.type(screen.getByRole('searchbox'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
