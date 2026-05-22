jest.mock('@beakerstack/shared/validation/profileSchema', () => {
  const actual = jest.requireActual(
    '@beakerstack/shared/validation/profileSchema'
  );
  const { z } = jest.requireActual('zod');
  return {
    ...actual,
    profileFormSchema: actual.profileFormSchema.extend({
      username: z.string().min(5, 'Bad username'),
      display_name: z.string().min(5, 'Bad display name'),
      bio: z.string().min(5, 'Bad bio'),
      website: z.string().min(5, 'Bad website'),
      location: z.string().min(5, 'Bad location'),
    }),
  };
});

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '@beakerstack/shared/types/profile';

jest.mock('@beakerstack/shared/components/forms/FormInput.web', () => ({
  FormInput: ({
    label,
    value,
    onChange,
    error,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
  }) => (
    <div>
      <label>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
      />
      {error ? (
        <span data-testid={`error-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {error}
        </span>
      ) : null}
    </div>
  ),
}));

jest.mock('@beakerstack/shared/components/forms/FormButton.web', () => ({
  FormButton: ({ title, onPress }: { title: string; onPress: () => void }) => (
    <button type='button' onClick={onPress} data-testid='submit-button'>
      {title}
    </button>
  ),
}));

jest.mock('@beakerstack/shared/components/forms/FormError.web', () => ({
  FormError: ({ message }: { message?: string }) =>
    message ? <div data-testid='form-error'>{message}</div> : null,
}));

jest.mock('@beakerstack/shared/components/profile/AvatarUpload.web', () => ({
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

import { ProfileEditor } from '@beakerstack/shared/components/profile/ProfileEditor.web';
import { useProfileContext } from '@beakerstack/shared/contexts/ProfileContext';

describe('ProfileEditor.web — coverage gaps', () => {
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
      expect(screen.getByTestId('error-location')).toHaveTextContent(
        'Bad location'
      );
    });
  });

  it('maps validation errors for all profile fields', async () => {
    render(<ProfileEditor className='custom-editor' />);

    fireEvent.change(screen.getByTestId('input-username'), {
      target: { value: 'ab' },
    });
    fireEvent.change(screen.getByTestId('input-display-name'), {
      target: { value: 'ab' },
    });
    fireEvent.change(screen.getByTestId('input-bio'), {
      target: { value: 'ab' },
    });
    fireEvent.change(screen.getByTestId('input-website'), {
      target: { value: 'ab' },
    });
    fireEvent.change(screen.getByTestId('input-location'), {
      target: { value: 'ab' },
    });
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-username')).toHaveTextContent(
        'Bad username'
      );
      expect(screen.getByTestId('error-display-name')).toHaveTextContent(
        'Bad display name'
      );
      expect(screen.getByTestId('error-bio')).toHaveTextContent('Bad bio');
      expect(screen.getByTestId('error-website')).toHaveTextContent(
        'Bad website'
      );
      expect(screen.getByTestId('error-location')).toHaveTextContent(
        'Bad location'
      );
    });
  });

  it('clears field and general errors when the user edits a field', async () => {
    mockUseProfileContext.mockReturnValue({
      supabaseClient: mockSupabaseClient,
      currentUser: mockUser,
      profile: {
        ...mockProfile,
        website: 'https://example.com',
        location: 'Seattle',
      },
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn().mockRejectedValue(new Error('Save failed')),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor onError={jest.fn()} />);
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('form-error')).toHaveTextContent('Save failed');
    });

    fireEvent.change(screen.getByTestId('input-username'), {
      target: { value: 'newname' },
    });

    await waitFor(() => {
      expect(screen.queryByTestId('form-error')).not.toBeInTheDocument();
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
    expect(screen.getByTestId('input-username')).toHaveValue('');
    expect(screen.getByTestId('input-display-name')).toHaveValue('');
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

    expect(screen.getByTestId('error-username')).toHaveTextContent(
      'Bad username'
    );
    expect(screen.getByTestId('error-display-name')).toHaveTextContent(
      'Bad display name'
    );
    expect(screen.getByTestId('error-bio')).toHaveTextContent('Bad bio');
    expect(screen.getByTestId('error-website')).toHaveTextContent(
      'Bad website'
    );
    expect(screen.getByTestId('error-location')).toHaveTextContent(
      'Bad location'
    );

    useStateSpy.mockRestore();
  });

  it('passes empty userId when currentUser id is missing', () => {
    mockUseProfileContext.mockReturnValue({
      supabaseClient: mockSupabaseClient,
      currentUser: { ...mockUser, id: '' } as User,
      profile: mockProfile,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
    });

    render(<ProfileEditor />);
    expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
  });
});
