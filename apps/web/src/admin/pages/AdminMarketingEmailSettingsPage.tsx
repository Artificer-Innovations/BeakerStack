import { useEffect, useState } from 'react';
import {
  getAdminMarketingEmailSettings,
  updateAdminMarketingEmailSettings,
  getAdminMarketingEmailQueueStats,
  NAMESPACE_RE,
  type MarketingEmailAdminSettings,
  type MarketingEmailQueueStats,
} from '@beakerstack/marketing-email';
import { supabase } from '../../lib/supabase';
import { MARKETING_EMAIL_PRODUCT_ID } from '../../marketing-email/beakerstackMarketingEmailConfig';

export default function AdminMarketingEmailSettingsPage() {
  const [settings, setSettings] =
    useState<MarketingEmailAdminSettings | null>(null);
  const [stats, setStats] = useState<MarketingEmailQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tierTagNamesInput, setTierTagNamesInput] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [data, statsData] = await Promise.all([
        getAdminMarketingEmailSettings(supabase, MARKETING_EMAIL_PRODUCT_ID),
        getAdminMarketingEmailQueueStats(supabase),
      ]);
      if (data) {
        setSettings(data);
        setTierTagNamesInput(data.config.tierTagNames.join(', '));
      } else {
        setSettings({
          product_id: MARKETING_EMAIL_PRODUCT_ID,
          enabled: false,
          provider: 'kit',
          config: { namespace: '', kitFormId: '', tierTagNames: [] },
          updated_at: '',
        });
        setTierTagNamesInput('');
      }
      setStats(statsData);
      setLoading(false);
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const tierTagNames = tierTagNamesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const config = { ...settings.config, tierTagNames };

    if (!config.namespace || !NAMESPACE_RE.test(config.namespace)) {
      setError(
        'Namespace is required and must be lowercase letters, digits, and hyphens starting with a letter.'
      );
      return;
    }
    if (!config.kitFormId.trim()) {
      setError('Kit form ID is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateAdminMarketingEmailSettings(supabase, {
        product_id: settings.product_id,
        enabled: settings.enabled,
        config,
      });
      if (!updated) throw new Error('Failed to save settings');
      setSettings(updated);
      setTierTagNamesInput(updated.config.tierTagNames.join(', '));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className='flex justify-center py-12'>
        <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-gray-900'>
          Marketing email settings
        </h2>
        <p className='mt-1 text-sm text-gray-600'>
          Configure the Kit integration for subscriber sync and manage the
          sync queue.
        </p>
      </div>

      {stats ? (
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
          {(
            [
              { label: 'Pending', key: 'pending', color: 'text-yellow-700' },
              {
                label: 'Processing',
                key: 'processing',
                color: 'text-blue-700',
              },
              { label: 'Done', key: 'done', color: 'text-green-700' },
              { label: 'Failed', key: 'failed', color: 'text-red-700' },
            ] as const
          ).map(({ label, key, color }) => (
            <div
              key={key}
              className='rounded-lg border border-gray-200 p-4 text-center'
            >
              <p className={`text-2xl font-bold ${color}`}>{stats[key]}</p>
              <p className='mt-1 text-xs text-gray-500'>{label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={e => void handleSave(e)}
        className='mt-8 max-w-xl space-y-6'
      >
        <fieldset className='space-y-4 rounded-lg border border-gray-200 p-4'>
          <legend className='px-1 text-sm font-semibold text-gray-900'>
            Integration
          </legend>

          <label className='flex items-center gap-3'>
            <input
              type='checkbox'
              className='h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
              checked={settings.enabled}
              onChange={e =>
                setSettings({ ...settings, enabled: e.target.checked })
              }
            />
            <span className='text-sm text-gray-700'>
              Enable marketing email sync
            </span>
          </label>
          {!settings.enabled ? (
            <p className='text-xs text-amber-700'>
              When disabled, new events are enqueued but not synced to Kit.
              Pending queue rows are not dropped — they will be processed when
              re-enabled.
            </p>
          ) : null}
        </fieldset>

        <fieldset className='space-y-4 rounded-lg border border-gray-200 p-4'>
          <legend className='px-1 text-sm font-semibold text-gray-900'>
            Kit configuration
          </legend>

          <label className='block'>
            <span className='text-sm font-medium text-gray-700'>
              Namespace
            </span>
            <p className='text-xs text-gray-500'>
              Lowercase letters, digits, and hyphens — e.g.{' '}
              <code>my-product</code>. Used as a tag prefix in Kit.
            </p>
            <input
              type='text'
              className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm'
              value={settings.config.namespace}
              onChange={e =>
                setSettings({
                  ...settings,
                  config: { ...settings.config, namespace: e.target.value },
                })
              }
            />
          </label>

          <label className='block'>
            <span className='text-sm font-medium text-gray-700'>
              Kit form ID
            </span>
            <p className='text-xs text-gray-500'>
              The Kit form or sequence ID subscribers are added to on signup.
            </p>
            <input
              type='text'
              className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm'
              value={settings.config.kitFormId}
              onChange={e =>
                setSettings({
                  ...settings,
                  config: { ...settings.config, kitFormId: e.target.value },
                })
              }
            />
          </label>

          <label className='block'>
            <span className='text-sm font-medium text-gray-700'>
              Tier tag names{' '}
              <span className='font-normal text-gray-400'>(optional)</span>
            </span>
            <p className='text-xs text-gray-500'>
              Comma-separated plan slugs used as Kit subscriber tags for
              tier_changed events — e.g. <code>pro, max</code>. Required for
              tier sync.
            </p>
            <input
              type='text'
              className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm'
              value={tierTagNamesInput}
              onChange={e => setTierTagNamesInput(e.target.value)}
            />
          </label>
        </fieldset>

        {error ? (
          <p className='text-sm text-red-600' role='alert'>
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className='text-sm text-green-700' role='status'>
            Settings saved.
          </p>
        ) : null}

        <button
          type='submit'
          disabled={saving}
          className='rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50'
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
