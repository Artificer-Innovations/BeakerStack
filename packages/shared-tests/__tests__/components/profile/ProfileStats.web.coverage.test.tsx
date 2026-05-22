import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileStats } from '@beakerstack/shared/components/profile/ProfileStats.web';
import type { UserProfile } from '@beakerstack/shared/types/profile';

describe('ProfileStats.web — coverage gaps', () => {
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

  it('renders with default empty className', () => {
    const { container } = render(<ProfileStats profile={mockProfile} />);
    expect(container.firstElementChild?.className).toContain('space-y-2');
    expect(screen.getByText(/Member since/)).toBeInTheDocument();
  });

  it('renders with a custom className', () => {
    const { container } = render(
      <ProfileStats profile={mockProfile} className='stats-panel' />
    );
    expect(container.firstElementChild?.className).toContain('stats-panel');
  });
});
