import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getAdminWaitlistSettings,
  updateAdminWaitlistSettings,
  type WaitlistAdminSettings,
} from '@beakerstack/waitlist';
import AdminWaitlistSettingsPage from '../pages/AdminWaitlistSettingsPage';

vi.mock('@beakerstack/waitlist', async importOriginal => {
  const actual = await importOriginal<typeof import('@beakerstack/waitlist')>();
  return {
    ...actual,
    getAdminWaitlistSettings: vi.fn(),
    updateAdminWaitlistSettings: vi.fn(),
  };
});

const mockGet = vi.mocked(getAdminWaitlistSettings);
const mockUpdate = vi.mocked(updateAdminWaitlistSettings);

const baseSettings: WaitlistAdminSettings = {
  signup_mode: 'open',
  default_plan_id: 'beakerstack_free',
  invite_ttl_days: 7,
  identity_match_mode: 'lenient',
  copy: {
    waitlist: { confirmation: 'Thanks' },
    invite_only: { message: 'Invite only' },
    closed: { message: 'Closed' },
  },
  metadata_schema: [],
  updated_at: '2024-01-01T00:00:00Z',
};

describe('AdminWaitlistSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(baseSettings);
    mockUpdate.mockResolvedValue(baseSettings);
  });

  it('renders settings form after load', async () => {
    render(<AdminWaitlistSettingsPage />);
    expect(
      await screen.findByRole('heading', { name: /waitlist settings/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save settings/i })
    ).toBeEnabled();
  });

  it('saves settings on submit', async () => {
    const user = userEvent.setup();
    render(<AdminWaitlistSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });

    const [modeSelect, planSelect, identitySelect] =
      screen.getAllByRole('combobox');
    await user.selectOptions(modeSelect, 'waitlist');
    await user.selectOptions(planSelect, 'beakerstack_pro');
    await user.selectOptions(identitySelect, 'strict');
    const ttl = screen.getByRole('spinbutton');
    await user.clear(ttl);
    await user.type(ttl, '14');
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'Updated confirmation copy');
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(screen.getByText(/settings saved/i)).toBeInTheDocument();
    });
  });

  it('shows error when save returns null', async () => {
    mockUpdate.mockResolvedValueOnce(null);
    const user = userEvent.setup();
    render(<AdminWaitlistSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to save/i);
    });
  });

  it('shows error when save throws', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('network'));
    const user = userEvent.setup();
    render(<AdminWaitlistSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('network');
    });
  });
});
