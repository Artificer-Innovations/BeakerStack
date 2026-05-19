import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthConfirmPage from '../AuthConfirmPage';

// Mock the supabase client
const { mockVerifyOtp } = vi.hoisted(() => ({
  mockVerifyOtp: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: mockVerifyOtp,
    },
  },
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithParams = (search: string = '') => {
  const path = `/auth/confirm${search}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/auth/confirm' element={<AuthConfirmPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('AuthConfirmPage', () => {
  beforeEach(() => {
    mockVerifyOtp.mockReset();
    vi.clearAllMocks();
  });

  describe('invalid / missing params', () => {
    it('shows error when both token_hash and type are missing', () => {
      renderWithParams('');
      expect(
        screen.getByText('This confirmation link is invalid or has already been used.')
      ).toBeInTheDocument();
      expect(screen.getByText('Return to home')).toBeInTheDocument();
    });

    it('shows error when token_hash is missing but type is present', () => {
      renderWithParams('?type=signup');
      expect(
        screen.getByText('This confirmation link is invalid or has already been used.')
      ).toBeInTheDocument();
    });

    it('shows error when type is missing but token_hash is present', () => {
      renderWithParams('?token_hash=abc123');
      expect(
        screen.getByText('This confirmation link is invalid or has already been used.')
      ).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows verifying text while verifyOtp is pending', () => {
      mockVerifyOtp.mockImplementation(() => new Promise(() => {})); // never resolves
      renderWithParams('?token_hash=abc123&type=signup');
      expect(screen.getByText('Verifying your link…')).toBeInTheDocument();
      expect(
        screen.getByText('Please wait while we verify your link…')
      ).toBeInTheDocument();
    });
  });

  describe('verifyOtp error', () => {
    it('navigates to /forgot-password?expired=1 on error with recovery type', async () => {
      mockVerifyOtp.mockResolvedValue({ error: { message: 'token expired' } });
      renderWithParams('?token_hash=abc123&type=recovery');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/forgot-password?expired=1', {
          replace: true,
        });
      });
    });

    it('shows error message on verifyOtp error with non-recovery type (signup)', async () => {
      mockVerifyOtp.mockResolvedValue({ error: { message: 'token expired' } });
      renderWithParams('?token_hash=abc123&type=signup');
      await waitFor(() => {
        expect(
          screen.getByText(
            'This link has expired or is invalid. Please request a new one.'
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('verifyOtp success', () => {
    it('navigates to /reset-password on success with recovery type', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      renderWithParams('?token_hash=abc123&type=recovery');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/reset-password', {
          replace: true,
        });
      });
    });

    it('navigates to /dashboard on success with signup type', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      renderWithParams('?token_hash=abc123&type=signup');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
          replace: true,
        });
      });
    });

    it('navigates to /dashboard on success with magiclink type', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      renderWithParams('?token_hash=abc123&type=magiclink');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
          replace: true,
        });
      });
    });

    it('navigates to /dashboard on success with email_change type', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      renderWithParams('?token_hash=abc123&type=email_change');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
          replace: true,
        });
      });
    });

    it('navigates to /dashboard on success with invite type', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      renderWithParams('?token_hash=abc123&type=invite');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
          replace: true,
        });
      });
    });
  });

  describe('error state rendering', () => {
    it('renders a link to home when error is displayed', () => {
      renderWithParams('');
      const link = screen.getByRole('link', { name: 'Return to home' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/');
    });
  });
});
