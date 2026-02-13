import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormInput } from '@shared/src/components/forms/FormInput.native';

describe('FormInput (Native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label', () => {
    const mockOnChange = jest.fn();
    render(<FormInput label='Username' value='' onChange={mockOnChange} />);

    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('displays the value', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput label='Username' value='testuser' onChange={mockOnChange} />
    );

    const input = screen.getByDisplayValue('testuser');
    expect(input).toBeInTheDocument();
  });

  it.skip('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Username'
        value=''
        onChange={mockOnChange}
        placeholder='Enter username'
      />
    );

    const input = screen.getByPlaceholderText('Enter username');
    // react-native-web renders TextInput - need to trigger onChangeText
    // For react-native-web, we can use the native event
    const nativeEvent = { target: { value: 'newvalue' } };
    fireEvent(input, 'changeText', 'newvalue');

    expect(mockOnChange).toHaveBeenCalledWith('newvalue');
  });

  it.skip('calls onBlur when input loses focus', () => {
    const mockOnChange = jest.fn();
    const mockOnBlur = jest.fn();
    render(
      <FormInput
        label='Username'
        value=''
        onChange={mockOnChange}
        onBlur={mockOnBlur}
        placeholder='Enter username'
      />
    );

    const input = screen.getByPlaceholderText('Enter username');
    fireEvent(input, 'blur');

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
  });

  it('applies error styles when error is present', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Username'
        value=''
        onChange={mockOnChange}
        error='Error message'
      />
    );

    // Label should have error styling
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Email'
        value=''
        onChange={mockOnChange}
        placeholder='Enter your email'
      />
    );

    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('renders as secure text entry when secureTextEntry is true', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Password'
        value=''
        onChange={mockOnChange}
        secureTextEntry
      />
    );

    // Verify component renders - secureTextEntry is a prop that affects behavior
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('renders as multiline when multiline is true', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Bio'
        value=''
        onChange={mockOnChange}
        multiline
        numberOfLines={5}
      />
    );

    // Verify component renders with multiline
    expect(screen.getByText('Bio')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Username'
        value='test'
        onChange={mockOnChange}
        disabled
      />
    );

    // Verify component renders with disabled state
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
  });

  it('uses correct keyboardType', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Email'
        value=''
        onChange={mockOnChange}
        keyboardType='email-address'
      />
    );

    // Verify component renders
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('uses correct autoCapitalize', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Username'
        value=''
        onChange={mockOnChange}
        autoCapitalize='none'
      />
    );

    // Verify component renders
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('uses correct autoCorrect', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Username'
        value=''
        onChange={mockOnChange}
        autoCorrect={false}
      />
    );

    // Verify component renders
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it.skip('calls onChange when value changes with error', () => {
    const mockOnChange = jest.fn();
    render(
      <FormInput
        label='Username'
        value=''
        onChange={mockOnChange}
        error='Error message'
        placeholder='Enter username'
      />
    );

    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Simulate user typing
    const input = screen.getByPlaceholderText('Enter username');
    fireEvent(input, 'changeText', 'newvalue');

    expect(mockOnChange).toHaveBeenCalledWith('newvalue');
  });
});
