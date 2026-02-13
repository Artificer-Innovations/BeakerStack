import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormInput } from '@shared/src/components/forms/FormInput.web';

describe('FormInput (Web)', () => {
  it('renders with label', () => {
    const mockOnChange = jest.fn();
    render(<FormInput label='Username' value='' onChange={mockOnChange} />);

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('displays the value', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput label='Username' value='testuser' onChange={mockOnChange} />
    );

    const input = screen.getByLabelText('Username') as HTMLInputElement;
    expect(input.value).toBe('testuser');
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    render(<FormInput label='Username' value='' onChange={mockOnChange} />);

    const input = screen.getByLabelText('Username');
    fireEvent.change(input, { target: { value: 'newvalue' } });

    expect(mockOnChange).toHaveBeenCalledWith('newvalue');
  });

  it('calls onBlur when input loses focus', () => {
    const mockOnChange = jest.fn();
    const mockOnBlur = jest.fn();
    render(
      <FormInput
        label='Username'
        value=''
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    );

    const input = screen.getByLabelText('Username');
    fireEvent.blur(input);

    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('displays error message when error prop is provided', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Username'
        value=''
        onChange={mockOnChange}
        error='Username is required'
      />
    );

    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(
      screen.getByText('Username is required').closest('p')
    ).toHaveAttribute('role', 'alert');
  });

  it('does not display error message when error is not provided', () => {
    const mockOnChange = jest.fn();
    render(<FormInput label='Username' value='' onChange={mockOnChange} />);

    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
  });

  it('displays placeholder text', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Username'
        value=''
        onChange={mockOnChange}
        placeholder='Enter username'
      />
    );

    const input = screen.getByPlaceholderText(
      'Enter username'
    ) as HTMLInputElement;
    expect(input.placeholder).toBe('Enter username');
  });

  it('sets aria-invalid when error is present', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Username'
        value=''
        onChange={mockOnChange}
        error='Error message'
      />
    );

    const input = screen.getByLabelText('Username');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('does not set aria-invalid when no error', () => {
    const mockOnChange = jest.fn();
    render(<FormInput label='Username' value='' onChange={mockOnChange} />);

    const input = screen.getByLabelText('Username');
    // aria-invalid may be false (string) or not set (null/undefined)
    const ariaInvalid = input.getAttribute('aria-invalid');
    expect(
      ariaInvalid === 'false' ||
        ariaInvalid === null ||
        ariaInvalid === undefined
    ).toBe(true);
  });

  it('renders textarea when multiline is true', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Description'
        value=''
        onChange={mockOnChange}
        multiline
      />
    );

    const textarea = screen.getByLabelText(
      'Description'
    ) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('uses custom rows for textarea', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Description'
        value=''
        onChange={mockOnChange}
        multiline
        rows={5}
      />
    );

    const textarea = screen.getByLabelText(
      'Description'
    ) as HTMLTextAreaElement;
    expect(textarea.rows).toBe(5);
  });

  it('calls onChange when textarea value changes', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Description'
        value=''
        onChange={mockOnChange}
        multiline
      />
    );

    const textarea = screen.getByLabelText('Description');
    fireEvent.change(textarea, { target: { value: 'new description' } });

    expect(mockOnChange).toHaveBeenCalledWith('new description');
  });

  it('calls onBlur when textarea loses focus', () => {
    const mockOnChange = jest.fn();
    const mockOnBlur = jest.fn();
    render(
      <FormInput
        label='Description'
        value=''
        onChange={mockOnChange}
        onBlur={mockOnBlur}
        multiline
      />
    );

    const textarea = screen.getByLabelText('Description');
    fireEvent.blur(textarea);

    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('displays error message for textarea', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Description'
        value=''
        onChange={mockOnChange}
        error='Description is required'
        multiline
      />
    );

    expect(screen.getByText('Description is required')).toBeInTheDocument();
    const textarea = screen.getByLabelText('Description');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
  });

  it('sets aria-describedby for textarea when error is present', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Description'
        value=''
        onChange={mockOnChange}
        error='Error message'
        multiline
      />
    );

    const textarea = screen.getByLabelText('Description');
    const inputId = textarea.id;
    expect(textarea.getAttribute('aria-describedby')).toBe(`${inputId}-error`);
  });

  it('does not set aria-describedby for textarea when no error', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Description'
        value=''
        onChange={mockOnChange}
        multiline
      />
    );

    const textarea = screen.getByLabelText('Description');
    const ariaDescribedBy = textarea.getAttribute('aria-describedby');
    expect(ariaDescribedBy === null || ariaDescribedBy === undefined).toBe(
      true
    );
  });

  it('disables textarea when disabled prop is true', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Description'
        value=''
        onChange={mockOnChange}
        multiline
        disabled
      />
    );

    const textarea = screen.getByLabelText(
      'Description'
    ) as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it('shows required indicator for textarea', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Description'
        value=''
        onChange={mockOnChange}
        multiline
        required
      />
    );

    expect(screen.getByText('*')).toBeInTheDocument();
    const textarea = screen.getByLabelText(
      'Description'
    ) as HTMLTextAreaElement;
    expect(textarea.required).toBe(true);
  });
});
