import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    waitlist: {
      headline: 'Join the waitlist',
      subhead: 'Rolling out in batches.',
      submit_button_label: 'Join waitlist',
      footer_note: 'No spam.',
      success_message: 'Thanks',
      confirmation: 'Thanks',
    },
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

  it('renders optional waitlist question controls', async () => {
    mockGet.mockResolvedValueOnce({
      ...baseSettings,
      metadata_schema: [
        {
          id: 'use_case',
          label: 'What are you hoping to use this for? (optional)',
          type: 'textarea',
          required: false,
        },
      ],
    });
    render(<AdminWaitlistSettingsPage />);
    expect(
      await screen.findByLabelText(
        /show optional question on waitlist signup form/i
      )
    ).toBeChecked();
    expect(screen.getByLabelText(/question label/i)).toHaveValue(
      'What are you hoping to use this for? (optional)'
    );
  });

  it('saves metadata_schema when optional question is enabled', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({
      ...baseSettings,
      metadata_schema: [],
    });
    render(<AdminWaitlistSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });

    await user.click(
      screen.getByLabelText(/show optional question on waitlist signup form/i)
    );
    const labelInput = screen.getByLabelText(/question label/i);
    await user.clear(labelInput);
    await user.type(labelInput, 'Why do you want in?');
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metadata_schema: [
            {
              id: 'use_case',
              label: 'Why do you want in?',
              type: 'textarea',
              required: false,
            },
          ],
        })
      );
    });
  });

  it('saves empty metadata_schema when optional question is disabled', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({
      ...baseSettings,
      metadata_schema: [
        {
          id: 'use_case',
          label: 'Old label',
          type: 'textarea',
          required: false,
        },
      ],
    });
    render(<AdminWaitlistSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });

    await user.click(
      screen.getByLabelText(/show optional question on waitlist signup form/i)
    );
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ metadata_schema: [] })
      );
    });
  });

  it('saves pricing and tier panel copy fields', async () => {
    const user = userEvent.setup();
    render(<AdminWaitlistSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });

    fireEvent.change(screen.getByLabelText(/home pricing cta label/i), {
      target: { value: 'Reserve {tier}' },
    });
    fireEvent.change(screen.getByLabelText(/signup tier panel header/i), {
      target: { value: 'RESERVE' },
    });

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
    const patch = mockUpdate.mock.calls.at(-1)?.[1] as {
      copy?: { waitlist?: Record<string, string> };
    };
    expect(patch?.copy?.waitlist?.pricing_cta_label).toBe('Reserve {tier}');
    expect(patch?.copy?.waitlist?.tier_panel_header).toBe('RESERVE');
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
    const successMessage = screen.getByLabelText(/success message/i);
    await user.clear(successMessage);
    await user.type(successMessage, 'Updated success copy');
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
