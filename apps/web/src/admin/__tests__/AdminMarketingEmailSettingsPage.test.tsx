import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getAdminMarketingEmailSettings,
  getAdminMarketingEmailQueueStats,
  updateAdminMarketingEmailSettings,
  type MarketingEmailAdminSettings,
  type MarketingEmailQueueStats,
} from '@beakerstack/marketing-email';
import AdminMarketingEmailSettingsPage from '../pages/AdminMarketingEmailSettingsPage';

vi.mock('@beakerstack/marketing-email', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@beakerstack/marketing-email')>();
  return {
    ...actual,
    getAdminMarketingEmailSettings: vi.fn(),
    getAdminMarketingEmailQueueStats: vi.fn(),
    updateAdminMarketingEmailSettings: vi.fn(),
  };
});

const mockGet = vi.mocked(getAdminMarketingEmailSettings);
const mockGetStats = vi.mocked(getAdminMarketingEmailQueueStats);
const mockUpdate = vi.mocked(updateAdminMarketingEmailSettings);

const baseSettings: MarketingEmailAdminSettings = {
  product_id: 'beakerstack',
  enabled: true,
  provider: 'kit',
  config: {
    namespace: 'beakerstack',
    kitFormId: 'form-123',
    tierTagNames: ['pro', 'max'],
  },
  updated_at: '2026-01-01T00:00:00Z',
};

const baseStats: MarketingEmailQueueStats = {
  pending: 3,
  processing: 1,
  done: 42,
  failed: 0,
};

describe('AdminMarketingEmailSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(baseSettings);
    mockGetStats.mockResolvedValue(baseStats);
    mockUpdate.mockResolvedValue(baseSettings);
  });

  it('renders settings form after load', async () => {
    render(<AdminMarketingEmailSettingsPage />);
    expect(
      await screen.findByRole('heading', { name: /marketing email settings/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save settings/i })
    ).toBeEnabled();
  });

  it('renders queue stats cards when stats are returned', async () => {
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('heading', { name: /marketing email settings/i });
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('omits stats section when stats are null', async () => {
    mockGetStats.mockResolvedValueOnce(null);
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('heading', { name: /marketing email settings/i });
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
  });

  it('pre-populates fields from loaded settings', async () => {
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });
    expect(screen.getByDisplayValue('beakerstack')).toBeInTheDocument();
    expect(screen.getByDisplayValue('form-123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('pro, max')).toBeInTheDocument();
  });

  it('shows disabled warning when integration is toggled off', async () => {
    mockGet.mockResolvedValueOnce({ ...baseSettings, enabled: false });
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });
    expect(
      screen.getByText(/new events are not enqueued/i)
    ).toBeInTheDocument();
  });

  it('does not show disabled warning when integration is enabled', async () => {
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });
    expect(
      screen.queryByText(/new events are not enqueued/i)
    ).not.toBeInTheDocument();
  });

  it('initialises to disabled defaults when settings are null', async () => {
    mockGet.mockResolvedValueOnce(null);
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('shows error when namespace is empty on save', async () => {
    const user = userEvent.setup();
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });

    const namespaceInput = screen.getByDisplayValue('beakerstack');
    await user.clear(namespaceInput);

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /namespace is required/i
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('shows error when kitFormId is empty on save', async () => {
    const user = userEvent.setup();
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });

    const formIdInput = screen.getByDisplayValue('form-123');
    await user.clear(formIdInput);

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /kit form id is required/i
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('saves settings on submit and shows saved confirmation', async () => {
    const user = userEvent.setup();
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent(/settings saved/i);
    });
  });

  it('passes tierTagNames as parsed array to update', async () => {
    const user = userEvent.setup();
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });

    const tagsInput = screen.getByDisplayValue('pro, max');
    await user.clear(tagsInput);
    await user.type(tagsInput, 'starter, pro, enterprise');

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          config: expect.objectContaining({
            tierTagNames: ['starter', 'pro', 'enterprise'],
          }),
        })
      );
    });
  });

  it('shows error when update returns null', async () => {
    mockUpdate.mockResolvedValueOnce(null);
    const user = userEvent.setup();
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to save/i);
    });
  });

  it('shows error when update throws', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('network error'));
    const user = userEvent.setup();
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('network error');
    });
  });

  it('uses generic copy when update throws a non-Error value', async () => {
    mockUpdate.mockRejectedValueOnce('boom');
    const user = userEvent.setup();
    render(<AdminMarketingEmailSettingsPage />);
    await screen.findByRole('button', { name: /save settings/i });
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/save failed/i);
    });
  });
});
