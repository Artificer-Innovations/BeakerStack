import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@beakerstack/shared/components/primitives/Button.web';

describe('Button (Web)', () => {
  it('renders children and calls onPress', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Save</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state with custom loadingText', () => {
    render(
      <Button loading loadingText='Please wait'>
        Save
      </Button>
    );
    expect(screen.getByText('Please wait')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes', () => {
    const { rerender } = render(<Button variant='secondary'>S</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-white/);

    rerender(<Button variant='destructive'>D</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-red-600/);

    rerender(<Button variant='ghost'>G</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-transparent/);
  });

  it('applies size classes', () => {
    const { rerender } = render(<Button size='sm'>S</Button>);
    expect(screen.getByRole('button').className).toMatch(/text-sm/);

    rerender(<Button size='lg'>L</Button>);
    expect(screen.getByRole('button').className).toMatch(/text-base/);
  });

  it('applies fullWidth class when fullWidth is true', () => {
    render(<Button fullWidth>Wide</Button>);
    expect(screen.getByRole('button').className).toMatch(/w-full/);
  });

  it('omits fullWidth class by default', () => {
    render(<Button>Narrow</Button>);
    expect(screen.getByRole('button').className).not.toMatch(/\bw-full\b/);
  });

  it('respects submit and reset types', () => {
    const { rerender } = render(<Button type='submit'>Go</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');

    rerender(<Button type='reset'>Reset</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(
      <Button onPress={onPress} disabled>
        X
      </Button>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
