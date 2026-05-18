import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminDetailDrawer } from './AdminDetailDrawer.web.js';

describe('AdminDetailDrawer', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <AdminDetailDrawer open={false} title='User' onClose={vi.fn()}>
        <p>Detail</p>
      </AdminDetailDrawer>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title and children when open', () => {
    render(
      <AdminDetailDrawer open title='user@example.com' onClose={vi.fn()}>
        <p>Detail body</p>
      </AdminDetailDrawer>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Detail body')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminDetailDrawer open title='User' onClose={onClose}>
        <p>Detail</p>
      </AdminDetailDrawer>
    );
    await user.click(screen.getByTestId('admin-drawer-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn();
    render(
      <AdminDetailDrawer open title='User' onClose={onClose}>
        <p>Detail</p>
      </AdminDetailDrawer>
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps Tab focus from last to first focusable in panel', () => {
    render(
      <AdminDetailDrawer open title='User' onClose={vi.fn()}>
        <input aria-label='Notes' />
        <button type='button'>Save</button>
      </AdminDetailDrawer>
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const close = screen.getByLabelText('Close');
    save.focus();
    expect(document.activeElement).toBe(save);

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    document.dispatchEvent(tab);
    expect(document.activeElement).toBe(close);
  });

  it('wraps Shift+Tab focus from first to last focusable in panel', () => {
    render(
      <AdminDetailDrawer open title='User' onClose={vi.fn()}>
        <input aria-label='Notes' />
        <button type='button'>Save</button>
      </AdminDetailDrawer>
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const close = screen.getByLabelText('Close');
    close.focus();
    expect(document.activeElement).toBe(close);

    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(shiftTab);
    expect(document.activeElement).toBe(save);
  });

  it('skips elements with tabindex -1 in the Tab trap', () => {
    render(
      <AdminDetailDrawer open title='User' onClose={vi.fn()}>
        <button type='button' tabIndex={-1}>
          Hidden
        </button>
        <button type='button'>Save</button>
      </AdminDetailDrawer>
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const close = screen.getByLabelText('Close');
    save.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    expect(document.activeElement).toBe(close);
  });

  it('calls onClose when header close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminDetailDrawer open title='User' onClose={onClose}>
        <p>Detail</p>
      </AdminDetailDrawer>
    );
    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
