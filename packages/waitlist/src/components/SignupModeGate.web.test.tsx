import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { defineWaitlistConfig } from '../schema.js';
import { SignupModeGate } from './SignupModeGate.web.js';
import * as client from '../waitlistClient.js';

const config = defineWaitlistConfig({
  productId: 'beakerstack',
  appOrigin: 'http://localhost:5173',
  emailTemplates: {
    inviteSubject: 'Invite',
    inviteHtml: '<p>{{inviteUrl}}</p>',
  },
});

describe('SignupModeGate', () => {
  it('shows loading spinner while settings load', () => {
    vi.spyOn(client, 'getPublicWaitlistSettings').mockReturnValue(
      new Promise(() => {})
    );
    render(
      <SignupModeGate supabase={{} as never} config={config}>
        <p>Open signup</p>
      </SignupModeGate>
    );
    expect(document.querySelector('.animate-spin')).toBeTruthy();
    vi.restoreAllMocks();
  });

  it('renders children when signup is open', async () => {
    vi.spyOn(client, 'getPublicWaitlistSettings').mockResolvedValue({
      signup_mode: 'open',
      copy: {},
      metadata_schema: [],
    });
    render(
      <SignupModeGate supabase={{} as never} config={config}>
        <p>Open signup</p>
      </SignupModeGate>
    );
    expect(await screen.findByText('Open signup')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('renders invite-only message', async () => {
    vi.spyOn(client, 'getPublicWaitlistSettings').mockResolvedValue({
      signup_mode: 'invite_only',
      copy: { invite_only: { message: 'Invite only copy' } },
      metadata_schema: [],
    });
    render(
      <SignupModeGate supabase={{} as never} config={config}>
        <p>Hidden</p>
      </SignupModeGate>
    );
    expect(await screen.findByText('Invite only copy')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('renders closed message', async () => {
    vi.spyOn(client, 'getPublicWaitlistSettings').mockResolvedValue({
      signup_mode: 'closed',
      copy: { closed: { message: 'Closed for now' } },
      metadata_schema: [],
    });
    render(
      <SignupModeGate supabase={{} as never} config={config}>
        <p>Hidden</p>
      </SignupModeGate>
    );
    expect(await screen.findByText('Closed for now')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('falls back to invite copy for unknown gated modes', async () => {
    vi.spyOn(client, 'getPublicWaitlistSettings').mockResolvedValue({
      signup_mode: 'invite_only' as 'open',
      copy: {},
      metadata_schema: [],
    });
    const gated = defineWaitlistConfig({
      productId: 'beakerstack',
      appOrigin: 'http://localhost:5173',
      copy: { invite_only: { message: 'Default invite gate' } },
      emailTemplates: {
        inviteSubject: 'Invite',
        inviteHtml: '<p>{{inviteUrl}}</p>',
      },
    });
    render(
      <SignupModeGate supabase={{} as never} config={gated}>
        <p>Hidden</p>
      </SignupModeGate>
    );
    expect(await screen.findByText('Default invite gate')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('shows waitlist form when mode is waitlist', async () => {
    vi.spyOn(client, 'getPublicWaitlistSettings').mockResolvedValue({
      signup_mode: 'waitlist',
      copy: {},
      metadata_schema: [],
    });
    render(
      <SignupModeGate
        supabase={{ functions: { invoke: vi.fn() } } as never}
        config={config}
      >
        <p>Hidden</p>
      </SignupModeGate>
    );
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('you@example.com')
      ).toBeInTheDocument();
    });
    vi.restoreAllMocks();
  });
});
