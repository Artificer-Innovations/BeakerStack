import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Text } from 'react-native';
import { Button } from '@beakerstack/shared/components/primitives/Button.native';

describe('Button (Native)', () => {
  it('renders string children and handles press', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Save</Button>);
    fireEvent.click(screen.getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders loading state without the label text', () => {
    const { queryByText } = render(<Button loading>Save</Button>);
    expect(queryByText('Save')).toBeNull();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(
      <Button disabled onPress={onPress}>
        Save
      </Button>
    );
    fireEvent.click(screen.getByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders non-string children', () => {
    render(
      <Button>
        <Text>Custom child</Text>
      </Button>
    );
    expect(screen.getByText('Custom child')).toBeTruthy();
  });

  it.each([
    ['primary', 'Primary'],
    ['secondary', 'Secondary'],
    ['destructive', 'Destructive'],
    ['ghost', 'Ghost'],
  ] as const)('renders %s variant', (variant, label) => {
    render(<Button variant={variant}>{label}</Button>);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it.each(['sm', 'md', 'lg'] as const)('renders %s size', size => {
    render(<Button size={size}>Sized</Button>);
    expect(screen.getByText('Sized')).toBeTruthy();
  });

  it('supports not full width layout', () => {
    render(<Button fullWidth={false}>Compact</Button>);
    expect(screen.getByText('Compact')).toBeTruthy();
  });
});
