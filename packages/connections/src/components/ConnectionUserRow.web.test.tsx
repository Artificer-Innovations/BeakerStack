import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectionUserRow } from './ConnectionUserRow.web.js';

describe('ConnectionUserRow', () => {
  it('renders display name, handle, subtitle, avatar, and actions', () => {
    render(
      <ConnectionUserRow
        displayName='Alice'
        username='alice'
        avatarUrl='https://example.com/a.png'
        subtitle='Pending'
        actions={<button type='button'>Connect</button>}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://example.com/a.png'
    );
  });

  it('falls back to username and unknown label', () => {
    render(<ConnectionUserRow displayName={null} username={null} />);
    expect(screen.getByText('Unknown user')).toBeInTheDocument();
  });

  it('shows username as label and handle when display name missing', () => {
    render(<ConnectionUserRow displayName={null} username='bob' />);
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
  });

  it('falls back to placeholder when avatar image fails to load', () => {
    const { container } = render(
      <ConnectionUserRow
        displayName='Alice'
        username='alice'
        avatarUrl='https://example.com/broken.png'
      />
    );
    fireEvent.error(screen.getByRole('img'));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.rounded-full')).toBeTruthy();
  });

  it('renders placeholder avatar when url missing', () => {
    const { container } = render(
      <ConnectionUserRow displayName='X' username='x' />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.rounded-full')).toBeTruthy();
  });
});
