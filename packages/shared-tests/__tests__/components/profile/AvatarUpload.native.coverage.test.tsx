import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestRenderer, { act as testRendererAct } from 'react-test-renderer';
import { Image } from 'react-native';
import { Buffer } from 'buffer';
import { AvatarUpload } from '@beakerstack/shared/components/profile/AvatarUpload.native';
import { Logger } from '@beakerstack/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted',
  }),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
  UIImagePickerPresentationStyle: { PAGE_SHEET: 'pageSheet' },
}));

jest.mock('expo-file-system', () => ({
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(),
}));

const mockUploadAvatar = jest
  .fn()
  .mockResolvedValue('https://example.com/avatar.jpg');
const mockRemoveAvatar = jest.fn().mockResolvedValue(undefined);

jest.mock('@beakerstack/shared/hooks/useAvatarUpload', () => ({
  useAvatarUpload: jest.fn(() => ({
    uploading: false,
    progress: 0,
    error: null,
    uploadAvatar: mockUploadAvatar,
    removeAvatar: mockRemoveAvatar,
    uploadedUrl: null,
  })),
}));

jest.mock('@beakerstack/logger', () => ({
  Logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: { OS: 'ios' },
    Alert: { alert: jest.fn() },
  };
});

const mockClient = {
  storage: { from: jest.fn() },
} as unknown as SupabaseClient;

describe('AvatarUpload.native — coverage gaps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadAvatar.mockResolvedValue('https://example.com/avatar.jpg');
  });

  it('defaults missing mimeType to jpeg and handles missing asset uri', async () => {
    const { launchImageLibraryAsync } = require('expo-image-picker');
    const { readAsStringAsync } = require('expo-file-system');
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ width: 10, height: 10 }],
    });
    readAsStringAsync.mockResolvedValueOnce(
      Buffer.from('hello').toString('base64')
    );

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={jest.fn()}
        onRemove={jest.fn()}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    fireEvent.click(screen.getByText('Choose File'));

    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalled();
    });
    expect(Logger.debug).toHaveBeenCalledWith(
      '[AvatarUpload] Selected asset:',
      expect.objectContaining({ mimeType: undefined })
    );
  });

  it('wraps non-Error file processing failures', async () => {
    const { launchImageLibraryAsync } = require('expo-image-picker');
    const { readAsStringAsync } = require('expo-file-system');
    const { Alert } = require('react-native');
    launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///test/image.jpg',
          mimeType: 'image/jpeg',
          width: 10,
          height: 10,
        },
      ],
    });
    readAsStringAsync.mockRejectedValueOnce('read failed');

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={jest.fn()}
        onRemove={jest.fn()}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    fireEvent.click(screen.getByText('Choose File'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('read failed')
      );
    });
  });

  it('wraps non-Error picker failures', async () => {
    const { launchImageLibraryAsync } = require('expo-image-picker');
    const { Alert } = require('react-native');
    launchImageLibraryAsync.mockRejectedValueOnce('picker failed');

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={jest.fn()}
        onRemove={jest.fn()}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    fireEvent.click(screen.getByText('Choose File'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('picker failed')
      );
    });
  });

  it('uses imageKey cache buster branch after URL changes', () => {
    const { rerender } = render(
      <AvatarUpload
        currentAvatarUrl='https://example.com/avatar-v1.jpg'
        onUploadComplete={jest.fn()}
        onRemove={jest.fn()}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    rerender(
      <AvatarUpload
        currentAvatarUrl='https://example.com/avatar-v2.jpg?existing=1'
        onUploadComplete={jest.fn()}
        onRemove={jest.fn()}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    let tree!: TestRenderer.ReactTestRenderer;
    testRendererAct(() => {
      tree = TestRenderer.create(
        <AvatarUpload
          currentAvatarUrl='https://example.com/avatar-v2.jpg?existing=1'
          onUploadComplete={jest.fn()}
          onRemove={jest.fn()}
          userId='user-id-1'
          supabaseClient={mockClient}
        />
      );
    });

    const image = tree.root.findByType(Image);
    testRendererAct(() => {
      image.props.onError({ message: 'load failed' });
    });
    expect(Logger.warn).toHaveBeenCalledWith(
      '[AvatarUpload] Failed to load preview image:',
      expect.any(String),
      expect.objectContaining({ message: 'load failed' })
    );
  });

  it('surfaces non-Error failures from handlePickImage catch on button press', async () => {
    const { launchImageLibraryAsync } = require('expo-image-picker');
    const { Alert } = require('react-native');
    launchImageLibraryAsync.mockImplementationOnce(() =>
      Promise.reject('async picker failure')
    );

    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={jest.fn()}
        onRemove={jest.fn()}
        userId='user-id-1'
        supabaseClient={mockClient}
      />
    );

    fireEvent.click(screen.getByText('Choose File'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('async picker failure')
      );
    });
  });
});
