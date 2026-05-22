jest.mock('@beakerstack/shared/validation/profileSchema', () => {
  const actual = jest.requireActual(
    '@beakerstack/shared/validation/profileSchema'
  );
  const { z } = jest.requireActual('zod');
  return {
    ...actual,
    profileFormSchema: actual.profileFormSchema.extend({
      location: z.string().min(5, 'Location is invalid'),
    }),
  };
});

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '@beakerstack/shared/types/profile';

jest.mock('@beakerstack/shared/components/forms/FormInput.native', () => ({
  FormInput: ({
    label,
    onChange,
    error: _error,
  }: {
    label: string;
    onChange: (value: string) => void;
    error?: string;
  }) => (
    <input
      aria-label={label}
      onChange={e => onChange(e.target.value)}
      data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
    />
  ),
}));

jest.mock('@beakerstack/shared/components/forms/FormButton.native', () => ({
  FormButton: ({ onPress }: { onPress: () => void }) => (
    <button type='button' onClick={onPress} data-testid='submit-button'>
      Save
    </button>
  ),
}));

jest.mock('@beakerstack/shared/components/forms/FormError.native', () => ({
  FormError: ({ message }: { message?: string }) =>
    message ? <div data-testid='form-error'>{message}</div> : null,
}));

jest.mock('@beakerstack/shared/components/profile/AvatarUpload.native', () => ({
  AvatarUpload: ({
    onUploadComplete,
    onRemove,
  }: {
    onUploadComplete: (url: string) => void | Promise<void>;
    onRemove: () => void | Promise<void>;
  }) => (
    <div data-testid='avatar-upload'>
      <button
        type='button'
        data-testid='avatar-upload-complete'
        onClick={() => onUploadComplete('https://example.com/new.jpg?t=1')}
      >
        Complete
      </button>
      <button
        type='button'
        data-testid='avatar-upload-remove'
        onClick={() => onRemove()}
      >
        Remove
      </button>
    </div>
  ),
}));

jest.mock('@beakerstack/logger', () => ({
  Logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

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

const mockUser = { id: 'user-id-1', email: 'test@example.com' } as User;
const mockSupabaseClient = {} as SupabaseClient;

jest.mock('@beakerstack/shared/contexts/ProfileContext', () => ({
  useProfileContext: jest.fn(),
}));

import { ProfileEditor } from '@beakerstack/shared/components/profile/ProfileEditor.native';
import { useProfileContext } from '@beakerstack/shared/contexts/ProfileContext';
import { profileFormSchema } from '@beakerstack/shared/validation/profileSchema';

describe('ProfileEditor.native — coverage gaps', () => {
  const mockUseProfileContext = useProfileContext as jest.MockedFunction<
    typeof useProfileContext
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfileContext.mockReturnValue({
      supabaseClient: mockSupabaseClient,
      currentUser: mockUser,
      profile: mockProfile,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });
  });

  it('maps location validation errors to the location field', async () => {
    render(<ProfileEditor />);

    fireEvent.change(screen.getByTestId('input-location'), {
      target: { value: 'ab' },
    });
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent(
        'Please correct the errors below'
      );
    });
  });

  it('handles malformed zod error payloads during submit', async () => {
    jest.spyOn(profileFormSchema, 'parse').mockImplementationOnce(() => {
      throw { errors: [null] };
    });

    render(<ProfileEditor />);
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toBeInTheDocument();
    });
  });

  it('maps validation errors for all profile fields', async () => {
    const { ZodError } = require('zod');
    jest.spyOn(profileFormSchema, 'parse').mockImplementation(() => {
      throw new ZodError([
        { code: 'custom', path: ['username'], message: 'Bad username' },
        { code: 'custom', path: ['display_name'], message: 'Bad display name' },
        { code: 'custom', path: ['bio'], message: 'Bad bio' },
        { code: 'custom', path: ['website'], message: 'Bad website' },
        { code: 'custom', path: ['location'], message: 'Bad location' },
      ]);
    });

    render(<ProfileEditor />);
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent(
        'Please correct the errors below'
      );
    });
  });

  it('initializes empty optional fields when profile values are null', () => {
    mockUseProfileContext.mockReturnValue({
      supabaseClient: mockSupabaseClient,
      currentUser: mockUser,
      profile: {
        ...mockProfile,
        username: null,
        display_name: null,
        bio: null,
        website: null,
        location: null,
        avatar_url: null,
      },
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor />);
    expect(screen.getByTestId('input-username')).toBeInTheDocument();
  });

  it('persists avatar uploads and removals through profile update', async () => {
    const updateProfile = jest.fn().mockResolvedValue(mockProfile);
    mockUseProfileContext.mockReturnValue({
      supabaseClient: mockSupabaseClient,
      currentUser: mockUser,
      profile: mockProfile,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile,
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor />);

    fireEvent.click(screen.getByTestId('avatar-upload-complete'));
    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith('user-id-1', {
        avatar_url: 'https://example.com/new.jpg',
      });
    });

    fireEvent.click(screen.getByTestId('avatar-upload-remove'));
    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith('user-id-1', {
        avatar_url: null,
      });
    });
  });

  it('renders nullable form values and field error props', () => {
    const actualUseState = React.useState;
    let callIndex = 0;
    const useStateSpy = jest
      .spyOn(React, 'useState')
      .mockImplementation(initial => {
        callIndex += 1;
        if (callIndex === 1) {
          return [
            {
              username: null,
              display_name: undefined,
              bio: null,
              website: undefined,
              location: null,
              avatar_url: undefined,
            },
            jest.fn(),
          ];
        }
        if (callIndex === 2) {
          return [
            {
              username: 'Bad username',
              display_name: 'Bad display name',
              bio: 'Bad bio',
              website: 'Bad website',
              location: 'Bad location',
            },
            jest.fn(),
          ];
        }
        return actualUseState(initial);
      });

    render(<ProfileEditor />);
    expect(screen.getByTestId('input-username')).toBeInTheDocument();
    expect(screen.getByTestId('input-display-name')).toBeInTheDocument();
    expect(screen.getByTestId('input-bio')).toBeInTheDocument();
    expect(screen.getByTestId('input-website')).toBeInTheDocument();
    expect(screen.getByTestId('input-location')).toBeInTheDocument();

    useStateSpy.mockRestore();
  });

  it('uses fallback save error message when Error has no message', async () => {
    jest.spyOn(profileFormSchema, 'parse').mockReturnValue({
      username: 'testuser',
      display_name: 'Test User',
      bio: 'Test bio',
      website: 'https://example.com',
      location: 'Seattle',
      avatar_url: '',
    });

    mockUseProfileContext.mockReturnValue({
      supabaseClient: mockSupabaseClient,
      currentUser: mockUser,
      profile: mockProfile,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn().mockRejectedValue(new Error('')),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor />);
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent(
        'Failed to save profile. Please try again.'
      );
    });
  });
});
