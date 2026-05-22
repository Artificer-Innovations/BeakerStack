import '@testing-library/jest-dom';
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react';
import { AvatarUpload } from '@beakerstack/shared/components/profile/AvatarUpload.web';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockUploadAvatar = jest.fn();
const mockRemoveAvatar = jest.fn();
let mockUploadedUrl: string | null = null;

jest.mock('@beakerstack/shared/hooks/useAvatarUpload', () => ({
  useAvatarUpload: jest.fn(() => ({
    uploading: false,
    progress: 0,
    error: null,
    get uploadedUrl() {
      return mockUploadedUrl;
    },
    uploadAvatar: mockUploadAvatar,
    removeAvatar: mockRemoveAvatar,
  })),
}));

const mockSupabaseClient = {} as SupabaseClient;

class MockFileReader {
  result: string | ArrayBuffer | null = 'data:image/jpeg;base64,Y29udGVudA==';
  onloadend: (() => void) | null = null;
  readAsDataURL() {
    queueMicrotask(() => this.onloadend?.());
  }
}

describe('AvatarUpload.web — coverage gaps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadedUrl = null;
    mockUploadAvatar.mockResolvedValue('https://example.com/avatar-v1.jpg');
    // @ts-expect-error test double
    global.FileReader = MockFileReader;
  });

  it('uses cache-buster ref when currentAvatarUrl changes after upload', async () => {
    const onUploadComplete = jest.fn();

    const { rerender } = render(
      <AvatarUpload
        currentAvatarUrl='https://example.com/avatar-v1.jpg'
        onUploadComplete={onUploadComplete}
        onRemove={jest.fn()}
        userId='user-id-1'
        supabaseClient={mockSupabaseClient}
      />
    );

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith(
        'https://example.com/avatar-v1.jpg'
      );
    });

    mockUploadedUrl = null;

    await act(async () => {
      rerender(
        <AvatarUpload
          currentAvatarUrl='https://example.com/avatar-v2.jpg'
          onUploadComplete={onUploadComplete}
          onRemove={jest.fn()}
          userId='user-id-1'
          supabaseClient={mockSupabaseClient}
        />
      );
    });

    await waitFor(() => {
      const img = screen.getByAltText('Avatar preview');
      expect(img.getAttribute('src')).toMatch(
        /^https:\/\/example\.com\/avatar-v2\.jpg\?t=\d+&k=\d+$/
      );
    });
  });

  it('ignores empty file selections and renders with default className', () => {
    const { container } = render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={jest.fn()}
        onRemove={jest.fn()}
        userId='user-id-1'
        supabaseClient={mockSupabaseClient}
      />
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it('ignores file selections when files is null', () => {
    const { container } = render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={jest.fn()}
        onRemove={jest.fn()}
        userId='user-id-1'
        supabaseClient={mockSupabaseClient}
      />
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: null } });
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it('applies custom className to the root container', () => {
    const { container } = render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={jest.fn()}
        onRemove={jest.fn()}
        userId='user-id-1'
        supabaseClient={mockSupabaseClient}
        className='custom-upload'
      />
    );
    expect(container.firstChild).toHaveClass('custom-upload');
  });
});
