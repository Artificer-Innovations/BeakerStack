import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  useAvatarUpload,
  type ArrayBufferWithMetadata,
} from '../../hooks/useAvatarUpload';
import { Logger } from '@beakerstack/logger';

// Helper function to fix URLs for Android emulator
const fixUrlForAndroid = (url: string | null): string | null => {
  if (!url) return null;
  if (Platform.OS === 'android' && __DEV__) {
    // Replace localhost with Android emulator's host machine IP
    // Preserve query params (including cache-busting) for proper image refresh
    let fixedUrl = url.replace('http://127.0.0.1:', 'http://10.0.2.2:');
    fixedUrl = fixedUrl.replace('http://localhost:', 'http://10.0.2.2:');
    return fixedUrl; // Keep query params for cache-busting
  }
  return url;
};

export interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
  userId: string;
  supabaseClient: SupabaseClient;
  style?: View['props']['style'];
}

/**
 * AvatarUpload component for React Native
 * Provides file upload functionality for user avatars
 *
 * Note: Requires expo-image-picker to be installed:
 * npx expo install expo-image-picker
 */
export function AvatarUpload({
  currentAvatarUrl,
  onUploadComplete,
  onRemove,
  userId,
  supabaseClient,
  style,
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(0); // Force image reload on upload
  const cacheBusterRef = useRef<string>(''); // Store cache-buster to avoid regenerating on every render
  const {
    uploading,
    progress,
    error,
    uploadAvatar,
    removeAvatar,
    uploadedUrl,
  } = useAvatarUpload(supabaseClient, userId);

  // Update cache-buster only when imageKey changes (on upload)
  useEffect(() => {
    if (imageKey > 0) {
      cacheBusterRef.current = `cb=${Date.now()}&k=${imageKey}&r=${Math.random().toString(36).substring(7)}`;
    }
  }, [imageKey]);

  // Increment imageKey when currentAvatarUrl changes to force reload of profile image
  // This ensures we show the updated image even if the base URL is the same
  const prevAvatarUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      currentAvatarUrl &&
      currentAvatarUrl !== prevAvatarUrlRef.current &&
      prevAvatarUrlRef.current !== null
    ) {
      // URL changed (not initial mount), increment key to force reload
      setImageKey(prev => prev + 1);
    }
    prevAvatarUrlRef.current = currentAvatarUrl;
  }, [currentAvatarUrl]);

  const handlePickImage = async () => {
    try {
      Logger.debug('[AvatarUpload] Button pressed, platform:', Platform.OS);

      // Handle permissions based on platform
      if (Platform.OS === 'ios') {
        // iOS: Always request permissions first
        Logger.debug(
          '[AvatarUpload] iOS: Requesting media library permissions...'
        );
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        Logger.debug('[AvatarUpload] iOS Permission status:', status);

        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Permission to access photos is required to upload an avatar. Please grant permission in Settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
      // Android: On Android 13+, the system picker handles permissions automatically
      // We can skip permission requests and let the picker handle it
      // For older Android versions, we'll try to request but won't block if it fails
      else if (Platform.OS === 'android') {
        Logger.debug(
          '[AvatarUpload] Android: Skipping explicit permission request - system picker will handle it'
        );
        // On Android 13+, the system image picker handles permissions via scoped access
        // We can launch the picker directly and the system will handle permissions
      }

      Logger.debug('[AvatarUpload] Launching image picker...');

      // Launch image picker with timeout to prevent hanging.
      // On Android 13+, the system picker handles permissions automatically.
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      };
      if (Platform.OS === 'ios') {
        // Use the public expo-image-picker enum (its string value is "pageSheet").
        pickerOptions.presentationStyle =
          ImagePicker.UIImagePickerPresentationStyle.PAGE_SHEET;
      }
      const pickerPromise = ImagePicker.launchImageLibraryAsync(pickerOptions);

      // Add timeout to prevent hanging (30 seconds should be enough)
      const timeoutPromise = new Promise<ImagePicker.ImagePickerResult>(
        (_, reject) =>
          setTimeout(
            () => reject(new Error('Image picker timeout - please try again')),
            30000
          )
      );

      const result = await Promise.race<ImagePicker.ImagePickerResult>([
        pickerPromise,
        timeoutPromise,
      ]);

      Logger.debug(
        '[AvatarUpload] Image picker result:',
        result.canceled ? 'canceled' : 'selected',
        result
      );

      if (
        result.canceled ||
        !result.assets ||
        !result.assets.length ||
        !result.assets[0]
      ) {
        Logger.debug('[AvatarUpload] No image selected or picker was canceled');
        if (result.canceled) {
          Logger.debug('[AvatarUpload] User canceled the picker');
        } else if (!result.assets || !result.assets.length) {
          Logger.debug('[AvatarUpload] No assets returned from picker');
          Alert.alert(
            'No Image Selected',
            "Please select an image from your gallery. If you don't have any photos, you can add some to your device first.",
            [{ text: 'OK' }]
          );
        }
        return;
      }

      const asset = result.assets[0];
      Logger.debug('[AvatarUpload] Selected asset:', {
        uri: asset.uri?.substring(0, 50) + '...',
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
      });

      // Create preview
      setPreviewUrl(asset.uri);

      // Convert URI to Blob for upload
      // On React Native/iOS, we need to read the file using FileSystem
      let blob: Blob;
      try {
        // Read file as base64 using expo-file-system (works reliably on iOS)
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (!base64 || base64.length === 0) {
          throw new Error('Image file is empty or could not be read');
        }

        // Determine MIME type from asset or default to jpeg
        const mimeType = asset.mimeType || 'image/jpeg';

        // React Native doesn't have a native atob, so we use the `buffer`
        // polyfill to decode base64 into a byte array. Strip any stray
        // characters that the encoder may have inserted (whitespace, etc.).
        const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
        const decoded = Buffer.from(cleanBase64, 'base64');
        if (decoded.length === 0) {
          throw new Error('Image file is empty or could not be converted');
        }
        const uint8Array = new Uint8Array(decoded);

        // Convert Uint8Array to ArrayBuffer for Supabase upload
        // ArrayBuffer is more reliable than Blob in React Native
        const arrayBuffer = uint8Array.buffer.slice(
          uint8Array.byteOffset,
          uint8Array.byteOffset + uint8Array.byteLength
        );

        // Create blob for preview/validation, but use ArrayBuffer for upload
        blob = new Blob([uint8Array], { type: mimeType });

        // Verify blob has content
        if (blob.size === 0) {
          throw new Error('Image file is empty or could not be converted');
        }

        Logger.debug(
          '[AvatarUpload] Blob size:',
          blob.size,
          'bytes, type:',
          mimeType
        );

        // Upload using ArrayBuffer directly (more reliable in React Native)
        // We need to pass mimeType info - create a File-like object or pass metadata
        // For now, create a minimal File-like object with the ArrayBuffer
        const fileWithType: ArrayBufferWithMetadata = Object.assign(
          arrayBuffer,
          {
            type: mimeType,
            size: uint8Array.length,
          }
        );
        const url = await uploadAvatar(fileWithType);
        Logger.debug(
          '[AvatarUpload] Upload complete, received URL from hook:',
          url
        );
        Logger.debug(
          '[AvatarUpload] URL contains 10.0.2.2:',
          url.includes('10.0.2.2')
        );
        Logger.debug(
          '[AvatarUpload] URL contains 127.0.0.1:',
          url.includes('127.0.0.1')
        );
        Logger.debug(
          '[AvatarUpload] URL contains localhost:',
          url.includes('localhost')
        );

        // Increment imageKey BEFORE calling onUploadComplete to ensure the new key is used
        // This forces the Image component to reload with the new URL
        setImageKey(prev => {
          const newKey = prev + 1;
          Logger.debug('[AvatarUpload] Incrementing imageKey to:', newKey);
          return newKey;
        });

        onUploadComplete(url);
        setPreviewUrl(null); // Clear preview after successful upload
      } catch (fileError) {
        const error =
          fileError instanceof Error ? fileError : new Error(String(fileError));
        Logger.error('[AvatarUpload] Failed to process image:', error);
        Alert.alert('Error', `Failed to process image: ${error.message}`);
        setPreviewUrl(null);
        return;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Alert.alert('Error', `Failed to pick image: ${error.message}`);
      setPreviewUrl(null);
    }
  };

  const handleRemove = async () => {
    Alert.alert(
      'Remove Avatar',
      'Are you sure you want to remove your avatar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAvatar();
              onRemove();
              setPreviewUrl(null);
            } catch (err) {
              // Error is handled by the hook
            }
          },
        },
      ]
    );
  };

  // Fix URLs for Android emulator and handle display priority
  // Priority: preview > uploaded URL > current avatar URL
  // This ensures we show the new image immediately after upload, even before profile updates
  const fixedPreviewUrl = fixUrlForAndroid(previewUrl);
  const fixedUploadedUrl = fixUrlForAndroid(uploadedUrl);
  const fixedCurrentUrl = fixUrlForAndroid(currentAvatarUrl);

  // Simple priority: always prefer uploadedUrl over currentAvatarUrl for immediate display
  let displayUrl = fixedPreviewUrl || fixedUploadedUrl || fixedCurrentUrl;

  // Add aggressive cache-busting to ALL URLs to force React Native Image to reload
  // This is critical because React Native Image caches aggressively by base URL
  // Only add cache-busting if we have a URL and imageKey has been set (upload has happened)
  if (displayUrl && imageKey > 0) {
    const separator = displayUrl.includes('?') ? '&' : '?';
    // Use the ref value which only updates when imageKey changes
    displayUrl = `${displayUrl}${separator}${cacheBusterRef.current}`;
  } else if (displayUrl) {
    // For initial display or when no upload has happened yet, add a simple cache-buster
    const separator = displayUrl.includes('?') ? '&' : '?';
    displayUrl = `${displayUrl}${separator}t=${Date.now()}`;
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Avatar</Text>

      <View style={styles.content}>
        {/* Avatar Preview */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            {displayUrl ? (
              <Image
                key={`${displayUrl}-${imageKey}`} // Force re-render when URL or upload key changes
                source={{
                  uri: displayUrl,
                }}
                style={styles.avatar}
                resizeMode='cover'
                onError={error => {
                  Logger.warn(
                    '[AvatarUpload] Failed to load preview image:',
                    displayUrl,
                    error.nativeEvent?.error || error
                  );
                }}
                onLoad={() => {
                  Logger.debug(
                    '[AvatarUpload] Preview image loaded successfully:',
                    displayUrl
                  );
                }}
              />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>?</Text>
              </View>
            )}
          </View>

          {/* Upload Progress Overlay */}
          {uploading && (
            <View style={styles.progressOverlay}>
              <ActivityIndicator size='small' color='#fff' />
              {progress > 0 && (
                <Text style={styles.progressText}>{progress}%</Text>
              )}
            </View>
          )}
        </View>

        {/* Upload Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              uploading && styles.buttonDisabled,
            ]}
            onPress={() => {
              Logger.debug('[AvatarUpload] Choose File button pressed');
              handlePickImage().catch(err => {
                Logger.error('[AvatarUpload] Error in handlePickImage:', err);
                Alert.alert(
                  'Error',
                  `Failed to pick image: ${
                    err instanceof Error
                      ? err.message
                      : /* v8 ignore next */ String(err)
                  }`
                );
              });
            }}
            disabled={uploading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {uploading ? 'Uploading...' : 'Choose File'}
            </Text>
          </TouchableOpacity>

          {currentAvatarUrl && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.dangerButton,
                uploading && styles.buttonDisabled,
              ]}
              onPress={handleRemove}
              disabled={uploading}
            >
              <Text style={[styles.buttonText, styles.dangerButtonText]}>
                Remove
              </Text>
            </TouchableOpacity>
          )}

          {/* Error Message */}
          {error && <Text style={styles.errorText}>{error.message}</Text>}

          {/* Help Text */}
          <Text style={styles.helpText}>JPEG, PNG, or WebP. Max 2MB.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  controls: {
    flex: 1,
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dangerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dangerButtonText: {
    color: '#B91C1C',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
