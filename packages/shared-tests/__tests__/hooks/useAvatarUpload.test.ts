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

    let returnedUrl: string;
    await act(async () => {
      returnedUrl = await result.current.uploadAvatar(validFile);
    });

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
      // uploadedUrl state should include cache-busting parameters for display
      expect(result.current.uploadedUrl).toMatch(
        /^https:\/\/example\.com\/storage\/v1\/object\/public\/avatars\/user-id-1\/avatar\.jpg\?t=\d+&v=[a-z0-9]+$/
      );
      expect(result.current.error).toBeNull();
    });
    
    // The returned URL from uploadAvatar should be clean (for database storage)
    expect(returnedUrl).toBe('https://example.com/storage/v1/object/public/avatars/user-id-1/avatar.jpg');
    expect(returnedUrl).not.toMatch(/\?/); // No query params

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

    // Returned URLs should be clean (no cache-busting) - for database storage
    expect(firstUrl).toBe('https://example.com/storage/v1/object/public/avatars/user-id-1/avatar.jpg');
    expect(secondUrl).toBe('https://example.com/storage/v1/object/public/avatars/user-id-1/avatar.jpg');
    expect(firstUrl).toBe(secondUrl); // Same clean URL
    
    // But uploadedUrl state should have cache-busting for display
    expect(result.current.uploadedUrl).toMatch(
      /^https:\/\/example\.com\/storage\/v1\/object\/public\/avatars\/user-id-1\/avatar\.jpg\?t=\d+&v=[a-z0-9]+$/
    );
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

  it('should normalize Android emulator URLs (10.0.2.2 -> 127.0.0.1) before returning', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    // Mock getPublicUrl to return Android emulator URL
    mockBucket.getPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: 'http://10.0.2.2:54321/storage/v1/object/public/avatars/user-id-1/avatar.jpg' },
    });

    const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

    let returnedUrl: string;
    await act(async () => {
      returnedUrl = await result.current.uploadAvatar(validFile);
    });

    await waitFor(() => {
      expect(result.current.uploadedUrl).not.toBeNull();
    });

    // Returned URL should be normalized to 127.0.0.1 (for cross-platform compatibility)
    expect(returnedUrl).toBe('http://127.0.0.1:54321/storage/v1/object/public/avatars/user-id-1/avatar.jpg');
    expect(returnedUrl).not.toContain('10.0.2.2');
    
    // But uploadedUrl state can have 10.0.2.2 (for display on Android)
    // The component will handle the normalization for display
  });

  it('should normalize localhost to 127.0.0.1 before returning', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    // Mock getPublicUrl to return localhost URL
    mockBucket.getPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: 'http://localhost:54321/storage/v1/object/public/avatars/user-id-1/avatar.jpg' },
    });

    const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

    let returnedUrl: string;
    await act(async () => {
      returnedUrl = await result.current.uploadAvatar(validFile);
    });

    await waitFor(() => {
      expect(result.current.uploadedUrl).not.toBeNull();
    });

    // Returned URL should be normalized to 127.0.0.1
    expect(returnedUrl).toBe('http://127.0.0.1:54321/storage/v1/object/public/avatars/user-id-1/avatar.jpg');
    expect(returnedUrl).not.toContain('localhost');
  });

  it('should return clean URL without cache-busting for database storage', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() => useAvatarUpload(mockClient, 'user-id-1'));

    const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

    let returnedUrl: string;
    await act(async () => {
      returnedUrl = await result.current.uploadAvatar(validFile);
    });

    // Returned URL should be clean (no query params) for database storage
    expect(returnedUrl).toBe('https://example.com/storage/v1/object/public/avatars/user-id-1/avatar.jpg');
    expect(returnedUrl).not.toMatch(/\?/);
    
    // But uploadedUrl state should have cache-busting for immediate display
    await waitFor(() => {
      expect(result.current.uploadedUrl).toMatch(/\?t=\d+&v=/);
    });
  });
});

