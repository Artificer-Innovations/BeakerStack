import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileStats } from '@shared/src/components/profile/ProfileStats.native';
import type { UserProfile } from '@shared/src/types/profile';

describe('ProfileStats (Native)', () => {
  it('renders member since date', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-01',
    };

    render(<ProfileStats profile={profile} />);
    expect(screen.getByText(/Member since:/)).toBeInTheDocument();
    expect(screen.getByText(/January 2024/)).toBeInTheDocument();
  });

  it('renders profile completion percentage', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      bio: 'Test bio',
      avatar_url: 'https://example.com/avatar.jpg',
      location: 'Test Location',
      website: 'https://example.com',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-01',
    };

    render(<ProfileStats profile={profile} />);
    expect(screen.getByText(/Profile completion:/)).toBeInTheDocument();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('calculates profile completion correctly', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      bio: null,
      avatar_url: null,
      location: null,
      website: null,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-01',
    };

    render(<ProfileStats profile={profile} />);
    // 2 out of 6 fields filled = 33%
    expect(screen.getByText(/33%/)).toBeInTheDocument();
  });

  it('returns null when profile is null', () => {
    const { container } = render(<ProfileStats profile={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when no member since and completion is 0', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: null,
      display_name: null,
      bio: null,
      avatar_url: null,
      location: null,
      website: null,
      created_at: null,
      updated_at: '2024-01-01',
    };

    const { container } = render(<ProfileStats profile={profile} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles invalid date gracefully', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      created_at: 'invalid-date',
      updated_at: '2024-01-01',
    };

    render(<ProfileStats profile={profile} />);
    // Should still show completion percentage
    expect(screen.getByText(/Profile completion:/)).toBeInTheDocument();
  });

  it('handles missing created_at', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      created_at: null,
      updated_at: '2024-01-01',
    };

    render(<ProfileStats profile={profile} />);
    // Should show completion but not member since
    expect(screen.getByText(/Profile completion:/)).toBeInTheDocument();
    expect(screen.queryByText(/Member since:/)).not.toBeInTheDocument();
  });
});
