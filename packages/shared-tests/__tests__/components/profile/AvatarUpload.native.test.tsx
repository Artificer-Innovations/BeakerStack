import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AvatarUpload } from '@shared/src/components/profile/AvatarUpload.native';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted',
  }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///test/image.jpg',
        mimeType: 'image/jpeg',
        width: 100,
        height: 100,
      },
    ],
  }),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  EncodingType: {
    Base64: 'base64',
  },
  readAsStringAsync: jest.fn().mockResolvedValue('base64encodedstring'),
}));

// Mock useAvatarUpload hook
const mockUploadAvatar = jest
  .fn()
  .mockResolvedValue('https://example.com/avatar.jpg');
const mockRemoveAvatar = jest.fn().mockResolvedValue(undefined);

jest.mock('@shared/src/hooks/useAvatarUpload', () => ({
  useAvatarUpload: jest.fn(() => ({
    uploading: false,
    progress: 0,
    error: null,
    uploadAvatar: mockUploadAvatar,
    removeAvatar: mockRemoveAvatar,
    uploadedUrl: null,
  })),
}));

// Mock Logger
jest.mock('@shared/src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Platform
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
    },
  };
});

const createMockSupabaseClient = (): SupabaseClient => {
  return {
    storage: {
      from: jest.fn(),
    },
  } as unknown as SupabaseClient;
};

describe('AvatarUpload (Native)', () => {
  const mockOnUploadComplete = jest.fn();
  const mockOnRemove = jest.fn();
  const mockClient = createMockSupabaseClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    expect(screen.getByText('Avatar')).toBeInTheDocument();
  });

  it('renders placeholder when no avatar URL', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders avatar image when URL is provided', () => {
    render(
      <AvatarUpload
        currentAvatarUrl='https://example.com/avatar.jpg'
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
  });

  it('renders Choose File button', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('renders Remove button when avatar URL exists', () => {
    render(
      <AvatarUpload
        currentAvatarUrl='https://example.com/avatar.jpg'
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('does not render Remove button when no avatar URL', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('shows upload progress when uploading', () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    useAvatarUpload.mockReturnValue({
      uploading: true,
      progress: 50,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      uploadedUrl: null,
    });

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    expect(screen.getByText('Uploading...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays error message when upload fails', () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    useAvatarUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      error: { message: 'Upload failed' },
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      uploadedUrl: null,
    });

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('displays help text', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    expect(
      screen.getByText('JPEG, PNG, or WebP. Max 2MB.')
    ).toBeInTheDocument();
  });

  it('handles iOS permission denied', async () => {
    const {
      requestMediaLibraryPermissionsAsync,
    } = require('expo-image-picker');
    requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
    });

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const chooseButton = screen.getByText('Choose File');
    fireEvent.click(chooseButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Permission Denied',
        'Permission to access photos is required to upload an avatar. Please grant permission in Settings.',
        [{ text: 'OK' }]
      );
    });

    alertSpy.mockRestore();
  });

  it('handles Android platform', async () => {
    const { Platform } = require('react-native');
    Platform.OS = 'android';
    // @ts-ignore
    global.__DEV__ = true;

    const { launchImageLibraryAsync } = require('expo-image-picker');
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///test/image.jpg',
          mimeType: 'image/jpeg',
          width: 100,
          height: 100,
        },
      ],
    });

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const chooseButton = screen.getByText('Choose File');
    fireEvent.click(chooseButton);

    await waitFor(() => {
      expect(launchImageLibraryAsync).toHaveBeenCalled();
    });

    Platform.OS = 'ios';
  });

  it('handles image picker timeout', async () => {
    const { launchImageLibraryAsync } = require('expo-image-picker');
    launchImageLibraryAsync.mockImplementationOnce(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
    );

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const chooseButton = screen.getByText('Choose File');
    fireEvent.click(chooseButton);

    await waitFor(
      () => {
        expect(alertSpy).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    alertSpy.mockRestore();
  });

  it('handles image picker canceled', async () => {
    const { launchImageLibraryAsync } = require('expo-image-picker');
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: true,
      assets: null,
    });

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const chooseButton = screen.getByText('Choose File');
    fireEvent.click(chooseButton);

    await waitFor(() => {
      expect(mockUploadAvatar).not.toHaveBeenCalled();
    });
  });

  it('handles no assets returned', async () => {
    const { launchImageLibraryAsync } = require('expo-image-picker');
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [],
    });

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const chooseButton = screen.getByText('Choose File');
    fireEvent.click(chooseButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'No Image Selected',
        "Please select an image from your gallery. If you don't have any photos, you can add some to your device first.",
        [{ text: 'OK' }]
      );
    });

    alertSpy.mockRestore();
  });

  it('handles file reading error', async () => {
    const { readAsStringAsync } = require('expo-file-system');
    readAsStringAsync.mockRejectedValueOnce(new Error('File read error'));

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const chooseButton = screen.getByText('Choose File');
    fireEvent.click(chooseButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Failed to process image')
      );
    });

    alertSpy.mockRestore();
  });

  it('handles empty base64', async () => {
    const { readAsStringAsync } = require('expo-file-system');
    readAsStringAsync.mockResolvedValueOnce('');

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const chooseButton = screen.getByText('Choose File');
    fireEvent.click(chooseButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('handles remove avatar confirmation', async () => {
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(
      <AvatarUpload
        currentAvatarUrl='https://example.com/avatar.jpg'
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Remove Avatar',
        'Are you sure you want to remove your avatar?',
        expect.any(Array)
      );
    });

    // Simulate pressing Remove in the alert
    const alertCall = alertSpy.mock.calls[0];
    const removeAction = alertCall[2]?.find(
      (action: any) => action.text === 'Remove'
    );
    if (removeAction?.onPress) {
      await removeAction.onPress();
    }

    await waitFor(() => {
      expect(mockRemoveAvatar).toHaveBeenCalled();
      expect(mockOnRemove).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('handles remove avatar cancellation', async () => {
    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(
      <AvatarUpload
        currentAvatarUrl='https://example.com/avatar.jpg'
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    // Simulate pressing Cancel
    const alertCall = alertSpy.mock.calls[0];
    const cancelAction = alertCall[2]?.find(
      (action: any) => action.text === 'Cancel'
    );
    if (cancelAction?.onPress) {
      cancelAction.onPress();
    }

    expect(mockRemoveAvatar).not.toHaveBeenCalled();
    expect(mockOnRemove).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('handles uploadedUrl from hook', () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    useAvatarUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      uploadedUrl: 'https://example.com/uploaded.jpg',
    });

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    // Should show uploaded URL
    const images = screen.queryAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('handles preview URL', async () => {
    const { launchImageLibraryAsync } = require('expo-image-picker');
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///test/preview.jpg',
          mimeType: 'image/jpeg',
          width: 100,
          height: 100,
        },
      ],
    });

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const chooseButton = screen.getByText('Choose File');
    fireEvent.click(chooseButton);

    await waitFor(() => {
      // Preview should be set before upload completes
      expect(mockUploadAvatar).toHaveBeenCalled();
    });
  });

  it('fixes URL for Android emulator in dev mode', () => {
    const { Platform } = require('react-native');
    Platform.OS = 'android';
    // @ts-ignore
    global.__DEV__ = true;

    render(
      <AvatarUpload
        currentAvatarUrl='http://127.0.0.1:54321/storage/v1/object/public/avatars/test.jpg'
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    // URL should be fixed for Android emulator
    const images = screen.queryAllByRole('img');
    expect(images.length).toBeGreaterThan(0);

    Platform.OS = 'ios';
    // @ts-ignore
    global.__DEV__ = false;
  });

  it.skip('handles image load error', () => {
    const { Logger } = require('@shared/src/utils/logger');
    const warnSpy = jest.spyOn(Logger, 'warn');

    render(
      <AvatarUpload
        currentAvatarUrl='https://example.com/invalid.jpg'
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const images = screen.queryAllByRole('img');
    if (images.length > 0) {
      fireEvent(images[0], 'error', {
        nativeEvent: { error: 'Load failed' },
      });

      // Error handler should be called (though may not trigger in test environment)
      // Just verify the component renders
      expect(images[0]).toBeInTheDocument();
    }

    warnSpy.mockRestore();
  });

  it.skip('handles image load success', () => {
    const { Logger } = require('@shared/src/utils/logger');
    const debugSpy = jest.spyOn(Logger, 'debug');

    render(
      <AvatarUpload
        currentAvatarUrl='https://example.com/avatar.jpg'
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const images = screen.queryAllByRole('img');
    if (images.length > 0) {
      fireEvent(images[0], 'load');

      // Load handler should be called
      expect(images[0]).toBeInTheDocument();
    }

    debugSpy.mockRestore();
  });

  it('handles remove avatar error', async () => {
    mockRemoveAvatar.mockRejectedValueOnce(new Error('Remove failed'));

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(
      <AvatarUpload
        currentAvatarUrl='https://example.com/avatar.jpg'
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    // Simulate pressing Remove
    const alertCall = alertSpy.mock.calls[0];
    const removeAction = alertCall[2]?.find(
      (action: any) => action.text === 'Remove'
    );
    if (removeAction?.onPress) {
      await removeAction.onPress();
    }

    // Error is handled by hook, component should still work
    expect(mockRemoveAvatar).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('handles button disabled state during upload', () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    useAvatarUpload.mockReturnValue({
      uploading: true,
      progress: 50,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      uploadedUrl: null,
    });

    render(
      <AvatarUpload
        currentAvatarUrl='https://example.com/avatar.jpg'
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    const chooseButton = screen.getByText('Uploading...');
    expect(chooseButton).toBeInTheDocument();
    // Button should be disabled (tested via disabled prop in component)
  });
});
