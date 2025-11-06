import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ProfileStats } from '@shared/src/components/profile/ProfileStats.web';
import type { UserProfile } from '@shared/src/types/profile';

describe('ProfileStats', () => {
  const mockProfile: UserProfile = {
    id: 'profile-id-1',
    user_id: 'user-id-1',
    username: 'testuser',
    display_name: 'Test User',
    bio: 'Test bio',
    avatar_url: 'https://example.com/avatar.jpg',
    website: 'https://example.com',
    location: 'San Francisco, CA',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  };

  it('renders member since date when created_at is available', () => {
    render(<ProfileStats profile={mockProfile} />);
    expect(screen.getByText(/Member since:/)).toBeInTheDocument();
    expect(screen.getByText(/January 2024/)).toBeInTheDocument();
  });

  it('renders profile completion percentage', () => {
    render(<ProfileStats profile={mockProfile} />);
    expect(screen.getByText(/Profile completion:/)).toBeInTheDocument();
    // All 6 fields filled = 100%
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('calculates profile completion correctly for partial profiles', () => {
    const partialProfile = {
      ...mockProfile,
      bio: null,
      website: null,
      location: null,
    };
    render(<ProfileStats profile={partialProfile} />);
    // 3 out of 6 fields = 50%
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('returns null when profile is null', () => {
    const { container } = render(<ProfileStats profile={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when created_at is missing and completion is 0', () => {
    const emptyProfile = {
      ...mockProfile,
      created_at: null,
      display_name: null,
      username: null,
      bio: null,
      avatar_url: null,
      location: null,
      website: null,
    };
    const { container } = render(<ProfileStats profile={emptyProfile} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders only member since when completion is 0', () => {
    const profileWithDateOnly = {
      ...mockProfile,
      display_name: null,
      username: null,
      bio: null,
      avatar_url: null,
      location: null,
      website: null,
    };
    render(<ProfileStats profile={profileWithDateOnly} />);
    expect(screen.getByText(/Member since:/)).toBeInTheDocument();
    expect(screen.queryByText(/Profile completion:/)).not.toBeInTheDocument();
  });

  it('renders only completion when created_at is missing', () => {
    const profileWithoutDate = {
      ...mockProfile,
      created_at: null,
    };
    const { container } = render(<ProfileStats profile={profileWithoutDate} />);
    // Should still render because completion > 0
    expect(screen.getByText(/Profile completion:/)).toBeInTheDocument();
    expect(screen.queryByText(/Member since:/)).not.toBeInTheDocument();
  });

  it('handles invalid created_at date gracefully', () => {
    const profileWithInvalidDate = {
      ...mockProfile,
      created_at: 'invalid-date',
    };
    render(<ProfileStats profile={profileWithInvalidDate} />);
    expect(screen.queryByText(/Member since:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Profile completion:/)).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(<ProfileStats profile={mockProfile} />);
    // Check that the date appears somewhere in the rendered output
    expect(screen.getByText(/January 2024/)).toBeInTheDocument();
  });

  it('counts empty strings as unfilled fields', () => {
    const profileWithEmptyStrings = {
      ...mockProfile,
      bio: '',
      website: '',
      location: '',
    };
    render(<ProfileStats profile={profileWithEmptyStrings} />);
    // 3 out of 6 fields = 50%
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });
});

