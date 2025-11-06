import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarUpload } from '@shared/src/components/profile/AvatarUpload.web';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock useAvatarUpload hook
const mockUploadAvatar = jest.fn();
const mockRemoveAvatar = jest.fn();

jest.mock('@shared/src/hooks/useAvatarUpload', () => ({
  useAvatarUpload: jest.fn(() => ({
    uploading: false,
    progress: 0,
    error: null,
    uploadAvatar: mockUploadAvatar,
    removeAvatar: mockRemoveAvatar,
  })),
}));

const mockSupabaseClient = {} as SupabaseClient;

describe('AvatarUpload', () => {
  const mockOnUploadComplete = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadAvatar.mockResolvedValue('https://example.com/avatar.jpg');
    mockRemoveAvatar.mockResolvedValue(undefined);
  });

  it('renders with current avatar URL', () => {
    render(
      <AvatarUpload
        currentAvatarUrl="https://example.com/avatar.jpg"
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    const img = screen.getByAltText('Avatar preview');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
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

    // Should show placeholder icon
    const placeholder = screen.getByText('Avatar');
    expect(placeholder).toBeInTheDocument();
  });

  it('handles file selection and upload', async () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    useAvatarUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
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

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalledWith(file);
    });

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith('https://example.com/avatar.jpg');
    });
  });

  it('shows upload progress when uploading', () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    useAvatarUpload.mockReturnValue({
      uploading: true,
      progress: 50,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
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

    expect(screen.getByText('Uploading...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays error message when upload fails', () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    useAvatarUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      error: new Error('Upload failed'),
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
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

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('handles remove avatar', async () => {
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
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockRemoveAvatar).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnRemove).toHaveBeenCalled();
    });
  });

  it('disables buttons when uploading', () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    useAvatarUpload.mockReturnValue({
      uploading: true,
      progress: 50,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
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

    const chooseButton = screen.getByText('Uploading...');
    expect(chooseButton).toBeDisabled();
  });

  it('shows help text', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    expect(screen.getByText(/JPEG, PNG, or WebP. Max 2MB./i)).toBeInTheDocument();
  });

  it('does not show remove button when no avatar exists', () => {
    render(
      <AvatarUpload
        currentAvatarUrl={null}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('should display uploadedUrl over currentAvatarUrl when a new image is uploaded', () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    const oldAvatarUrl = 'https://example.com/old-avatar.jpg';
    const newAvatarUrl = 'https://example.com/new-avatar.jpg?t=1234567890&v=abc123';

    useAvatarUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      uploadedUrl: newAvatarUrl, // New uploaded URL
    });

    const { rerender } = render(
      <AvatarUpload
        currentAvatarUrl={oldAvatarUrl}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    // Should show the new uploaded URL, not the old currentAvatarUrl
    const img = screen.getByAltText('Avatar preview');
    expect(img).toHaveAttribute('src', newAvatarUrl);
    expect(img).not.toHaveAttribute('src', oldAvatarUrl);
  });

  it('should display new image when uploading a second image', async () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    const firstAvatarUrl = 'https://example.com/avatar1.jpg?t=1111111111&v=xyz789';
    const secondAvatarUrl = 'https://example.com/avatar2.jpg?t=2222222222&v=def456';

    // Start with first avatar uploaded
    useAvatarUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      uploadedUrl: firstAvatarUrl,
    });

    const { rerender } = render(
      <AvatarUpload
        currentAvatarUrl={firstAvatarUrl}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    let img = screen.getByAltText('Avatar preview');
    expect(img).toHaveAttribute('src', firstAvatarUrl);

    // Simulate second upload
    mockUploadAvatar.mockResolvedValueOnce(secondAvatarUrl);
    useAvatarUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      uploadedUrl: secondAvatarUrl, // New uploaded URL
    });

    rerender(
      <AvatarUpload
        currentAvatarUrl={firstAvatarUrl} // Profile hasn't updated yet
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    // Should show the new uploaded URL, not the old one
    img = screen.getByAltText('Avatar preview');
    expect(img).toHaveAttribute('src', secondAvatarUrl);
    expect(img).not.toHaveAttribute('src', firstAvatarUrl);
  });

  it('should prioritize uploadedUrl over currentAvatarUrl for immediate display', () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    const currentAvatarUrl = 'https://example.com/current-avatar.jpg';
    const uploadedUrl = 'https://example.com/uploaded-avatar.jpg?t=1234567890&v=abc123';

    useAvatarUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      uploadedUrl: uploadedUrl, // New upload completed
    });

    render(
      <AvatarUpload
        currentAvatarUrl={currentAvatarUrl}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    // Should show uploadedUrl (new image) even though currentAvatarUrl (old image) is still in profile
    const img = screen.getByAltText('Avatar preview');
    expect(img).toHaveAttribute('src', uploadedUrl);
    expect(img).not.toHaveAttribute('src', currentAvatarUrl);
  });

  it('should update image src when URL changes to force browser re-render', () => {
    const { useAvatarUpload } = require('@shared/src/hooks/useAvatarUpload');
    const firstUrl = 'https://example.com/avatar1.jpg?t=1111111111&v=xyz789';
    const secondUrl = 'https://example.com/avatar2.jpg?t=2222222222&v=def456';

    useAvatarUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      uploadedUrl: firstUrl,
    });

    const { rerender } = render(
      <AvatarUpload
        currentAvatarUrl={firstUrl}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    let img = screen.getByAltText('Avatar preview');
    expect(img).toHaveAttribute('src', firstUrl);

    // Update to second URL
    useAvatarUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      uploadedUrl: secondUrl,
    });

    rerender(
      <AvatarUpload
        currentAvatarUrl={secondUrl}
        onUploadComplete={mockOnUploadComplete}
        onRemove={mockOnRemove}
        userId="user-id-1"
        supabaseClient={mockSupabaseClient}
      />
    );

    // Src should change to the new URL, which will force browser to fetch new image
    // (The key prop in the component ensures React creates a new img element)
    img = screen.getByAltText('Avatar preview');
    expect(img).toHaveAttribute('src', secondUrl);
    expect(img).not.toHaveAttribute('src', firstUrl);
  });
});

