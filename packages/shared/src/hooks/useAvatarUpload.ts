import { useState, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AvatarUploadReturn {
  uploading: boolean;
  progress: number;
  error: Error | null;
  uploadedUrl: string | null;
  uploadAvatar: (file: File | Blob) => Promise<string>;
  removeAvatar: () => Promise<void>;
  reset: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BUCKET_NAME = 'avatars';

/**
 * Hook for uploading avatars to Supabase Storage
 * @param supabaseClient - Supabase client instance
 * @param userId - User ID for folder structure
 */
export function useAvatarUpload(
  supabaseClient: SupabaseClient,
  userId: string
): AvatarUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  /**
   * Validates file before upload
   */
  const validateFile = useCallback((file: File | Blob): void => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check MIME type
    if (file instanceof File) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error('File must be a JPEG, PNG, or WebP image');
      }
    } else {
      // For Blob, we can't check MIME type easily, so we'll let the server validate
      // But we can still check size
    }
  }, []);

  /**
   * Gets file extension from MIME type or filename
   */
  const getFileExtension = useCallback((file: File | Blob): string => {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    
    if (file instanceof File) {
      return mimeToExt[file.type] || 'jpg';
    }
    
    // For Blob, check if type is set (we set it when creating from base64)
    if (file.type && mimeToExt[file.type]) {
      return mimeToExt[file.type];
    }
    
    // Default to jpg for Blob without type
    return 'jpg';
  }, []);

  /**
   * Uploads avatar to Supabase Storage
   */
  const uploadAvatar = useCallback(
    async (file: File | Blob | ArrayBuffer): Promise<string> => {
      setUploading(true);
      setProgress(0);
      setError(null);
      setUploadedUrl(null);

      try {
        // Handle different input types
        let uploadFile: File | Blob | ArrayBuffer;
        let contentType: string;
        let extension: string;
        
        if (file instanceof ArrayBuffer || (file as any).constructor === ArrayBuffer) {
          // ArrayBuffer from React Native (may have type property attached)
          uploadFile = file as ArrayBuffer;
          // Check if type was attached as a property
          contentType = (file as any).type || 'image/jpeg';
          // Determine extension from content type
          const mimeToExt: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
          };
          extension = mimeToExt[contentType] || 'jpg';
        } else {
          // File or Blob (web)
          validateFile(file);
          uploadFile = file;
          contentType = file instanceof File 
            ? file.type 
            : (file.type || 'image/jpeg');
          extension = getFileExtension(file);
        }

        // Generate file path: {userId}/avatar.{ext}
        const filePath = `${userId}/avatar.${extension}`;

        // Delete old avatar if it exists (upsert will replace, but explicit delete is cleaner)
        try {
          await supabaseClient.storage.from(BUCKET_NAME).remove([filePath]);
        } catch {
          // Ignore errors when deleting (file might not exist)
        }

        // Upload file with upsert option
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from(BUCKET_NAME)
          .upload(filePath, uploadFile, {
            upsert: true,
            contentType: contentType,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        if (!uploadData) {
          throw new Error('Upload succeeded but returned no data');
        }

        // Get public URL with cache-busting query parameter
        const {
          data: { publicUrl },
        } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        
        // Add timestamp and random value to URL to bust browser cache
        // This ensures each upload gets a unique URL, forcing the browser to fetch the new image
        const cacheBustedUrl = `${publicUrl}?t=${Date.now()}&v=${Math.random().toString(36).substring(7)}`;

        setProgress(100);
        setUploadedUrl(cacheBustedUrl);
        return cacheBustedUrl;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [supabaseClient, userId, validateFile, getFileExtension]
  );

  /**
   * Removes avatar from storage
   */
  const removeAvatar = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      // Try to find and delete any avatar file for this user
      const { data: files, error: listError } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .list(userId, {
          limit: 10,
          search: 'avatar',
        });

      if (listError) {
        // If listing fails, try to delete common avatar paths
        const commonPaths = [
          `${userId}/avatar.jpg`,
          `${userId}/avatar.png`,
          `${userId}/avatar.webp`,
        ];
        await supabaseClient.storage.from(BUCKET_NAME).remove(commonPaths);
        return;
      }

      if (files && files.length > 0) {
        const filePaths = files.map((file) => `${userId}/${file.name}`);
        const { error: deleteError } = await supabaseClient.storage
          .from(BUCKET_NAME)
          .remove(filePaths);

        if (deleteError) {
          throw new Error(`Failed to delete avatar: ${deleteError.message}`);
        }
      }

      setUploadedUrl(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [supabaseClient, userId]);

  /**
   * Resets hook state
   */
  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setUploadedUrl(null);
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadedUrl,
    uploadAvatar,
    removeAvatar,
    reset,
  };
}

