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
