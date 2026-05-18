import { useEffect, useState } from 'react';
import {
  getAdminWaitlistSettings,
  updateAdminWaitlistSettings,
  type SignupMode,
  type WaitlistAdminSettings,
} from '@beakerstack/waitlist';
import { supabase } from '../../lib/supabase';
import { beakerstackBillingConfig } from '../../billing/beakerstackBillingConfig';

export default function AdminWaitlistSettingsPage() {
  const [settings, setSettings] = useState<WaitlistAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const data = await getAdminWaitlistSettings(supabase);
      setSettings(data);
      setLoading(false);
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateAdminWaitlistSettings(supabase, {
        signup_mode: settings.signup_mode,
        default_plan_id: settings.default_plan_id,
        invite_ttl_days: settings.invite_ttl_days,
        identity_match_mode: settings.identity_match_mode,
        copy: settings.copy,
      });
      if (!updated) throw new Error('Failed to save settings');
      setSettings(updated);
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
        <h2 className='text-2xl font-bold text-gray-900'>Waitlist settings</h2>
        <p className='mt-1 text-sm text-gray-600'>
          Control signup mode, invite TTL, and public copy without code changes.
        </p>
      </div>

      <form
        onSubmit={e => void handleSave(e)}
        className='mt-8 max-w-xl space-y-6'
      >
        <label className='block'>
          <span className='text-sm font-medium text-gray-700'>Signup mode</span>
          <select
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm'
            value={settings.signup_mode}
            onChange={e =>
              setSettings({
                ...settings,
                signup_mode: e.target.value as SignupMode,
              })
            }
          >
            <option value='open'>Open</option>
            <option value='waitlist'>Waitlist</option>
            <option value='invite_only'>Invite only</option>
            <option value='closed'>Closed</option>
          </select>
        </label>

        <label className='block'>
          <span className='text-sm font-medium text-gray-700'>
            Starting plan on invite signup
          </span>
          <select
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm'
            value={settings.default_plan_id}
            onChange={e =>
              setSettings({ ...settings, default_plan_id: e.target.value })
            }
          >
            {beakerstackBillingConfig.plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.displayName} ({p.id})
              </option>
            ))}
          </select>
        </label>

        <label className='block'>
          <span className='text-sm font-medium text-gray-700'>
            Invite TTL (days)
          </span>
          <input
            type='number'
            min={1}
            max={90}
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm'
            value={settings.invite_ttl_days}
            onChange={e =>
              setSettings({
                ...settings,
                invite_ttl_days: Number(e.target.value),
              })
            }
          />
        </label>

        <label className='block'>
          <span className='text-sm font-medium text-gray-700'>
            Identity match (OAuth email vs waitlist email)
          </span>
          <select
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm'
            value={settings.identity_match_mode}
            onChange={e =>
              setSettings({
                ...settings,
                identity_match_mode: e.target.value as 'lenient' | 'strict',
              })
            }
          >
            <option value='lenient'>Lenient (log warning)</option>
            <option value='strict'>Strict (block signup)</option>
          </select>
        </label>

        <label className='block'>
          <span className='text-sm font-medium text-gray-700'>
            Waitlist confirmation message
          </span>
          <textarea
            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm'
            rows={3}
            value={settings.copy?.waitlist?.confirmation ?? ''}
            onChange={e =>
              setSettings({
                ...settings,
                copy: {
                  ...settings.copy,
                  waitlist: {
                    ...settings.copy?.waitlist,
                    confirmation: e.target.value,
                  },
                },
              })
            }
          />
        </label>

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
          className='px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
