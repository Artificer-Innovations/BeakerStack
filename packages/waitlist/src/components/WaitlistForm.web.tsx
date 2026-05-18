import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WaitlistConfig } from '../schema.js';
import { emitLifecycleEvent } from '../lifecycle.js';
import { resolveWaitlistSignupCopy } from '../waitlistSignupCopy.js';
import type { WaitlistPublicSettings } from '../types.js';
import { resolveWaitlistFormMetadataFields } from '../waitlistUseCaseField.js';

export interface WaitlistFormProps {
  supabase: SupabaseClient;
  config: WaitlistConfig;
  settings: WaitlistPublicSettings | null;
  /** Merged into capture metadata (e.g. plan interest from pricing CTA). */
  captureMetadata?: Record<string, string>;
  className?: string;
}

export function WaitlistForm({
  supabase,
  config,
  settings,
  captureMetadata,
  className = '',
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = resolveWaitlistSignupCopy(settings?.copy, config.copy);

  const visibleFields = resolveWaitlistFormMetadataFields(settings, config);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        config.captureFunctionName,
        {
          body: {
            email: trimmed,
            metadata: { ...captureMetadata, ...metadata },
          },
        }
      );

      if (fnErr) {
        setError(
          'We could not save your signup right now. Please try again in a moment.'
        );
        return;
      }

      const body = data as { message?: string } | null;
      setSuccessMessage(body?.message ?? copy.success_message);
      await emitLifecycleEvent('waitlist.joined', {
        email: trimmed,
        metadata,
      });
      setEmail('');
      setMetadata({});
    } catch {
      setError(
        'We could not save your signup right now. Please try again in a moment.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <h2 className='text-center text-3xl font-extrabold text-gray-900 dark:text-white md:text-left'>
            {copy.headline}
          </h2>
        </div>
        <div
          className='rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20'
          role='status'
        >
          <p className='text-sm font-medium text-green-800 dark:text-green-300'>
            {successMessage}
          </p>
          <p className='mt-3 text-sm text-gray-600 dark:text-gray-400'>
            {copy.footer_note}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className='text-center text-3xl font-extrabold text-gray-900 dark:text-white md:text-left'>
          {copy.headline}
        </h2>
        <p className='mt-2 text-center text-sm text-gray-600 dark:text-gray-400 md:text-left'>
          {copy.subhead}
        </p>
      </div>

      <form className='space-y-4' onSubmit={e => void handleSubmit(e)}>
        <div>
          <label
            htmlFor='waitlist-email'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
          >
            Email
          </label>
          <input
            id='waitlist-email'
            type='email'
            autoComplete='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            className='w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 sm:text-sm'
            placeholder='you@example.com'
            disabled={loading}
          />
        </div>

        {visibleFields.length > 0
          ? visibleFields.map(field => (
              <div key={field.id}>
                <label
                  htmlFor={`waitlist-${field.id}`}
                  className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
                >
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={`waitlist-${field.id}`}
                    value={metadata[field.id] ?? ''}
                    onChange={e =>
                      onMetadataChange(
                        field.id,
                        e.target.value,
                        metadata,
                        setMetadata
                      )
                    }
                    className='w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 sm:text-sm'
                    rows={3}
                    disabled={loading}
                    required={field.required === true}
                  />
                ) : (
                  <input
                    id={`waitlist-${field.id}`}
                    type='text'
                    value={metadata[field.id] ?? ''}
                    onChange={e =>
                      onMetadataChange(
                        field.id,
                        e.target.value,
                        metadata,
                        setMetadata
                      )
                    }
                    className='w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 sm:text-sm'
                    disabled={loading}
                    required={field.required === true}
                  />
                )}
              </div>
            ))
          : null}

        {error ? (
          <p className='text-sm text-red-600 dark:text-red-400' role='alert'>
            {error}
          </p>
        ) : null}

        <button
          type='submit'
          disabled={loading}
          className='w-full rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {loading ? 'Submitting…' : copy.submit_button_label}
        </button>

        <p className='text-center text-xs text-gray-500 dark:text-gray-400 md:text-left'>
          {copy.footer_note}
        </p>
      </form>
    </div>
  );
}

function onMetadataChange(
  id: string,
  value: string,
  metadata: Record<string, string>,
  setMetadata: (m: Record<string, string>) => void
) {
  setMetadata({ ...metadata, [id]: value });
}
