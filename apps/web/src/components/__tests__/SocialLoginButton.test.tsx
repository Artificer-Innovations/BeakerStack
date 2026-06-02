import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialLoginButton } from '../SocialLoginButton';
import { Logger } from '@beakerstack/logger';

const createDeferred = () => {
  let innerResolve: (() => void) | undefined;
  const promise = new Promise<void>(resolve => {
    innerResolve = resolve;
  });
  const resolve = () => {
    if (!innerResolve) {
      throw new Error('Deferred resolve invoked before initialization');
    }
    innerResolve();
  };
  return { promise, resolve };
};

describe('SocialLoginButton', () => {
  it('renders Google copy for sign-in by default', () => {
    const mockOnPress = vi.fn();

    render(<SocialLoginButton onPress={mockOnPress} />);

    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('renders sign-up copy when mode is signup', () => {
    const mockOnPress = vi.fn();

    render(<SocialLoginButton onPress={mockOnPress} mode='signup' />);

    expect(screen.getByText('Sign up with Google')).toBeInTheDocument();
  });

  it('uses provider prop for label copy and aria-label', () => {
    const mockOnPress = vi.fn();

    render(
      <SocialLoginButton onPress={mockOnPress} provider='Apple' mode='signin' />
    );

    expect(screen.getByText('Sign in with Apple')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Sign in with Apple'
    );
  });

  it('calls onPress once per click and displays loading state', async () => {
    const user = userEvent.setup();
    const { promise: pressPromise, resolve: resolvePress } = createDeferred();
    const mockOnPress = vi.fn().mockReturnValueOnce(pressPromise);

    render(<SocialLoginButton onPress={mockOnPress} />);

    const button = screen.getByRole('button');

    // Click the button and wait for loading state
    await act(async () => {
      await user.click(button);
    });

    // Wait for the loading state to appear (state update after click)
    await waitFor(() => {
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    // Resolve the promise to complete the async operation
    await act(async () => {
      resolvePress();
      await pressPromise;
    });

    await waitFor(() => {
      expect(button).toBeEnabled();
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });
  });

  it('logs an error when onPress rejects', async () => {
    const user = userEvent.setup();
    const loggerSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});
    const mockOnPress = vi
      .fn()
      .mockRejectedValueOnce(new Error('Google sign-in failed'));

    render(<SocialLoginButton onPress={mockOnPress} />);

    await act(async () => {
      await user.click(screen.getByRole('button'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(loggerSpy).toHaveBeenCalledWith(
      'Google sign-in error:',
      expect.any(Error)
    );

    loggerSpy.mockRestore();
  });
});
