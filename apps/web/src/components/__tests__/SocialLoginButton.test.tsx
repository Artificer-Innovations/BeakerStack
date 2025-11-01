import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialLoginButton } from '../SocialLoginButton';

describe('SocialLoginButton', () => {
  it('renders Google button with correct text for signin', () => {
    const mockOnPress = vi.fn();
    render(<SocialLoginButton provider="google" onPress={mockOnPress} mode="signin" />);
    
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('renders Google button with correct text for signup', () => {
    const mockOnPress = vi.fn();
    render(<SocialLoginButton provider="google" onPress={mockOnPress} mode="signup" />);
    
    expect(screen.getByText('Sign up with Google')).toBeInTheDocument();
  });

  it('renders Apple button with correct text', () => {
    const mockOnPress = vi.fn();
    render(<SocialLoginButton provider="apple" onPress={mockOnPress} mode="signin" />);
    
    expect(screen.getByText('Sign in with Apple')).toBeInTheDocument();
  });

  it('defaults to signin mode when mode is not provided', () => {
    const mockOnPress = vi.fn();
    render(<SocialLoginButton provider="google" onPress={mockOnPress} />);
    
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('calls onPress with correct provider when clicked', async () => {
    const user = userEvent.setup();
    const mockOnPress = vi.fn().mockResolvedValue(undefined);
    
    render(<SocialLoginButton provider="google" onPress={mockOnPress} />);
    
    const button = screen.getByRole('button');
    await act(async () => {
      await user.click(button);
      // Wait for async state updates to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(mockOnPress).toHaveBeenCalledWith('google');
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state while onPress is executing', async () => {
    const user = userEvent.setup();
    const mockOnPress = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<SocialLoginButton provider="google" onPress={mockOnPress} />);
    
    const button = screen.getByRole('button');
    await act(async () => {
      await user.click(button);
      // Wait for state update to show loading
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should show loading text immediately
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    
    // Button should be disabled
    expect(button).toBeDisabled();
    
    // Wait for the promise to resolve
    await waitFor(() => {
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });
  });

  it('disables button during loading', async () => {
    const user = userEvent.setup();
    const mockOnPress = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<SocialLoginButton provider="google" onPress={mockOnPress} />);
    
    const button = screen.getByRole('button');
    await act(async () => {
      await user.click(button);
      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(button).toBeDisabled();
    
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('handles onPress errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockOnPress = vi.fn().mockRejectedValue(new Error('OAuth failed'));
    
    render(<SocialLoginButton provider="apple" onPress={mockOnPress} />);
    
    const button = screen.getByRole('button');
    await act(async () => {
      await user.click(button);
      // Wait for state updates
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should log error
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'apple OAuth error:',
        expect.any(Error)
      );
    });
    
    // Button should be re-enabled after error
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('applies correct styling for Google button', () => {
    const mockOnPress = vi.fn();
    render(<SocialLoginButton provider="google" onPress={mockOnPress} />);
    
    const button = screen.getByRole('button');
    
    // Google should have white background
    expect(button).toHaveClass('bg-white');
    expect(button).toHaveClass('text-gray-700');
  });

  it('applies correct styling for Apple button', () => {
    const mockOnPress = vi.fn();
    render(<SocialLoginButton provider="apple" onPress={mockOnPress} />);
    
    const button = screen.getByRole('button');
    
    // Apple should have black background
    expect(button).toHaveClass('bg-black');
    expect(button).toHaveClass('text-white');
  });

  it('prevents multiple simultaneous clicks', async () => {
    const user = userEvent.setup();
    const mockOnPress = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<SocialLoginButton provider="google" onPress={mockOnPress} />);
    
    const button = screen.getByRole('button');
    
    // First click - should trigger loading state
    await act(async () => {
      await user.click(button);
      // Wait for state update to disable button
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Wait for button to actually be disabled
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    
    // Try clicking again (should be disabled now and not trigger another call)
    await act(async () => {
      // userEvent won't click disabled buttons, so we use fireEvent directly
      const { fireEvent } = await import('@testing-library/react');
      fireEvent.click(button);
      fireEvent.click(button);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should only call once because button is disabled after first click
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});

