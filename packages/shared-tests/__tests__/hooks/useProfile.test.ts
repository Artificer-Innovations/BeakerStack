import { renderHook, act, waitFor } from '@testing-library/react';
import { useProfile } from '@shared/src/hooks/useProfile';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '@shared/src/types/profile';

// Mock Supabase client
const createMockSupabaseClient = () => {
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

  const mockClient = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          })),
        })),
      })),
    })),
  } as unknown as SupabaseClient;

  return { mockClient, mockProfile };
};

const createMockUser = (): User => ({
  id: 'user-id-1',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
});

describe('useProfile', () => {
  it('should initialize with loading state', async () => {
    const { mockClient } = createMockSupabaseClient();
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    // Initially loading should be true while fetching
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should fetch profile when user is provided', async () => {
    const { mockClient, mockProfile } = createMockSupabaseClient();
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toEqual(mockProfile);
    });

    expect(mockClient.from).toHaveBeenCalledWith('user_profiles');
  });

  it('should set profile to null when user is null', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useProfile(mockClient, null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toBeNull();
    });
  });

  it('should handle profile not found gracefully', async () => {
    const { mockClient } = createMockSupabaseClient();
    const mockUser = createMockUser();

    // Mock "profile not found" error (PGRST116)
    const fromMock = {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' },
          }),
        })),
      })),
    };
    mockClient.from = jest.fn(() => fromMock as any);

    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle fetch errors', async () => {
    const { mockClient } = createMockSupabaseClient();
    const mockUser = createMockUser();

    let callCount = 0;
    // Mock initial successful fetch to avoid useEffect throwing, then error on second call
    const fromMock = {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'No rows returned' },
              });
            }
            return Promise.resolve({
              data: null,
              error: { code: 'PGRST000', message: 'Database error' },
            });
          }),
        })),
      })),
    };
    mockClient.from = jest.fn(() => fromMock as any);

    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Now test fetchProfile directly with an error
    let thrownError: Error | null = null;
    try {
      await act(async () => {
        await result.current.fetchProfile(mockUser.id);
      });
    } catch (error) {
      thrownError = error as Error;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toBe('Database error');
  });

  it('should create profile', async () => {
    const { mockClient, mockProfile } = createMockSupabaseClient();
    const mockUser = createMockUser();

    // Mock initial fetch to return null (no profile exists)
    const fromMock = {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' },
          }),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
    };
    mockClient.from = jest.fn(() => fromMock as any);

    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const profileData = {
      username: 'newuser',
      display_name: 'New User',
    };

    await act(async () => {
      await result.current.createProfile(mockUser.id, profileData);
    });

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.loading).toBe(false);
    });

    expect(fromMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        ...profileData,
      })
    );
  });

  it('should update profile', async () => {
    const { mockClient, mockProfile } = createMockSupabaseClient();
    const mockUser = createMockUser();

    const updatedProfile = {
      ...mockProfile,
      display_name: 'Updated Name',
      bio: 'Updated bio',
    };

    // Create a fresh mock that includes update
    const fromMock = {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: updatedProfile,
              error: null,
            }),
          })),
        })),
      })),
    };
    mockClient.from = jest.fn(() => fromMock as any);

    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateData = {
      display_name: 'Updated Name',
      bio: 'Updated bio',
    };

    await act(async () => {
      await result.current.updateProfile(mockUser.id, updateData);
    });

    await waitFor(() => {
      expect(result.current.profile).toEqual(updatedProfile);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle create profile errors', async () => {
    const { mockClient } = createMockSupabaseClient();
    const mockUser = createMockUser();

    // Mock initial fetch to return null
    const fromMock = {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' },
          }),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'Duplicate key violation' },
          }),
        })),
      })),
    };
    mockClient.from = jest.fn(() => fromMock as any);

    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let thrownError: Error | null = null;
    try {
      await act(async () => {
        await result.current.createProfile(mockUser.id, {
          username: 'duplicate',
        });
      });
    } catch (error) {
      thrownError = error as Error;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toBe('Duplicate key violation');
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle update profile errors', async () => {
    const { mockClient, mockProfile } = createMockSupabaseClient();
    const mockUser = createMockUser();

    // Create a mock that includes update with error
    const fromMock = {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST000', message: 'Update failed' },
            }),
          })),
        })),
      })),
    };
    mockClient.from = jest.fn(() => fromMock as any);

    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let thrownError: Error | null = null;
    try {
      await act(async () => {
        await result.current.updateProfile(mockUser.id, {
          display_name: 'Updated',
        });
      });
    } catch (error) {
      thrownError = error as Error;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toBe('Update failed');
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should refresh profile', async () => {
    const { mockClient, mockProfile } = createMockSupabaseClient();
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toEqual(mockProfile);
    });

    await act(async () => {
      await result.current.refreshProfile();
    });

    // Should have called fetchProfile again
    expect(mockClient.from).toHaveBeenCalledTimes(2); // Once on initial load, once on refresh
  });

  it('should not refresh profile when user is null', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useProfile(mockClient, null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshProfile();
    });

    // Should not have called fetchProfile when user is null
    expect(mockClient.from).not.toHaveBeenCalled();
  });
});

