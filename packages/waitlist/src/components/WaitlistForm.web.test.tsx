import type { ComponentProps } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defineWaitlistConfig } from '../schema.js';
import { emitLifecycleEvent } from '../lifecycle.js';
import { WaitlistForm } from './WaitlistForm.web.js';

vi.mock('../lifecycle.js', () => ({
  emitLifecycleEvent: vi.fn().mockResolvedValue(undefined),
}));

const emitLifecycleEventMock = vi.mocked(emitLifecycleEvent);

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

function renderForm(
  overrides: Partial<ComponentProps<typeof WaitlistForm>> = {}
) {
  const invoke = vi.fn().mockResolvedValue({
    data: { message: 'Custom thanks' },
    error: null,
  });
  const supabase = { functions: { invoke } } as never;
  const result = render(
    <WaitlistForm
      supabase={supabase}
      config={config}
      settings={overrides.settings ?? null}
      {...overrides}
    />
  );
  return { invoke, ...result };
}

describe('WaitlistForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fall back to config fields when server schema is empty', () => {
    renderForm({
      settings: {
        signup_mode: 'waitlist',
        copy: {},
        metadata_schema: [],
      },
    });
    expect(screen.queryByText('Company')).not.toBeInTheDocument();
    expect(screen.queryByText('Note')).not.toBeInTheDocument();
  });

  it('prefers settings metadata schema over config fields', () => {
    renderForm({
      settings: {
        signup_mode: 'waitlist',
        copy: {},
        metadata_schema: [{ id: 'role', label: 'Role', type: 'text' }],
      },
    });
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.queryByText('Company')).not.toBeInTheDocument();
  });

  it('renders headline, subhead, and footer from defaults when settings are null', () => {
    renderForm();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      /join the waitlist/i
    );
    expect(
      screen.getByText(/rolling out access in batches/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/no spam/i)).toBeInTheDocument();
  });

  it('renders settings copy overrides', () => {
    renderForm({
      settings: {
        signup_mode: 'waitlist',
        copy: {
          waitlist: {
            headline: 'Reserve your spot',
            subhead: 'We onboard weekly.',
            submit_button_label: 'Reserve',
            footer_note: 'We email once.',
            success_message: 'You are on the list.',
          },
        },
        metadata_schema: [],
      },
    });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Reserve your spot'
    );
    expect(screen.getByText('We onboard weekly.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reserve' })).toBeInTheDocument();
    expect(screen.getByText('We email once.')).toBeInTheDocument();
  });

  it('applies className on the form and success views', async () => {
    const user = userEvent.setup();
    const { container } = renderForm({ className: 'custom-panel' });
    expect(container.firstChild).toHaveClass('custom-panel');

    await user.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-panel');
    });
  });

  it('shows validation error when email is empty or whitespace only', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /join waitlist/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /please enter your email/i
    );

    await user.type(screen.getByPlaceholderText('you@example.com'), '   ');
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /please enter your email/i
    );
  });

  it('renders text and textarea metadata fields and submits their values', async () => {
    const user = userEvent.setup();
    const { invoke } = renderForm({
      settings: {
        signup_mode: 'waitlist',
        copy: {},
        metadata_schema: [
          { id: 'company', label: 'Company', type: 'text', required: true },
          { id: 'note', label: 'Note', type: 'textarea', required: true },
        ],
      },
    });

    expect(screen.getByLabelText('Company')).toBeRequired();
    expect(screen.getByLabelText('Note')).toBeRequired();

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'join@example.com'
    );
    await user.type(screen.getByLabelText('Company'), 'Acme');
    await user.type(screen.getByLabelText('Note'), 'We build apps');

    await user.click(screen.getByRole('button', { name: /join waitlist/i }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('waitlist-capture', {
        body: {
          email: 'join@example.com',
          metadata: {
            company: 'Acme',
            note: 'We build apps',
          },
        },
      });
    });
  });

  it('uses config metadata fields when settings are null and hides hidden fields', async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByLabelText('Company')).toBeInTheDocument();
    expect(screen.getByLabelText('Note')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ref')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Company'), 'Acme Corp');
    expect(screen.getByLabelText('Company')).toHaveValue('Acme Corp');
  });

  it('merges captureMetadata into waitlist capture payload', async () => {
    const user = userEvent.setup();
    const { invoke } = renderForm({
      settings: {
        signup_mode: 'waitlist',
        copy: {},
        metadata_schema: [],
      },
      captureMetadata: { plan_interest: 'Pro' },
    });

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'join@example.com'
    );
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('waitlist-capture', {
        body: {
          email: 'join@example.com',
          metadata: { plan_interest: 'Pro' },
        },
      });
    });
  });

  it('submits email, emits lifecycle event, clears fields, and shows confirmation', async () => {
    const user = userEvent.setup();
    const { invoke } = renderForm({
      settings: {
        signup_mode: 'waitlist',
        copy: {},
        metadata_schema: [{ id: 'company', label: 'Company', type: 'text' }],
      },
    });

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'join@example.com'
    );
    await user.type(screen.getByLabelText('Company'), 'Acme');
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalled();
      expect(screen.getByText('Custom thanks')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    expect(emitLifecycleEventMock).toHaveBeenCalledWith('waitlist.joined', {
      email: 'join@example.com',
      metadata: { company: 'Acme' },
    });
  });

  it('shows loading label while submitting', async () => {
    const user = userEvent.setup();
    let resolveInvoke: (value: unknown) => void = () => {};
    const invoke = vi.fn(
      () =>
        new Promise(resolve => {
          resolveInvoke = resolve;
        })
    );

    render(
      <WaitlistForm
        supabase={{ functions: { invoke } } as never}
        config={config}
        settings={{
          signup_mode: 'waitlist',
          copy: {},
          metadata_schema: [],
        }}
      />
    );

    await user.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));

    expect(
      await screen.findByRole('button', { name: /submitting/i })
    ).toBeDisabled();

    resolveInvoke({ data: { message: 'Done' }, error: null });
    expect(await screen.findByText('Done')).toBeInTheDocument();
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
          copy: { waitlist: { success_message: 'Settings thanks' } },
          metadata_schema: [],
        }}
      />
    );
    await user.type(screen.getByPlaceholderText('you@example.com'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));
    expect(await screen.findByText('Settings thanks')).toBeInTheDocument();
  });

  it('shows error when invoke returns error', async () => {
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
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not save your signup/i
    );
  });

  it('shows error when submit throws', async () => {
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
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not save your signup/i
    );
  });
});
