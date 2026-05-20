import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormButton } from '@beakerstack/shared/components/forms/FormButton.web';

describe('FormButton (Web)', () => {
  it('renders with title', () => {
    const mockOnPress = jest.fn();
    render(<FormButton title='Submit' onPress={mockOnPress} />);

    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('calls onPress when clicked', () => {
    const mockOnPress = jest.fn();
    render(<FormButton title='Submit' onPress={mockOnPress} />);

    const button = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when loading prop is true', () => {
    const mockOnPress = jest.fn();
    render(<FormButton title='Submit' onPress={mockOnPress} loading />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    const mockOnPress = jest.fn();
    render(<FormButton title='Submit' onPress={mockOnPress} loading />);

    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('is disabled when disabled prop is true', () => {
    const mockOnPress = jest.fn();
    render(<FormButton title='Submit' onPress={mockOnPress} disabled />);

    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('is enabled when not loading and not disabled', () => {
    const mockOnPress = jest.fn();
    render(<FormButton title='Submit' onPress={mockOnPress} />);

    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it('does not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    render(<FormButton title='Submit' onPress={mockOnPress} disabled />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const mockOnPress = jest.fn();
    render(<FormButton title='Submit' onPress={mockOnPress} loading />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('maps secondary and danger variants', () => {
    const mockOnPress = jest.fn();
    const { rerender } = render(
      <FormButton title='Secondary' onPress={mockOnPress} variant='secondary' />
    );
    expect(screen.getByRole('button').className).toMatch(/bg-white/);

    rerender(
      <FormButton title='Danger' onPress={mockOnPress} variant='danger' />
    );
    expect(screen.getByRole('button').className).toMatch(/bg-red-600/);
  });

  it('supports submit type and partial width', () => {
    const mockOnPress = jest.fn();
    render(
      <FormButton
        title='Submit'
        onPress={mockOnPress}
        type='submit'
        fullWidth={false}
        className='mt-4'
      />
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button.className).toMatch(/mt-4/);
    expect(button.className).not.toMatch(/\bw-full\b/);
  });
});
