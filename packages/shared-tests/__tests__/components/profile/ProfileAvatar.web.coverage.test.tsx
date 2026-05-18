import '@testing-library/jest-dom';
import { render, fireEvent } from '@testing-library/react';
import { ProfileAvatar } from '@beakerstack/shared/components/profile/ProfileAvatar.web';
import type { UserProfile } from '@beakerstack/shared/types/profile';

const baseProfile: UserProfile = {
  id: 'profile-id-1',
  user_id: 'user-id-1',
  username: 'testuser',
  display_name: 'Test User',
  bio: null,
  avatar_url: 'https://example.com/avatar.jpg',
  website: null,
  location: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('ProfileAvatar (web) — onError handler coverage', () => {
  it('hides the img and renders initials in parent when image fails to load', () => {
    const { getByAltText } = render(<ProfileAvatar profile={baseProfile} />);
    const img = getByAltText('Test User');
    const parent = img.parentElement!;
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
    expect(parent.textContent).toContain('TU');
    // onError replaces img via parent.innerHTML, detaching img from React's tree.
    // Re-attach so React can removeChild(img) during cleanup without throwing.
    parent.innerHTML = '';
    parent.appendChild(img);
  });

  it('shows "?" initials when profile has no names and image fails', () => {
    const noName: UserProfile = { ...baseProfile, display_name: null, username: null };
    const { getByRole } = render(<ProfileAvatar profile={noName} />);
    const img = getByRole('img');
    const parent = img.parentElement!;
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
    expect(parent.textContent).toContain('?');
    parent.innerHTML = '';
    parent.appendChild(img);
  });
});
