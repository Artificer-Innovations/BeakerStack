import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SocialLoginButton } from '../SocialLoginButton';

describe('SocialLoginButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Google provider', () => {
    it('should render Google button with correct text for sign in', () => {
      const { getByText } = render(
        <SocialLoginButton provider="google" onPress={mockOnPress} mode="signin" />
      );

      expect(getByText('Sign in with Google')).toBeTruthy();
    });

    it('should render Google button with correct text for sign up', () => {
      const { getByText } = render(
        <SocialLoginButton provider="google" onPress={mockOnPress} mode="signup" />
      );

      expect(getByText('Sign up with Google')).toBeTruthy();
    });

    it('should call onPress with google provider when clicked', async () => {
      const promise = Promise.resolve(undefined);
      mockOnPress.mockReturnValue(promise);
      const { getByText } = render(
        <SocialLoginButton provider="google" onPress={mockOnPress} />
      );

      await act(async () => {
        fireEvent.press(getByText('Sign in with Google'));
        // Wait for the promise to fully resolve and finally block to complete
        await promise;
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockOnPress).toHaveBeenCalledWith('google');
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Apple provider', () => {
    it('should render Apple button with correct text for sign in', () => {
      const { getByText } = render(
        <SocialLoginButton provider="apple" onPress={mockOnPress} mode="signin" />
      );

      expect(getByText('Sign in with Apple')).toBeTruthy();
    });

    it('should render Apple button with correct text for sign up', () => {
      const { getByText } = render(
        <SocialLoginButton provider="apple" onPress={mockOnPress} mode="signup" />
      );

      expect(getByText('Sign up with Apple')).toBeTruthy();
    });

    it('should call onPress with apple provider when clicked', async () => {
      const promise = Promise.resolve(undefined);
      mockOnPress.mockReturnValue(promise);
      const { getByText } = render(
        <SocialLoginButton provider="apple" onPress={mockOnPress} />
      );

      await act(async () => {
        fireEvent.press(getByText('Sign in with Apple'));
        // Wait for the promise to fully resolve and finally block to complete
        await promise;
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockOnPress).toHaveBeenCalledWith('apple');
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading state', () => {
    it('should show loading indicator while onPress is executing', async () => {
      let resolvePress: () => void;
      const pressPromise = new Promise<void>((resolve) => {
        resolvePress = resolve;
      });
      mockOnPress.mockReturnValue(pressPromise);

      const { getByText, queryByText, getByTestId } = render(
        <SocialLoginButton provider="google" onPress={mockOnPress} />
      );

      await act(async () => {
        fireEvent.press(getByText('Sign in with Google'));
        // Wait for state update to show loading
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(queryByText('Sign in with Google')).toBeNull();
      });

      // Resolve the promise and wait for the finally block to complete
      await act(async () => {
        resolvePress!();
        await pressPromise;
        await new Promise(resolve => setTimeout(resolve, 0));
      });
    });

    it('should disable button during loading', async () => {
      let resolvePress: () => void;
      const pressPromise = new Promise<void>((resolve) => {
        resolvePress = resolve;
      });
      mockOnPress.mockReturnValue(pressPromise);

      const { getByText, UNSAFE_getByType } = render(
        <SocialLoginButton provider="google" onPress={mockOnPress} />
      );

      const button = getByText('Sign in with Google').parent;
      await act(async () => {
        fireEvent.press(getByText('Sign in with Google'));
        // Wait for state update
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(mockOnPress).toHaveBeenCalledTimes(1);
      });

      // Button should be disabled during loading - try to press again
      if (button) {
        fireEvent.press(button);
      }

      // Should still only be called once because button is disabled
      expect(mockOnPress).toHaveBeenCalledTimes(1);

      // Resolve the promise and wait for the finally block to complete
      await act(async () => {
        resolvePress!();
        await pressPromise;
        await new Promise(resolve => setTimeout(resolve, 0));
      });
    });

    it('should re-enable button after onPress completes', async () => {
      const promise1 = Promise.resolve(undefined);
      mockOnPress.mockReturnValue(promise1);

      const { getByText } = render(
        <SocialLoginButton provider="google" onPress={mockOnPress} />
      );

      await act(async () => {
        fireEvent.press(getByText('Sign in with Google'));
        // Wait for promise to resolve and finally block to complete
        await promise1;
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockOnPress).toHaveBeenCalledTimes(1);

      // Should be able to press again
      const promise2 = Promise.resolve(undefined);
      mockOnPress.mockReturnValue(promise2);
      
      await act(async () => {
        fireEvent.press(getByText('Sign in with Google'));
        // Wait for promise to resolve and finally block to complete
        await promise2;
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockOnPress).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle onPress errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorPromise = Promise.reject(new Error('OAuth failed'));
      mockOnPress.mockReturnValue(errorPromise);

      const { getByText } = render(
        <SocialLoginButton provider="google" onPress={mockOnPress} />
      );

      await act(async () => {
        fireEvent.press(getByText('Sign in with Google'));
        // Wait for promise to reject and finally block to complete
        try {
          await errorPromise;
        } catch {
          // Expected error
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'google OAuth error:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should re-enable button after error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorPromise = Promise.reject(new Error('OAuth failed'));
      mockOnPress.mockReturnValue(errorPromise);

      const { getByText } = render(
        <SocialLoginButton provider="google" onPress={mockOnPress} />
      );

      await act(async () => {
        fireEvent.press(getByText('Sign in with Google'));
        // Wait for promise to reject and finally block to complete
        try {
          await errorPromise;
        } catch {
          // Expected error
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockOnPress).toHaveBeenCalledTimes(1);

      // Should be able to press again after error
      const successPromise = Promise.resolve(undefined);
      mockOnPress.mockReturnValue(successPromise);
      
      await act(async () => {
        fireEvent.press(getByText('Sign in with Google'));
        // Wait for promise to resolve and finally block to complete
        await successPromise;
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockOnPress).toHaveBeenCalledTimes(2);

      consoleWarnSpy.mockRestore();
    });
  });
});

