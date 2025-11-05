import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormInput } from '@shared/src/components/forms/FormInput.web';

describe('FormInput (Web)', () => {
  it('renders with label', () => {
    const mockOnChange = jest.fn();
    render(<FormInput label="Username" value="" onChange={mockOnChange} />);

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('displays the value', () => {
    const mockOnChange = jest.fn();
    render(<FormInput label="Username" value="testuser" onChange={mockOnChange} />);

    const input = screen.getByLabelText('Username') as HTMLInputElement;
    expect(input.value).toBe('testuser');
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    render(<FormInput label="Username" value="" onChange={mockOnChange} />);

    const input = screen.getByLabelText('Username');
    fireEvent.change(input, { target: { value: 'newvalue' } });

    expect(mockOnChange).toHaveBeenCalledWith('newvalue');
  });

  it('calls onBlur when input loses focus', () => {
    const mockOnChange = jest.fn();
    const mockOnBlur = jest.fn();
    render(<FormInput label="Username" value="" onChange={mockOnChange} onBlur={mockOnBlur} />);

    const input = screen.getByLabelText('Username');
    fireEvent.blur(input);

    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('displays error message when error prop is provided', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label="Username"
        value=""
        onChange={mockOnChange}
        error="Username is required"
      />
    );

    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(screen.getByText('Username is required').closest('p')).toHaveAttribute('role', 'alert');
  });

  it('does not display error message when error is not provided', () => {
    const mockOnChange = jest.fn();
    render(<FormInput label="Username" value="" onChange={mockOnChange} />);

    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
  });

  it('displays placeholder text', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label="Username"
        value=""
        onChange={mockOnChange}
        placeholder="Enter username"
      />
    );

    const input = screen.getByPlaceholderText('Enter username') as HTMLInputElement;
    expect(input.placeholder).toBe('Enter username');
  });

  it('sets aria-invalid when error is present', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label="Username"
        value=""
        onChange={mockOnChange}
        error="Error message"
      />
    );

    const input = screen.getByLabelText('Username');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('does not set aria-invalid when no error', () => {
    const mockOnChange = jest.fn();
    render(<FormInput label="Username" value="" onChange={mockOnChange} />);

    const input = screen.getByLabelText('Username');
    // aria-invalid may be false (string) or not set (null/undefined)
    const ariaInvalid = input.getAttribute('aria-invalid');
    expect(ariaInvalid === 'false' || ariaInvalid === null || ariaInvalid === undefined).toBe(true);
  });
});

