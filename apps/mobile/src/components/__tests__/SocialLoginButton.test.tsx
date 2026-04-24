import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { SocialLoginButton } from '../SocialLoginButton';
import { Logger } from '@beakerstack/shared/utils/logger';

describe('SocialLoginButton', () => {
  const mockOnPress = jest.fn<Promise<void>, []>();

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sign-in copy by default', () => {
    const { getByText } = render(<SocialLoginButton onPress={mockOnPress} />);

    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  it('renders sign-up copy when mode is signup', () => {
    const { getByText } = render(
      <SocialLoginButton onPress={mockOnPress} mode='signup' />
    );

    expect(getByText('Sign up with Google')).toBeTruthy();
  });

  it('invokes onPress exactly once per tap and shows loading state', async () => {
    const { promise: pressPromise, resolve: resolvePress } = createDeferred();
    mockOnPress.mockReturnValueOnce(pressPromise);

    const { getByText, queryByText } = render(
      <SocialLoginButton onPress={mockOnPress} />
    );

    await act(async () => {
      fireEvent.press(getByText('Sign in with Google'));
      await waitFor(() =>
        expect(queryByText('Sign in with Google')).toBeNull()
      );
    });

    expect(mockOnPress).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePress();
      await pressPromise;
    });

    // Button should be tappable again after promise resolves
    mockOnPress.mockResolvedValueOnce();

    await act(async () => {
      fireEvent.press(getByText('Sign in with Google'));
      await waitFor(() => expect(mockOnPress).toHaveBeenCalledTimes(2));
    });
  });

  it('logs a warning when onPress rejects', async () => {
    const loggerSpy = jest.spyOn(Logger, 'debug').mockImplementation(() => {});
    const errorPromise = Promise.reject(new Error('Google failure'));
    mockOnPress.mockReturnValueOnce(errorPromise);

    const { getByText } = render(<SocialLoginButton onPress={mockOnPress} />);

    await act(async () => {
      fireEvent.press(getByText('Sign in with Google'));
      try {
        await errorPromise;
      } catch (err) {
        // expected rejection
      }
    });

    expect(loggerSpy).toHaveBeenCalledWith(
      'Google sign-in error:',
      expect.any(Error)
    );

    loggerSpy.mockRestore();
  });
});
