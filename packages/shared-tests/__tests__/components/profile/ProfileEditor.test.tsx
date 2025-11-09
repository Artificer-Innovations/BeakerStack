import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ProfileEditor } from '@shared/src/components/profile/ProfileEditor.web';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '@shared/src/types/profile';

// Mock the form components
jest.mock('@shared/src/components/forms/FormInput.web', () => ({
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

jest.mock('@shared/src/components/forms/FormButton.web', () => ({
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

jest.mock('@shared/src/components/forms/FormError.web', () => ({
  FormError: ({ message }: any) =>
    message ? <div data-testid='form-error'>{message}</div> : null,
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

jest.mock('@shared/src/contexts/ProfileContext', () => ({
  useProfileContext: jest.fn(),
}));

import { useProfileContext } from '@shared/src/contexts/ProfileContext';

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
});
