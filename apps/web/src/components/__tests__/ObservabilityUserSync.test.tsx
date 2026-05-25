import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { ObservabilityUserSync } from '../ObservabilityUserSync';

const mockSetUser = vi.fn();

vi.mock('@beakerstack/observability/web', () => ({
  useObservability: () => ({ setUser: mockSetUser }),
}));

vi.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: vi.fn(),
}));

describe('ObservabilityUserSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears Sentry user when signed out', async () => {
    vi.mocked(useAuthContext).mockReturnValue({ user: null } as never);

    render(<ObservabilityUserSync />);

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(null);
    });
  });

  it('sets hashed user id when signed in', async () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: { id: 'user-uuid-123' },
    } as never);

    render(<ObservabilityUserSync />);

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith('user-uuid-123');
    });
  });
});
