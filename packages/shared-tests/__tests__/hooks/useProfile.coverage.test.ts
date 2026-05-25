import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useProfile } from '@beakerstack/shared/hooks/useProfile';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '@beakerstack/shared/types/profile';

jest.mock('@beakerstack/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
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

const createMockUser = (): User => ({
  id: 'user-id-1',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
});

function createClientWithRealtime(options?: {
  fetchThrows?: unknown;
  createThrows?: unknown;
  updateThrows?: unknown;
}) {
  let realtimeCallback: ((payload: unknown) => void) | null = null;
  const mockChannel = {
    on: jest.fn((_event, _config, callback) => {
      realtimeCallback = callback;
      return mockChannel;
    }),
    subscribe: jest.fn(callback => {
      callback('SUBSCRIBED');
      return mockChannel;
    }),
    unsubscribe: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
  };

  const mockClient = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockImplementation(() => {
            if (options?.fetchThrows !== undefined) {
              return Promise.reject(options.fetchThrows);
            }
            return Promise.resolve({ data: mockProfile, error: null });
          }),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockImplementation(() => {
            if (options?.createThrows !== undefined) {
              return Promise.reject(options.createThrows);
            }
            return Promise.resolve({ data: mockProfile, error: null });
          }),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockImplementation(() => {
              if (options?.updateThrows !== undefined) {
                return Promise.reject(options.updateThrows);
              }
              return Promise.resolve({ data: mockProfile, error: null });
            }),
          })),
        })),
      })),
    })),
    channel: jest.fn(() => mockChannel),
  } as unknown as SupabaseClient;

  return {
    mockClient,
    mockChannel,
    getRealtimeCallback: () => realtimeCallback,
  };
}

describe('useProfile — coverage gaps', () => {
  it('ignores realtime payload when channel entry was removed', async () => {
    const { mockClient, getRealtimeCallback } = createClientWithRealtime();
    const mockUser = createMockUser();
    const { result, unmount } = renderHook(() =>
      useProfile(mockClient, mockUser)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();

    act(() => {
      getRealtimeCallback()?.({
        eventType: 'UPDATE',
        new: { ...mockProfile, display_name: 'Ghost update' },
      });
    });

    expect(result.current.profile?.display_name).toBe('Test User');
  });

  it('wraps non-Error fetch failures', async () => {
    const { mockClient } = createClientWithRealtime({ fetchThrows: 'db down' });
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.fetchProfile(mockUser.id);
      })
    ).rejects.toThrow('db down');
  });

  it('wraps non-Error create failures', async () => {
    const { mockClient } = createClientWithRealtime({
      createThrows: 'create failed',
    });
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.createProfile(mockUser.id, { username: 'new' });
      })
    ).rejects.toThrow('create failed');
  });

  it('wraps non-Error update failures', async () => {
    const { mockClient } = createClientWithRealtime({
      updateThrows: 'update failed',
    });
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.updateProfile(mockUser.id, {
          display_name: 'Updated',
        });
      })
    ).rejects.toThrow('update failed');
  });

  it('warns when channel lacks unsubscribe method', async () => {
    const { Logger } = require('@beakerstack/logger');
    const mockUser = createMockUser();
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(callback => {
        callback('SUBSCRIBED');
        return mockChannel;
      }),
    };
    const mockClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest
              .fn()
              .mockResolvedValue({ data: mockProfile, error: null }),
          })),
        })),
      })),
      channel: jest.fn(() => mockChannel),
    } as unknown as SupabaseClient;

    const { unmount: unmountA } = renderHook(() =>
      useProfile(mockClient, mockUser)
    );
    const { unmount: unmountB } = renderHook(() =>
      useProfile(mockClient, mockUser)
    );

    await waitFor(() => expect(mockClient.channel).toHaveBeenCalled());
    unmountA();
    unmountB();

    expect(Logger.warn).toHaveBeenCalledWith(
      '[ProfileRealtimeRegistry] Channel does not have unsubscribe method'
    );
  });

  it('ignores duplicate realtime unsubscribe calls', async () => {
    const cleanups: Array<() => void> = [];
    const useEffectImpl = React.useEffect;
    const useEffectSpy = jest
      .spyOn(React, 'useEffect')
      .mockImplementation((effect, deps) =>
        useEffectImpl(() => {
          const cleanup = effect();
          if (typeof cleanup === 'function' && deps?.length === 1) {
            cleanups.push(cleanup);
          }
          return cleanup;
        }, deps)
      );

    try {
      const { mockClient } = createClientWithRealtime();
      const mockUser = createMockUser();
      renderHook(() => useProfile(mockClient, mockUser));

      await waitFor(() => expect(mockClient.channel).toHaveBeenCalled());

      const realtimeCleanup = cleanups[cleanups.length - 1];
      act(() => {
        realtimeCleanup();
        realtimeCleanup();
      });
    } finally {
      useEffectSpy.mockRestore();
    }
  });

  it('wraps non-Error failures when createProfile insert rejects a string', async () => {
    const { mockClient } = createClientWithRealtime({
      createThrows: 'create failed',
    });
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrown: Error | undefined;
    await act(async () => {
      try {
        await result.current.createProfile(mockUser.id, { username: 'new' });
      } catch (err) {
        thrown = err as Error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown?.message).toBe('create failed');
    expect(result.current.error?.message).toBe('create failed');
    expect(result.current.loading).toBe(false);
  });

  it('clears loading when createProfile rejects an Error instance', async () => {
    const { mockClient } = createClientWithRealtime({
      createThrows: new Error('create failed'),
    });
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(
        result.current.createProfile(mockUser.id, { username: 'new' })
      ).rejects.toThrow('create failed');
    });

    expect(result.current.loading).toBe(false);
  });

  it('wraps non-Error failures when updateProfile rejects a string', async () => {
    const { mockClient } = createClientWithRealtime({
      updateThrows: 'update failed',
    });
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrown: Error | undefined;
    await act(async () => {
      try {
        await result.current.updateProfile(mockUser.id, {
          display_name: 'Updated',
        });
      } catch (err) {
        thrown = err as Error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown?.message).toBe('update failed');
    expect(result.current.error?.message).toBe('update failed');
    expect(result.current.loading).toBe(false);
  });

  it('clears loading when updateProfile rejects an Error instance', async () => {
    const { mockClient } = createClientWithRealtime({
      updateThrows: new Error('update failed'),
    });
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(
        result.current.updateProfile(mockUser.id, {
          display_name: 'Updated',
        })
      ).rejects.toThrow('update failed');
    });

    expect(result.current.loading).toBe(false);
  });

  it('completes createProfile successfully and clears loading state', async () => {
    const { mockClient } = createClientWithRealtime();
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createProfile(mockUser.id, { username: 'newuser' });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.profile?.username).toBe('testuser');
  });

  it('completes updateProfile successfully and clears loading state', async () => {
    const { mockClient } = createClientWithRealtime();
    const mockUser = createMockUser();
    const { result } = renderHook(() => useProfile(mockClient, mockUser));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateProfile(mockUser.id, {
        display_name: 'Updated Name',
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.profile?.display_name).toBe('Test User');
  });
});
