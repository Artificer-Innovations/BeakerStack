import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WaitlistConfig } from '../schema.js';
import { emitLifecycleEvent } from '../lifecycle.js';
import type {
  WaitlistMetadataField,
  WaitlistPublicSettings,
} from '../types.js';

export interface WaitlistFormProps {
  supabase: SupabaseClient;
  config: WaitlistConfig;
  settings: WaitlistPublicSettings | null;
  className?: string;
}

export function WaitlistForm({
  supabase,
  config,
  settings,
  className = '',
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields: WaitlistMetadataField[] = settings?.metadata_schema?.length
    ? (settings.metadata_schema as WaitlistMetadataField[])
    : config.metadataFields;

  const confirmation =
    settings?.copy?.['waitlist']?.['confirmation'] ??
    config.copy?.['waitlist']?.['confirmation'] ??
    "Thanks — you're on the list.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

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
            metadata,
          },
        }
      );

      if (fnErr) {
        setMessage(confirmation);
        return;
      }

      const body = data as { message?: string } | null;
      setMessage(body?.message ?? confirmation);
      await emitLifecycleEvent('waitlist.joined', {
        email: trimmed,
        metadata,
      });
      setEmail('');
      setMetadata({});
    } catch {
      setMessage(confirmation);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={e => void handleSubmit(e)} className={className}>
      {fields.length > 0
        ? fields
            .filter(f => f.type !== 'hidden')
            .map(field => (
              <div key={field.id} className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={metadata[field.id] ?? ''}
                    onChange={e =>
                      onMetadataChange(
                        field.id,
                        e.target.value,
                        metadata,
                        setMetadata
                      )
                    }
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800'
                    rows={3}
                  />
                ) : (
                  <input
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
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800'
                  />
                )}
              </div>
            ))
        : null}
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
        Email
      </label>
      <input
        type='email'
        autoComplete='email'
        value={email}
        onChange={e => setEmail(e.target.value)}
        className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        placeholder='you@example.com'
        disabled={loading}
      />
      {error ? (
        <p className='mt-2 text-sm text-red-600 dark:text-red-400' role='alert'>
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className='mt-4 text-sm text-green-700 dark:text-green-400'
          role='status'
        >
          {message}
        </p>
      ) : null}
      <button
        type='submit'
        disabled={loading}
        className='mt-4 w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-md'
      >
        {loading ? 'Submitting…' : 'Join waitlist'}
      </button>
    </form>
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
