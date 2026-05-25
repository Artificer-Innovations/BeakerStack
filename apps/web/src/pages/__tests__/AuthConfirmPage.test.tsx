import { StrictMode } from 'react';
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

// Mock postAuthRedirect
const { mockReadAndClearPostAuthRedirect } = vi.hoisted(() => ({
  mockReadAndClearPostAuthRedirect: vi.fn(),
}));

vi.mock('@/auth/postAuthRedirect', () => ({
  readAndClearPostAuthRedirect: mockReadAndClearPostAuthRedirect,
}));

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
    vi.clearAllMocks();
    mockVerifyOtp.mockReset();
    mockReadAndClearPostAuthRedirect.mockReset();
    mockReadAndClearPostAuthRedirect.mockReturnValue(null);
  });

  describe('invalid / missing params', () => {
    it('shows error when both token_hash and type are missing', () => {
      renderWithParams('');
      expect(
        screen.getByText(
          'This confirmation link is invalid or has already been used.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Return to home')).toBeInTheDocument();
    });

    it('shows error when token_hash is missing but type is present', () => {
      renderWithParams('?type=signup');
      expect(
        screen.getByText(
          'This confirmation link is invalid or has already been used.'
        )
      ).toBeInTheDocument();
    });

    it('shows error when type is missing but token_hash is present', () => {
      renderWithParams('?token_hash=abc123');
      expect(
        screen.getByText(
          'This confirmation link is invalid or has already been used.'
        )
      ).toBeInTheDocument();
    });

    it('shows error for invalid type in URL', () => {
      renderWithParams('?token_hash=abc123&type=invalid_type');
      expect(
        screen.getByText(
          'This confirmation link is invalid or has already been used.'
        )
      ).toBeInTheDocument();
      expect(mockVerifyOtp).not.toHaveBeenCalled();
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
        expect(mockNavigate).toHaveBeenCalledWith(
          '/forgot-password?expired=1',
          {
            replace: true,
          }
        );
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

    it('shows error on network failure', async () => {
      mockVerifyOtp.mockRejectedValue(new Error('Network error'));
      renderWithParams('?token_hash=abc123&type=signup');
      await waitFor(() => {
        expect(
          screen.getByText('Something went wrong. Please try again later.')
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
      mockReadAndClearPostAuthRedirect.mockReturnValue(null);
      renderWithParams('?token_hash=abc123&type=signup');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
          replace: true,
        });
      });
    });

    it('navigates to /dashboard on success with magiclink type', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockReadAndClearPostAuthRedirect.mockReturnValue(null);
      renderWithParams('?token_hash=abc123&type=magiclink');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
          replace: true,
        });
      });
    });

    it('navigates to /dashboard on success with email_change type', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockReadAndClearPostAuthRedirect.mockReturnValue(null);
      renderWithParams('?token_hash=abc123&type=email_change');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
          replace: true,
        });
      });
    });

    it('navigates to /dashboard on success with invite type', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockReadAndClearPostAuthRedirect.mockReturnValue(null);
      renderWithParams('?token_hash=abc123&type=invite');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
          replace: true,
        });
      });
    });

    it('honors post-auth redirect on success', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockReadAndClearPostAuthRedirect.mockReturnValue('/some/path');
      renderWithParams('?token_hash=abc123&type=signup');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/some/path', {
          replace: true,
        });
      });
    });
  });

  describe('React Strict Mode guard', () => {
    it('does not call verifyOtp a second time when Strict Mode re-runs effects', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockReadAndClearPostAuthRedirect.mockReturnValue(null);
      render(
        <StrictMode>
          <MemoryRouter
            initialEntries={['/auth/confirm?token_hash=abc123&type=signup']}
          >
            <Routes>
              <Route path='/auth/confirm' element={<AuthConfirmPage />} />
            </Routes>
          </MemoryRouter>
        </StrictMode>
      );
      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalledTimes(1);
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
