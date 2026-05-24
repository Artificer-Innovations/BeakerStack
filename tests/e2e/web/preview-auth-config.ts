import { readFileSync, writeFileSync } from 'node:fs';
import { e2eAuthDir, isPreviewTarget } from './env';

const MANAGEMENT_API = 'https://api.supabase.com/v1/projects';

type AuthConfigResponse = {
  rate_limit_email_sent?: number;
  mailer_autoconfirm?: boolean;
};

type PatchedAuthField<K extends keyof AuthConfigResponse> = {
  before: AuthConfigResponse[K];
  after: NonNullable<AuthConfigResponse[K]>;
};

type PreviewAuthSnapshot = {
  projectRef: string;
  rate_limit_email_sent?: PatchedAuthField<'rate_limit_email_sent'>;
  mailer_autoconfirm?: PatchedAuthField<'mailer_autoconfirm'>;
};

const snapshotPath = `${e2eAuthDir}/preview-auth-config.snapshot.json`;

const E2E_EMAIL_RATE_LIMIT = 100;

function getManagementCredentials(): {
  token: string;
  projectRef: string;
} | null {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef = process.env.SUPABASE_PREVIEW_PROJECT_REF?.trim();
  if (!token || !projectRef) {
    return null;
  }
  return { token, projectRef };
}

async function fetchAuthConfig(
  token: string,
  projectRef: string
): Promise<AuthConfigResponse> {
  const response = await fetch(`${MANAGEMENT_API}/${projectRef}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to read preview auth config (${response.status}): ${body}`
    );
  }

  return (await response.json()) as AuthConfigResponse;
}

async function patchAuthConfig(
  token: string,
  projectRef: string,
  patch: Partial<AuthConfigResponse>
): Promise<void> {
  const response = await fetch(`${MANAGEMENT_API}/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to patch preview auth config (${response.status}): ${body}`
    );
  }
}

/** Relax hosted preview auth limits so signup/reset UI tests do not hit email quotas. */
export async function preparePreviewAuthForE2e(): Promise<void> {
  if (!isPreviewTarget()) {
    return;
  }

  const credentials = getManagementCredentials();
  if (!credentials) {
    console.warn(
      '[e2e] Skipping preview auth relax: SUPABASE_ACCESS_TOKEN or SUPABASE_PREVIEW_PROJECT_REF not set'
    );
    return;
  }

  const { token, projectRef } = credentials;
  const current = await fetchAuthConfig(token, projectRef);

  const snapshot: PreviewAuthSnapshot = { projectRef };
  const patch: Partial<AuthConfigResponse> = {};

  const desiredRateLimit = Math.max(
    current.rate_limit_email_sent ?? 2,
    E2E_EMAIL_RATE_LIMIT
  );
  if (desiredRateLimit !== current.rate_limit_email_sent) {
    snapshot.rate_limit_email_sent = {
      before: current.rate_limit_email_sent,
      after: desiredRateLimit,
    };
    patch.rate_limit_email_sent = desiredRateLimit;
  }

  if (current.mailer_autoconfirm !== true) {
    snapshot.mailer_autoconfirm = {
      before: current.mailer_autoconfirm,
      after: true,
    };
    patch.mailer_autoconfirm = true;
  }

  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  if (Object.keys(patch).length === 0) {
    return;
  }

  await patchAuthConfig(token, projectRef, patch);
}

/** Restore preview auth settings captured during global setup. */
export async function restorePreviewAuthAfterE2e(): Promise<void> {
  if (!isPreviewTarget()) {
    return;
  }

  const credentials = getManagementCredentials();
  if (!credentials) {
    return;
  }

  let snapshot: PreviewAuthSnapshot;
  try {
    snapshot = JSON.parse(
      readFileSync(snapshotPath, 'utf8')
    ) as PreviewAuthSnapshot;
  } catch {
    return;
  }

  if (snapshot.projectRef !== credentials.projectRef) {
    return;
  }

  const patch: Partial<AuthConfigResponse> = {};
  if (snapshot.rate_limit_email_sent) {
    patch.rate_limit_email_sent = snapshot.rate_limit_email_sent.before;
  }
  if (snapshot.mailer_autoconfirm) {
    patch.mailer_autoconfirm = snapshot.mailer_autoconfirm.before;
  }

  if (Object.keys(patch).length === 0) {
    return;
  }

  try {
    await patchAuthConfig(credentials.token, credentials.projectRef, patch);
  } catch (error) {
    console.warn(
      `[e2e] Failed to restore preview auth config: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
