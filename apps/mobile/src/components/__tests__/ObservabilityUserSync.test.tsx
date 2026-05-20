import { render, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { ObservabilityUserSync } from '../ObservabilityUserSync';

const mockSetUser = jest.fn();

jest.mock('@beakerstack/observability/native', () => ({
  useObservability: () => ({ setUser: mockSetUser }),
}));

jest.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

describe('ObservabilityUserSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears Sentry user when signed out', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({ user: null });

    render(<ObservabilityUserSync />);

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(null);
    });
  });

  it('sets hashed user id when signed in', async () => {
    (useAuthContext as jest.Mock).mockReturnValue({
      user: { id: 'user-uuid-123' },
    });

    render(<ObservabilityUserSync />);

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith('user-uuid-123');
    });
  });
});
