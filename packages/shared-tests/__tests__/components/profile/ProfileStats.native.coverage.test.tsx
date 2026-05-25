import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileStats } from '@beakerstack/shared/components/profile/ProfileStats.native';
import type { UserProfile } from '@beakerstack/shared/types/profile';

describe('ProfileStats.native — coverage gaps', () => {
  it('handles date formatting errors in member since', () => {
    const profile: UserProfile = {
      id: '1',
      user_id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-01',
    };

    const spy = jest
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockImplementation(() => {
        throw new Error('locale unsupported');
      });

    render(<ProfileStats profile={profile} />);
    expect(screen.queryByText(/Member since:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Profile completion:/)).toBeInTheDocument();

    spy.mockRestore();
  });
});
