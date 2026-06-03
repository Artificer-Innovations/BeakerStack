import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminTable } from './AdminTable.web.js';

type Row = { id: string; name: string };

const columns = [{ id: 'name', header: 'Name', cell: (r: Row) => r.name }];

describe('AdminTable', () => {
  it('shows loading state', () => {
    render(
      <AdminTable columns={columns} rows={[]} getRowKey={r => r.id} loading />
    );
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows empty message', () => {
    render(
      <AdminTable
        columns={columns}
        rows={[]}
        getRowKey={r => r.id}
        emptyMessage='Nothing here'
      />
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders rows without click handler when onRowClick omitted', () => {
    render(
      <AdminTable
        columns={columns}
        rows={[{ id: '1', name: 'Ada' }]}
        getRowKey={r => r.id}
      />
    );
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('uses getRowLabel for the row accessible name', () => {
    render(
      <AdminTable
        columns={columns}
        rows={[{ id: 'uuid-1', name: 'Ada' }]}
        getRowKey={r => r.id}
        getRowLabel={r => r.name}
        onRowClick={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: 'View details for Ada' })
    ).toBeInTheDocument();
  });

  it('activates row on Space key when clickable', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminTable
        columns={columns}
        rows={[{ id: '1', name: 'Ada' }]}
        getRowKey={r => r.id}
        onRowClick={onRowClick}
      />
    );
    const row = screen.getByRole('button', { name: 'View details for 1' });
    row.focus();
    await user.keyboard(' ');
    expect(onRowClick).toHaveBeenCalledWith({ id: '1', name: 'Ada' });
  });

  it('activates row on Enter key when clickable', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminTable
        columns={columns}
        rows={[{ id: '1', name: 'Ada' }]}
        getRowKey={r => r.id}
        onRowClick={onRowClick}
      />
    );
    const row = screen.getByRole('button', { name: 'View details for 1' });
    row.focus();
    await user.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledWith({ id: '1', name: 'Ada' });
  });

  it('applies column className and aria-sort on headers', () => {
    render(
      <AdminTable
        columns={[
          {
            id: 'name',
            header: 'Name',
            cell: (r: Row) => r.name,
            className: 'w-48',
            headerCellProps: { 'aria-sort': 'ascending' },
          },
        ]}
        rows={[{ id: '1', name: 'Ada' }]}
        getRowKey={r => r.id}
      />
    );
    const header = screen.getByRole('columnheader', { name: 'Name' });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(header.className).toContain('w-48');
    expect(screen.getByText('Ada').className).toContain('w-48');
  });

  it('renders rows and handles row click', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminTable
        columns={columns}
        rows={[{ id: '1', name: 'Ada' }]}
        getRowKey={r => r.id}
        onRowClick={onRowClick}
      />
    );
    await user.click(screen.getByText('Ada'));
    expect(onRowClick).toHaveBeenCalledWith({ id: '1', name: 'Ada' });
  });

  it('ignores non-activation keys on clickable rows', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <AdminTable
        columns={columns}
        rows={[{ id: '1', name: 'Ada' }]}
        getRowKey={r => r.id}
        onRowClick={onRowClick}
      />
    );
    const row = screen.getByRole('button', { name: 'View details for 1' });
    row.focus();
    await user.keyboard('{ArrowDown}');
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
