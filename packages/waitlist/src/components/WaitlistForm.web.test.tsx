import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defineWaitlistConfig } from '../schema.js';
import { WaitlistForm } from './WaitlistForm.web.js';

const config = defineWaitlistConfig({
  productId: 'beakerstack',
  captureFunctionName: 'waitlist-capture',
  appOrigin: 'http://localhost:5173',
  emailTemplates: {
    inviteSubject: 'Invite',
    inviteHtml: '<p>{{inviteUrl}}</p>',
  },
  metadataFields: [
    { id: 'company', label: 'Company', type: 'text', required: false },
    { id: 'note', label: 'Note', type: 'textarea' },
    { id: 'ref', label: 'Ref', type: 'hidden' },
  ],
});

describe('WaitlistForm', () => {
  it('prefers settings metadata schema over config fields', () => {
    render(
      <WaitlistForm
        supabase={{ functions: { invoke: vi.fn() } } as never}
        config={config}
        settings={{
          signup_mode: 'waitlist',
          copy: {},
          metadata_schema: [{ id: 'role', label: 'Role', type: 'text' }],
        }}
      />
    );
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.queryByText('Company')).not.toBeInTheDocument();
  });

  it('submits email and shows confirmation', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { message: 'Custom thanks' },
      error: null,
    });
    const supabase = {
      functions: { invoke },
    } as never;
    const user = userEvent.setup();

    render(
      <WaitlistForm
        supabase={supabase}
        config={config}
        settings={{
          signup_mode: 'waitlist',
          copy: {},
          metadata_schema: [],
        }}
      />
    );

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'join@example.com'
    );
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalled();
      expect(screen.getByText('Custom thanks')).toBeInTheDocument();
    });
  });

  it('shows validation error for empty email', async () => {
    const user = userEvent.setup();
    render(
      <WaitlistForm
        supabase={{ functions: { invoke: vi.fn() } } as never}
        config={config}
        settings={null}
      />
    );
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));
    expect(screen.getByText(/please enter your email/i)).toBeInTheDocument();
  });

  it('renders metadata fields and updates values', async () => {
    const user = userEvent.setup();
    render(
      <WaitlistForm
        supabase={{ functions: { invoke: vi.fn() } } as never}
        config={config}
        settings={null}
      />
    );
    const fields = screen.getAllByRole('textbox');
    await user.type(fields[0], 'Acme');
    await user.type(fields[1], 'hello');
    expect(fields[1]).toHaveValue('hello');
    expect(screen.queryByLabelText('Ref')).not.toBeInTheDocument();
  });

  it('shows confirmation when submit throws', async () => {
    const user = userEvent.setup();
    render(
      <WaitlistForm
        supabase={
          {
            functions: {
              invoke: vi.fn().mockRejectedValue(new Error('network')),
            },
          } as never
        }
        config={config}
        settings={null}
      />
    );
    await user.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('shows confirmation when invoke returns error', async () => {
    const user = userEvent.setup();
    render(
      <WaitlistForm
        supabase={
          {
            functions: {
              invoke: vi
                .fn()
                .mockResolvedValue({ data: null, error: { message: 'x' } }),
            },
          } as never
        }
        config={config}
        settings={null}
      />
    );
    await user.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('uses default confirmation when response omits message', async () => {
    const user = userEvent.setup();
    render(
      <WaitlistForm
        supabase={
          {
            functions: {
              invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
            },
          } as never
        }
        config={config}
        settings={{
          signup_mode: 'waitlist',
          copy: { waitlist: { confirmation: 'Settings thanks' } },
          metadata_schema: [],
        }}
      />
    );
    await user.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));
    expect(await screen.findByText('Settings thanks')).toBeInTheDocument();
  });
});
