import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormError } from '@shared/src/components/forms/FormError.web';

describe('FormError (Web)', () => {
  it('renders error message when message is provided', () => {
    render(<FormError message="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not render when message is empty string', () => {
    const { container } = render(<FormError message="" />);

    expect(container.firstChild).toBeNull();
  });

  it('has alert role for accessibility', () => {
    render(<FormError message="Error message" />);

    const errorElement = screen.getByRole('alert');
    expect(errorElement).toBeInTheDocument();
  });

  it('renders different error messages', () => {
    const { rerender } = render(<FormError message="First error" />);
    expect(screen.getByText('First error')).toBeInTheDocument();

    rerender(<FormError message="Second error" />);
    expect(screen.getByText('Second error')).toBeInTheDocument();
    expect(screen.queryByText('First error')).not.toBeInTheDocument();
  });
});

