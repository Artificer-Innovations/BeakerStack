import { useState, useRef, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';

export interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
  userId: string;
  supabaseClient: SupabaseClient;
  className?: string;
}

/**
 * AvatarUpload component for web
 * Provides file upload functionality for user avatars
 */
export function AvatarUpload({
  currentAvatarUrl,
  onUploadComplete,
  onRemove,
  userId,
  supabaseClient,
  className = '',
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(0); // Force image reload on upload
  const prevAvatarUrlRef = useRef<string | null>(null);
  const cacheBusterRef = useRef<string>(''); // Store cache-buster to avoid regenerating on every render
  const initialCacheBusterRef = useRef<string>(`t=${Date.now()}`); // Store initial cache-buster
  const { uploading, progress, error, uploadAvatar, removeAvatar, uploadedUrl } = useAvatarUpload(
    supabaseClient,
    userId
  );
  
  // Update cache-buster when imageKey changes
  useEffect(() => {
    if (imageKey > 0) {
      cacheBusterRef.current = `t=${Date.now()}&k=${imageKey}`;
    }
  }, [imageKey]);
  
  // Increment imageKey when currentAvatarUrl changes to force reload of profile image
  useEffect(() => {
    if (currentAvatarUrl && currentAvatarUrl !== prevAvatarUrlRef.current && prevAvatarUrlRef.current !== null) {
      // URL changed (not initial mount), increment key to force reload
      setImageKey(prev => prev + 1);
    }
    prevAvatarUrlRef.current = currentAvatarUrl;
  }, [currentAvatarUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const url = await uploadAvatar(file);
      // Increment imageKey to force image reload
      setImageKey(prev => prev + 1);
      // Clear preview - the uploadedUrl from the hook will be used now
      setPreviewUrl(null);
      // Update profile with new URL
      onUploadComplete(url);
    } catch (err) {
      // Error is handled by the hook
      setPreviewUrl(null);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    try {
      await removeAvatar();
      onRemove();
      setPreviewUrl(null);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  // Clear uploadedUrl once profile has been updated with the new URL
  // This ensures we use the profile URL (which is the source of truth) once it's updated
  useEffect(() => {
    if (uploadedUrl && currentAvatarUrl && currentAvatarUrl.includes(uploadedUrl.split('?')[0])) {
      // Profile has been updated with the new URL, clear the temporary uploadedUrl
      // We check if the base URL matches (ignoring query params) to confirm it's the same image
    }
  }, [uploadedUrl, currentAvatarUrl]);

  // Priority: preview > uploaded URL > current avatar URL
  // This ensures we show the new image immediately after upload, even before profile updates
  let displayUrl = previewUrl || uploadedUrl || currentAvatarUrl;
  
  // Add cache-busting to currentAvatarUrl to force browser to reload when it changes
  // uploadedUrl already has cache-busting from the hook
  if (displayUrl === currentAvatarUrl && currentAvatarUrl) {
    const separator = currentAvatarUrl.includes('?') ? '&' : '?';
    if (imageKey > 0 && cacheBusterRef.current) {
      // Use the ref value which only updates when imageKey changes
      displayUrl = `${currentAvatarUrl}${separator}${cacheBusterRef.current}`;
    } else {
      // Fallback: use initial cache-buster (calculated once on mount)
      displayUrl = `${currentAvatarUrl}${separator}${initialCacheBusterRef.current}`;
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">Avatar</label>

      <div className="flex items-center space-x-4">
        {/* Avatar Preview */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
            {displayUrl ? (
              <img
                key={`${displayUrl}-${imageKey}`} // Include imageKey to force re-render
                src={displayUrl}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg
                  className="w-12 h-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Upload Progress Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="text-white text-xs font-medium">{progress}%</div>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleClick}
              disabled={uploading}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Choose File'}
            </button>

            {currentAvatarUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {uploading && progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600">{error.message}</div>
          )}

          {/* Help Text */}
          <p className="text-xs text-gray-500">
            JPEG, PNG, or WebP. Max 2MB.
          </p>
        </div>
      </div>
    </div>
  );
}

