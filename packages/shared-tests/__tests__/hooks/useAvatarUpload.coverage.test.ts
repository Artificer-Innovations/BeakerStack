import { renderHook, act, waitFor } from '@testing-library/react';
import { useAvatarUpload } from '@beakerstack/shared/hooks/useAvatarUpload';
import type { SupabaseClient } from '@supabase/supabase-js';
import vm from 'node:vm';

const createMockSupabaseClient = () => {
  const mockBucket = {
    upload: jest.fn().mockResolvedValue({
      data: { path: 'user-id-1/avatar.jpg' },
      error: null,
    }),
    getPublicUrl: jest.fn().mockReturnValue({
      data: {
        publicUrl:
          'https://example.com/storage/v1/object/public/avatars/user-id-1/avatar.jpg',
      },
    }),
    remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    list: jest.fn().mockResolvedValue({ data: [], error: null }),
  };

  return {
    mockClient: {
      storage: { from: jest.fn(() => mockBucket) },
    } as unknown as SupabaseClient,
    mockBucket,
  };
};

describe('useAvatarUpload — coverage gaps', () => {
  it('accepts ArrayBuffer-like objects from another realm', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() =>
      useAvatarUpload(mockClient, 'user-id-1')
    );

    const foreignContext = vm.runInNewContext('this');
    const foreignBuffer = new foreignContext.ArrayBuffer(8);
    Object.assign(foreignBuffer, { type: 'image/png', size: 8 });

    await act(async () => {
      await result.current.uploadAvatar(foreignBuffer);
    });

    await waitFor(() => {
      expect(result.current.uploadedUrl).not.toBeNull();
    });

    expect(mockBucket.upload).toHaveBeenCalledWith(
      'user-id-1/avatar.png',
      foreignBuffer,
      expect.objectContaining({ contentType: 'image/png' })
    );
  });

  it('accepts ArrayBuffer-like objects with matching constructor metadata', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() =>
      useAvatarUpload(mockClient, 'user-id-1')
    );

    const arrayBufferLike = Object.create(ArrayBuffer.prototype);
    Object.defineProperty(arrayBufferLike, 'constructor', {
      value: ArrayBuffer,
    });
    Object.defineProperty(arrayBufferLike, 'byteLength', {
      value: 8,
    });
    Object.assign(arrayBufferLike, {
      type: 'image/webp',
      size: 8,
    });

    await act(async () => {
      await result.current.uploadAvatar(arrayBufferLike as ArrayBuffer);
    });

    await waitFor(() => {
      expect(result.current.uploadedUrl).not.toBeNull();
    });

    expect(mockBucket.upload).toHaveBeenCalledWith(
      'user-id-1/avatar.webp',
      arrayBufferLike,
      expect.objectContaining({ contentType: 'image/webp' })
    );
  });

  it('covers arrayBuffer-like metadata guard without byteLength', async () => {
    const { mockClient } = createMockSupabaseClient();
    const { result } = renderHook(() =>
      useAvatarUpload(mockClient, 'user-id-1')
    );

    const invalidBufferLike = Object.create(ArrayBuffer.prototype);
    Object.defineProperty(invalidBufferLike, 'constructor', {
      value: ArrayBuffer,
    });

    await act(async () => {
      try {
        await result.current.uploadAvatar(invalidBufferLike as ArrayBuffer);
      } catch {
        // expected validation failure
      }
    });
  });

  it('defaults unknown File MIME types to jpg extension for File inputs', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    const { result } = renderHook(() =>
      useAvatarUpload(mockClient, 'user-id-1')
    );

    const oddBlob = new Blob(['content'], { type: 'image/gif' });

    await act(async () => {
      await result.current.uploadAvatar(oddBlob);
    });

    expect(mockBucket.upload).toHaveBeenCalledWith(
      'user-id-1/avatar.jpg',
      oddBlob,
      expect.objectContaining({ contentType: 'image/gif' })
    );
  });

  it('wraps non-Error upload failures', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    mockBucket.upload.mockImplementationOnce(() =>
      Promise.reject('upload exploded')
    );
    const { result } = renderHook(() =>
      useAvatarUpload(mockClient, 'user-id-1')
    );

    const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

    let thrown: Error | undefined;
    await act(async () => {
      try {
        await result.current.uploadAvatar(file);
      } catch (err) {
        thrown = err as Error;
      }
    });

    expect(thrown?.message).toBe('upload exploded');
    expect(result.current.error?.message).toBe('upload exploded');
  });

  it('wraps non-Error remove failures', async () => {
    const { mockClient, mockBucket } = createMockSupabaseClient();
    mockBucket.list.mockResolvedValueOnce({
      data: [{ name: 'avatar.jpg' }],
      error: null,
    });
    mockBucket.remove.mockImplementationOnce(() =>
      Promise.reject('delete exploded')
    );
    const { result } = renderHook(() =>
      useAvatarUpload(mockClient, 'user-id-1')
    );

    let thrown: Error | undefined;
    await act(async () => {
      try {
        await result.current.removeAvatar();
      } catch (err) {
        thrown = err as Error;
      }
    });

    expect(thrown?.message).toBe('delete exploded');
    expect(result.current.error?.message).toBe('delete exploded');
  });
});
