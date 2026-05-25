import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '@beakerstack/shared/components/auth/ProtectedRoute.native';

const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), replace: mockReplace }),
}));

jest.mock('@beakerstack/shared/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    loading: false,
  }),
}));

describe('ProtectedRoute (native) — authenticated render coverage', () => {
  beforeEach(() => {
    mockReplace.mockReset();
  });

  it('renders children when user is authenticated', () => {
    render(
      <ProtectedRoute>
        <div data-testid='protected-content'>Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.queryByText('Redirecting...')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
