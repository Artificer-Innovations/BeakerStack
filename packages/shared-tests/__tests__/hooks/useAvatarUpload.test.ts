import { renderHook, act, waitFor } from '@testing-library/react';
import { useAvatarUpload } from '@shared/src/hooks/useAvatarUpload';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase storage client
const createMockSupabaseClient = () => {
  // Create a single mock bucket object that will be returned by from()
  const mockBucket = {
    upload: jest.fn().mockResolvedValue({
      data: { path: 'user-id-1/avatar.jpg' },
      error: null,
    }),
    getPublicUrl: jest.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/storage/v1/object/public/avatars/user-id-1/avatar.jpg' },
    }),
    remove: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    list: jest.fn().mockResolvedValue({
      data: [{ name: 'avatar.jpg' }],
      error: null,
    }),
  };

  const mockStorage = {
    from: jest.fn(() => mockBucket),
  };

  const mockClient = {
    storage: mockStorage,
  } as unknown as SupabaseClient;

  return { mockClient, mockStorage, mockBucket };
};

describe('useAvatarUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.uploadedUrl).toBeNull();
  });

  it('should validate file size', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    // Create a file larger than 2MB
    const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

    await act(async () => {
      try {
        await result.current.uploadAvatar(largeFile);
      } catch (error) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('2MB');
    });
  });

  it('should validate file type', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    // Create a file with invalid type
    const invalidFile = new File(['content'], 'file.pdf', { type: 'application/pdf' });

    await act(async () => {
      try {
        await result.current.uploadAvatar(invalidFile);
      } catch (error) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('JPEG, PNG, or WebP');
    });
  });

  it('should upload valid file successfully', async () => {
    const { mockClient, mockStorage, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.uploadAvatar(validFile);
    });

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
      // URL should include cache-busting parameters
      expect(result.current.uploadedUrl).toMatch(
        /^https:\/\/example\.com\/storage\/v1\/object\/public\/avatars\/user-id-1\/avatar\.jpg\?t=\d+&v=[a-z0-9]+$/
      );
      expect(result.current.error).toBeNull();
    });

    expect(mockStorage.from).toHaveBeenCalledWith('avatars');
    expect(mockBucket.upload).toHaveBeenCalledWith(
      'user-id-1/avatar.jpg',
      validFile,
      expect.objectContaining({
        upsert: true,
        contentType: 'image/jpeg',
      })
    );
  });

  it('should generate unique URLs for each upload to prevent browser caching', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    const firstFile = new File(['content1'], 'avatar1.jpg', { type: 'image/jpeg' });
    const secondFile = new File(['content2'], 'avatar2.jpg', { type: 'image/jpeg' });

    // First upload
    let firstUrl: string;
    await act(async () => {
      firstUrl = await result.current.uploadAvatar(firstFile);
    });

    await waitFor(() => {
      expect(result.current.uploadedUrl).not.toBeNull();
    });

    // Wait a bit to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second upload
    let secondUrl: string;
    await act(async () => {
      secondUrl = await result.current.uploadAvatar(secondFile);
    });

    await waitFor(() => {
      expect(result.current.uploadedUrl).not.toBeNull();
    });

    // URLs should be different (due to cache-busting parameters)
    expect(firstUrl).not.toBe(secondUrl);
    expect(firstUrl).toMatch(/\?t=\d+&v=[a-z0-9]+$/);
    expect(secondUrl).toMatch(/\?t=\d+&v=[a-z0-9]+$/);

    // Base URLs should be the same (same file path)
    const firstBaseUrl = firstUrl.split('?')[0];
    const secondBaseUrl = secondUrl.split('?')[0];
    expect(firstBaseUrl).toBe(secondBaseUrl);
    expect(firstBaseUrl).toBe('https://example.com/storage/v1/object/public/avatars/user-id-1/avatar.jpg');
  });

  it('should handle upload errors', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    // Mock upload error
    mockBucket.upload = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Upload failed' },
    });

    const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

    await act(async () => {
      try {
        await result.current.uploadAvatar(validFile);
      } catch (error) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('Upload failed');
    });
  });

  it('should generate correct file path for different extensions', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    const pngFile = new File(['content'], 'avatar.png', { type: 'image/png' });

    await act(async () => {
      await result.current.uploadAvatar(pngFile);
    });

    await waitFor(() => {
      expect(result.current.uploadedUrl).not.toBeNull();
    });

    expect(mockBucket.upload).toHaveBeenCalledWith(
      'user-id-1/avatar.png',
      pngFile,
      expect.any(Object)
    );
  });

  it('should remove avatar successfully', async () => {
    const { mockClient, mockStorage, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    await act(async () => {
      await result.current.removeAvatar();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(mockStorage.from).toHaveBeenCalledWith('avatars');
    expect(mockBucket.list).toHaveBeenCalledWith('user-id-1', {
      limit: 10,
      search: 'avatar',
    });
  });

  it('should handle remove avatar errors', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    // Mock list to succeed but return files
    mockBucket.list = jest.fn().mockResolvedValue({
      data: [{ name: 'avatar.jpg' }],
      error: null,
    });

    // Mock remove to fail
    mockBucket.remove = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    await act(async () => {
      try {
        await result.current.removeAvatar();
      } catch (error) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('Delete failed');
    });
  });

  it('should reset state', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    // Upload a file to set state
    const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.uploadAvatar(validFile);
    });

    await waitFor(() => {
      expect(result.current.uploadedUrl).not.toBeNull();
    });

    // Now reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.uploadedUrl).toBeNull();
  });

  it('should delete old avatar before uploading new one', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.uploadAvatar(validFile);
    });

    await waitFor(() => {
      expect(result.current.uploadedUrl).not.toBeNull();
    });

    // Should have called remove to delete old avatar
    expect(mockBucket.remove).toHaveBeenCalledWith(['user-id-1/avatar.jpg']);
  });
});

