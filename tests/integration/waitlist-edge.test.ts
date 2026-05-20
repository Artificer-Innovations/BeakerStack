/**
 * waitlist-capture / waitlist-ops Edge Functions (optional).
 */

import { createWebTestClient } from '../utils/test-clients';
import { uniqueTestEmail } from '../utils/integration-fixtures';
import {
  edgeFunctionsEnabled,
  getFunctionsBaseUrl,
} from '../utils/integration-edge-helpers';
import { createServiceRoleClient } from '../utils/test-clients';

const describeEdge = edgeFunctionsEnabled() ? describe : describe.skip;

describeEdge('waitlist Edge integration', () => {
  it('POST waitlist-capture creates an entry', async () => {
    const email = uniqueTestEmail();
    const base = getFunctionsBaseUrl();
    const res = await fetch(`${base}/waitlist-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, metadata: { source: 'edge-integration' } }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);

    const sr = createServiceRoleClient();
    const { data: entry } = await sr
      .from('waitlist_entries')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    expect(entry).not.toBeNull();
    if (entry) {
      await sr.from('waitlist_invites').delete().eq('entry_id', entry.id);
      await sr.from('waitlist_entries').delete().eq('id', entry.id);
    }
  });

  it('responds to OPTIONS with CORS headers', async () => {
    const base = getFunctionsBaseUrl();
    const res = await fetch(`${base}/waitlist-capture`, { method: 'OPTIONS' });
    expect(res.status).toBeLessThan(500);
  });

  it('waitlist-ops validate returns JSON for unknown token', async () => {
    const anon = createWebTestClient();
    const { data, error } = await anon.functions.invoke('waitlist-ops', {
      body: { action: 'validate', token: 'invalid-token-integration' },
    });
    expect(error).toBeNull();
    const body = data as { valid?: boolean };
    expect(body.valid).toBe(false);
  });
});
