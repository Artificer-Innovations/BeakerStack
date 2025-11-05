import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ProfileEditor } from '@shared/src/components/profile/ProfileEditor.web';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '@shared/src/types/profile';

// Mock the form components
jest.mock('@shared/src/components/forms/FormInput.web', () => ({
  FormInput: ({ label, value, onChange, error, placeholder, disabled }: any) => (
    <div>
      <label>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
      {error && <span data-testid={`error-${label.toLowerCase().replace(/\s+/g, '-')}`}>{error}</span>}
    </div>
  ),
}));

jest.mock('@shared/src/components/forms/FormButton.web', () => ({
  FormButton: ({ title, onPress, loading, disabled }: any) => (
    <button onClick={onPress} disabled={disabled || loading} data-testid="submit-button">
      {loading ? 'Loading...' : title}
    </button>
  ),
}));

jest.mock('@shared/src/components/forms/FormError.web', () => ({
  FormError: ({ message }: any) => (message ? <div data-testid="form-error">{message}</div> : null),
}));

// Mock useProfile hook
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

jest.mock('@shared/src/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

import { useProfile } from '@shared/src/hooks/useProfile';

describe('ProfileEditor', () => {
  const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn().mockResolvedValue(mockProfile),
      updateProfile: jest.fn().mockResolvedValue(mockProfile),
      refreshProfile: jest.fn(),
    });
  });

  it('renders message when user is not logged in', () => {
    render(<ProfileEditor supabaseClient={mockSupabaseClient} user={null} />);
    expect(screen.getByText('Please sign in to edit your profile.')).toBeInTheDocument();
  });

  it('renders loading message when profile is loading', () => {
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: true,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor supabaseClient={mockSupabaseClient} user={mockUser} />);
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('initializes form with existing profile data', async () => {
    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor supabaseClient={mockSupabaseClient} user={mockUser} />);

    await waitFor(() => {
      const usernameInput = screen.getByTestId('input-username') as HTMLInputElement;
      expect(usernameInput.value).toBe('testuser');
    });

    const displayNameInput = screen.getByTestId('input-display-name') as HTMLInputElement;
    expect(displayNameInput.value).toBe('Test User');

    const bioInput = screen.getByTestId('input-bio') as HTMLInputElement;
    expect(bioInput.value).toBe('Test bio');
  });

  it('updates form data when user types', async () => {
    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor supabaseClient={mockSupabaseClient} user={mockUser} />);

    await waitFor(() => {
      const usernameInput = screen.getByTestId('input-username') as HTMLInputElement;
      fireEvent.change(usernameInput, { target: { value: 'newusername' } });
      expect(usernameInput.value).toBe('newusername');
    });
  });

  it('validates and shows field errors for invalid input', async () => {
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor supabaseClient={mockSupabaseClient} user={mockUser} />);

    const usernameInput = screen.getByTestId('input-username') as HTMLInputElement;
    fireEvent.change(usernameInput, { target: { value: 'ab' } }); // Too short

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-username')).toBeInTheDocument();
    });
  });

  it('creates profile when no profile exists', async () => {
    const mockCreateProfile = jest.fn().mockResolvedValue(mockProfile);
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: mockCreateProfile,
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor supabaseClient={mockSupabaseClient} user={mockUser} />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateProfile).toHaveBeenCalledWith('user-id-1', expect.any(Object));
    });
  });

  it('updates profile when profile exists', async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue(mockProfile);
    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: mockUpdateProfile,
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor supabaseClient={mockSupabaseClient} user={mockUser} />);

    await waitFor(() => {
      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toHaveTextContent('Update Profile');
    });

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith('user-id-1', expect.any(Object));
    });
  });

  it('calls onSuccess callback after successful submission', async () => {
    const mockOnSuccess = jest.fn();
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn().mockResolvedValue(mockProfile),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(
      <ProfileEditor supabaseClient={mockSupabaseClient} user={mockUser} onSuccess={mockOnSuccess} />
    );

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('calls onError callback when submission fails', async () => {
    const mockOnError = jest.fn();
    const error = new Error('Database error');
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn().mockRejectedValue(error),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor supabaseClient={mockSupabaseClient} user={mockUser} onError={mockOnError} />);

    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(error);
    });
  });

  it('displays profile error when hook has error', () => {
    const error = new Error('Failed to fetch profile');
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor supabaseClient={mockSupabaseClient} user={mockUser} />);

    expect(screen.getByTestId('form-error')).toHaveTextContent('Failed to fetch profile');
  });
});

