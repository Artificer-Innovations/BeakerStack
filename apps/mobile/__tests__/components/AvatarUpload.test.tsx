import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AvatarUpload } from '@shared/components/profile/AvatarUpload.native';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

// Mock useAvatarUpload hook
const mockUploadAvatar = jest.fn();
const mockRemoveAvatar = jest.fn();

jest.mock('@shared/hooks/useAvatarUpload', () => ({
  useAvatarUpload: jest.fn(() => ({
    uploading: false,
    progress: 0,
    error: null,
    uploadAvatar: mockUploadAvatar,
    removeAvatar: mockRemoveAvatar,
  })),
}));

const mockSupabaseClient = {} as SupabaseClient;

describe('AvatarUpload.native', () => {
  const mockOnUploadComplete = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadAvatar.mockResolvedValue('https://example.com/avatar.jpg?t=1234567890&v=abc123');
    mockRemoveAvatar.mockResolvedValue(undefined);
  });

  it('renders with current avatar URL', () => {
    const { UNSAFE_getByType } = render(
      <AvatarUpload
        currentAvatarUrl="https://example.com/avatar.jpg"
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    // In React Native, Image components don't have accessible labels by default
    // We can check if the component rendered by looking for the Remove button (which only shows when avatar exists)
    const removeButton = screen.getByText('Remove');
    expect(removeButton).toBeTruthy();
  });

  it('renders placeholder when no avatar URL', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    const placeholder = screen.getByText('?');
    expect(placeholder).toBeTruthy();
  });

  it('handles image picker and converts base64 to ArrayBuffer', async () => {
    // Mock image picker to return a test image
    const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // 1x1 red PNG
    const mockUri = 'file:///test/image.png';
    
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{
        uri: mockUri,
        mimeType: 'image/png',
        width: 1,
        height: 1,
      }],
    });
    
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(mockBase64);

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    // Find and press the upload button
    const uploadButton = screen.getByText('Choose File');
    fireEvent.press(uploadButton);

    // Wait for image picker to be called
    await waitFor(() => {
      expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    // Wait for file system read
    await waitFor(() => {
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
        mockUri,
        { encoding: 'base64' }
      );
    });

    // Verify upload was called with ArrayBuffer (not Blob with arrayBuffer method)
    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalled();
      const uploadArg = mockUploadAvatar.mock.calls[0][0];
      
      // Should be ArrayBuffer or have type property attached
      expect(uploadArg).toBeDefined();
      // Verify it's not trying to call arrayBuffer() method (React Native doesn't have it)
      expect(typeof uploadArg?.arrayBuffer).toBe('undefined');
    });
  });

  it('handles missing atob gracefully by using manual base64 decoding', async () => {
    // Simulate React Native environment without atob
    const originalAtob = (global as any).atob;
    delete (global as any).atob;

    const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const mockUri = 'file:///test/image.png';
    
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{
        uri: mockUri,
        mimeType: 'image/png',
      }],
    });
    
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(mockBase64);

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    const uploadButton = screen.getByText('Choose File');
    fireEvent.press(uploadButton);

    // Should not throw error about atob not existing
    // The component should handle base64 decoding manually
    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Restore atob if it existed
    if (originalAtob) {
      (global as any).atob = originalAtob;
    }
  });

  it('handles permission denial', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    const uploadButton = screen.getByText('Choose File');
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Permission Denied',
        'Permission to access photos is required to upload an avatar. Please grant permission in Settings.',
        [{ text: 'OK' }]
      );
    });

    // Image picker should not be launched if permission is denied
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('handles image picker cancellation', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    const uploadButton = screen.getByText('Choose File');
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    // Upload should not be called if user cancels
    expect(mockUploadAvatar).not.toHaveBeenCalled();
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  it('handles remove avatar', async () => {
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      // Simulate user pressing "Remove" button
      if (buttons && buttons[1] && buttons[1].onPress) {
        buttons[1].onPress();
      }
    });

    render(
      <AvatarUpload
        currentAvatarUrl="https://example.com/avatar.jpg"
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    const removeButton = screen.getByText('Remove');
    fireEvent.press(removeButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(mockRemoveAvatar).toHaveBeenCalled();
      expect(mockOnRemove).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });
});

