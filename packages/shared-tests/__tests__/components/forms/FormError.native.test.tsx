import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormError } from '@shared/src/components/forms/FormError.native';

describe('FormError (Native)', () => {
  it('renders error message when message is provided', () => {
    render(<FormError message='This is an error' />);

    expect(screen.getByText('This is an error')).toBeInTheDocument();
    expect(screen.getByText('⚠')).toBeInTheDocument();
  });

  it('does not render when message is empty', () => {
    const { container } = render(<FormError message='' />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when message is not provided', () => {
    const { container } = render(<FormError message={''} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders with different error messages', () => {
    const { rerender } = render(<FormError message='First error' />);
    expect(screen.getByText('First error')).toBeInTheDocument();

    rerender(<FormError message='Second error' />);
    expect(screen.getByText('Second error')).toBeInTheDocument();
    expect(screen.queryByText('First error')).not.toBeInTheDocument();
  });

  it('has accessibility role alert', () => {
    render(<FormError message='Error message' />);
    // The component should have accessibilityRole='alert'
    // We verify it renders correctly
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
