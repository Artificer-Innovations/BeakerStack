import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ProfileEditor } from '@beakerstack/shared/components/profile/ProfileEditor.web';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '@beakerstack/shared/types/profile';

// Mock the form components
jest.mock('@beakerstack/shared/components/forms/FormInput.web', () => ({
  FormInput: ({
    label,
    value,
    onChange,
    error,
    placeholder,
    disabled,
  }: any) => (
    <div>
      <label>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
      {error && (
        <span data-testid={`error-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {error}
        </span>
      )}
    </div>
  ),
}));

jest.mock('@beakerstack/shared/components/forms/FormButton.web', () => ({
  FormButton: ({ title, onPress, loading, disabled }: any) => (
    <button
      onClick={onPress}
      disabled={disabled || loading}
      data-testid='submit-button'
    >
      {loading ? 'Loading...' : title}
    </button>
  ),
}));

jest.mock('@beakerstack/shared/components/forms/FormError.web', () => ({
  FormError: ({ message }: any) =>
    message ? <div data-testid='form-error'>{message}</div> : null,
}));

// Mock AvatarUpload component
jest.mock('@beakerstack/shared/components/profile/AvatarUpload.web', () => ({
  AvatarUpload: ({ onUploadComplete, onRemove }: any) => {
    return (
      <div data-testid='avatar-upload'>
        <button
          data-testid='avatar-upload-trigger'
          onClick={() =>
            onUploadComplete('https://example.com/avatar.jpg?t=123')
          }
        >
          Upload
        </button>
        <button
          data-testid='avatar-upload-query-only'
          onClick={() => onUploadComplete('?cacheBust=1')}
        >
          Upload query only
        </button>
        <button data-testid='avatar-remove-trigger' onClick={() => onRemove()}>
          Remove
        </button>
      </div>
    );
  },
}));

// Mock ProfileContext
const mockProfile: UserProfile = {
  id: 'profile-id-1',
  user_id: 'user-id-1',
  username: 'testuser',
  display_name: 'Test User',
  bio: 'Test bio',
  avatar_url: null,
  website: null,
  location: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockUser: User = {
  id: 'user-id-1',
  email: 'test@example.com',
} as User;

const mockSupabaseClient = {} as SupabaseClient;

const createContextValue = (
  overrides: Partial<ReturnType<typeof useProfileContext>> = {}
): ReturnType<typeof useProfileContext> =>
  ({
    supabaseClient: mockSupabaseClient,
    currentUser: mockUser,
    profile: null,
    loading: false,
    error: null,
    fetchProfile: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    refreshProfile: jest.fn(),
    ...overrides,
  }) as ReturnType<typeof useProfileContext>;

jest.mock('@beakerstack/shared/contexts/ProfileContext', () => ({
  useProfileContext: jest.fn(),
}));

import { useProfileContext } from '@beakerstack/shared/contexts/ProfileContext';

describe('ProfileEditor', () => {
  const mockUseProfileContext = useProfileContext as jest.MockedFunction<
    typeof useProfileContext
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        createProfile: jest.fn().mockResolvedValue(mockProfile),
        updateProfile: jest.fn().mockResolvedValue(mockProfile),
      })
    );
  });

  it('renders message when user is not logged in', () => {
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        currentUser: null,
      })
    );

    render(<ProfileEditor />);
    expect(
      screen.getByText('Please sign in to edit your profile.')
    ).toBeInTheDocument();
  });

  it('renders loading message when profile is loading', () => {
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        loading: true,
      })
    );

    render(<ProfileEditor />);
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('initializes form with existing profile data', async () => {
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        profile: mockProfile,
      })
    );

    render(<ProfileEditor />);

    await waitFor(() => {
      const usernameInput = screen.getByTestId(
        'input-username'
      ) as HTMLInputElement;
      expect(usernameInput.value).toBe('testuser');
    });

    const displayNameInput = screen.getByTestId(
      'input-display-name'
    ) as HTMLInputElement;
    expect(displayNameInput.value).toBe('Test User');

    const bioInput = screen.getByTestId('input-bio') as HTMLInputElement;
    expect(bioInput.value).toBe('Test bio');
  });

  it('updates form data when user types', async () => {
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        profile: mockProfile,
      })
    );

    render(<ProfileEditor />);

    await waitFor(() => {
      const usernameInput = screen.getByTestId(
        'input-username'
      ) as HTMLInputElement;
      fireEvent.change(usernameInput, { target: { value: 'newusername' } });
      expect(usernameInput.value).toBe('newusername');
    });
  });

  it('validates and shows field errors for invalid input', async () => {
    mockUseProfileContext.mockReturnValue(createContextValue());

    render(<ProfileEditor />);

    const usernameInput = screen.getByTestId(
      'input-username'
    ) as HTMLInputElement;
    fireEvent.change(usernameInput, { target: { value: 'ab' } }); // Too short

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-username')).toBeInTheDocument();
    });
  });

  it('creates profile when no profile exists', async () => {
    const mockCreateProfile = jest.fn().mockResolvedValue(mockProfile);
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        createProfile: mockCreateProfile,
      })
    );

    render(<ProfileEditor />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateProfile).toHaveBeenCalledWith(
        'user-id-1',
        expect.any(Object)
      );
    });
  });

  it('updates profile when profile exists', async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue(mockProfile);
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        profile: mockProfile,
        updateProfile: mockUpdateProfile,
      })
    );

    render(<ProfileEditor />);

    await waitFor(() => {
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Update Profile');
    });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        'user-id-1',
        expect.any(Object)
      );
    });
  });

  it('calls onSuccess callback after successful submission', async () => {
    const mockOnSuccess = jest.fn();
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        createProfile: jest.fn().mockResolvedValue(mockProfile),
      })
    );

    render(<ProfileEditor onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('calls onError callback when submission fails', async () => {
    const mockOnError = jest.fn();
    const error = new Error('Database error');
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        createProfile: jest.fn().mockRejectedValue(error),
      })
    );

    render(<ProfileEditor onError={mockOnError} />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(error);
    });
  });

  it('displays profile error when hook has error', () => {
    const error = new Error('Failed to fetch profile');
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        error,
      })
    );

    render(<ProfileEditor />);

    expect(screen.getByTestId('form-error')).toHaveTextContent(
      'Failed to fetch profile'
    );
  });

  it('clears field error when user starts typing', async () => {
    mockUseProfileContext.mockReturnValue(createContextValue());

    render(<ProfileEditor />);

    const usernameInput = screen.getByTestId(
      'input-username'
    ) as HTMLInputElement;

    // First, trigger a validation error
    fireEvent.change(usernameInput, { target: { value: 'ab' } }); // Too short
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-username')).toBeInTheDocument();
    });

    // Now type a valid value - error should be cleared
    fireEvent.change(usernameInput, { target: { value: 'validusername' } });

    await waitFor(() => {
      expect(screen.queryByTestId('error-username')).not.toBeInTheDocument();
    });
  });

  it('clears general error when user starts typing', async () => {
    const mockOnError = jest.fn();
    const error = new Error('Database error');
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        createProfile: jest.fn().mockRejectedValue(error),
      })
    );

    render(<ProfileEditor onError={mockOnError} />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toBeInTheDocument();
    });

    // Now type in a field - general error should be cleared
    const usernameInput = screen.getByTestId(
      'input-username'
    ) as HTMLInputElement;
    fireEvent.change(usernameInput, { target: { value: 'newvalue' } });

    await waitFor(() => {
      expect(screen.queryByTestId('form-error')).not.toBeInTheDocument();
    });
  });

  it('shows field errors for display_name', async () => {
    mockUseProfileContext.mockReturnValue(createContextValue());

    render(<ProfileEditor />);

    const displayNameInput = screen.getByTestId(
      'input-display-name'
    ) as HTMLInputElement;

    // Set display_name to be too long (over 100 chars)
    fireEvent.change(displayNameInput, {
      target: { value: 'a'.repeat(101) },
    });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-display-name')).toBeInTheDocument();
    });
  });

  it('shows field errors for website with invalid URL', async () => {
    mockUseProfileContext.mockReturnValue(createContextValue());

    render(<ProfileEditor />);

    const websiteInput = screen.getByTestId(
      'input-website'
    ) as HTMLInputElement;

    // Set website to invalid URL
    fireEvent.change(websiteInput, {
      target: { value: 'not-a-valid-url' },
    });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-website')).toBeInTheDocument();
    });
  });

  it('handles avatar upload complete callback', async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue(mockProfile);
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        profile: mockProfile,
        updateProfile: mockUpdateProfile,
      })
    );

    render(<ProfileEditor />);

    await waitFor(() => {
      expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
    });

    const uploadTrigger = screen.getByTestId('avatar-upload-trigger');
    fireEvent.click(uploadTrigger);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith('user-id-1', {
        avatar_url: 'https://example.com/avatar.jpg',
      });
    });
  });

  it('shows field errors for bio when bio is too long', async () => {
    mockUseProfileContext.mockReturnValue(createContextValue());

    render(<ProfileEditor />);

    fireEvent.change(screen.getByTestId('input-bio'), {
      target: { value: 'a'.repeat(501) },
    });
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-bio')).toBeInTheDocument();
    });
  });

  it('updates location field and clears validation errors', async () => {
    mockUseProfileContext.mockReturnValue(createContextValue());

    render(<ProfileEditor />);

    fireEvent.change(screen.getByTestId('input-username'), {
      target: { value: 'ab' },
    });
    fireEvent.click(screen.getByTestId('submit-button'));
    await waitFor(() => {
      expect(screen.getByTestId('error-username')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-location'), {
      target: { value: 'Portland, OR' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('input-location')).toHaveValue('Portland, OR');
    });
  });

  it('calls onError with a wrapped error for non-Error rejections', async () => {
    const mockOnError = jest.fn();
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        createProfile: jest.fn().mockRejectedValue('database unavailable'),
      })
    );

    render(<ProfileEditor onError={mockOnError} />);
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'database unavailable' })
      );
    });
  });

  it('skips avatar database update when upload URL has no path', async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue(mockProfile);
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        profile: mockProfile,
        updateProfile: mockUpdateProfile,
      })
    );

    render(<ProfileEditor />);

    fireEvent.click(screen.getByTestId('avatar-upload-query-only'));

    await waitFor(() => {
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  it('handles avatar remove callback', async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue(mockProfile);
    mockUseProfileContext.mockReturnValue(
      createContextValue({
        profile: mockProfile,
        updateProfile: mockUpdateProfile,
      })
    );

    render(<ProfileEditor />);

    await waitFor(() => {
      expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
    });

    const removeTrigger = screen.getByTestId('avatar-remove-trigger');
    fireEvent.click(removeTrigger);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith('user-id-1', {
        avatar_url: null,
      });
    });
  });
});
