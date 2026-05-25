import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ProfileHeader } from '@beakerstack/shared/components/profile/ProfileHeader.web';
import type { UserProfile } from '@beakerstack/shared/types/profile';

jest.mock('@beakerstack/shared/components/profile/ProfileAvatar.web', () => ({
  ProfileAvatar: () => <div data-testid='profile-avatar' />,
}));

describe('ProfileHeader.web — coverage gaps', () => {
  const mockProfile: UserProfile = {
    id: 'profile-id-1',
    user_id: 'user-id-1',
    username: 'testuser',
    display_name: 'Test User',
    bio: 'Bio',
    avatar_url: null,
    website: null,
    location: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('renders with default empty className', () => {
    const { container } = render(<ProfileHeader profile={mockProfile} />);
    expect(container.firstElementChild?.className).toContain('space-y-4');
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders with a custom className', () => {
    const { container } = render(
      <ProfileHeader profile={mockProfile} className='custom-header' />
    );
    expect(container.firstElementChild?.className).toContain('custom-header');
  });
});
