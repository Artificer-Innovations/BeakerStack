/**
 * Maps local .env keys to GitHub Actions secrets/variables used by workflows.
 * Values are never logged by the setup orchestrator.
 */

/** @typedef {{ type: 'secret'; name: string; envKeys: string[]; optional?: boolean; group?: string }} GhSecretDef */
/** @typedef {{ type: 'variable'; name: string; envKeys: string[]; optional?: boolean; group?: string }} GhVariableDef */

/** @type {GhSecretDef[]} */
export const GITHUB_SECRETS = [
  {
    type: 'secret',
    name: 'SUPABASE_ACCESS_TOKEN',
    envKeys: ['SUPABASE_ACCESS_TOKEN'],
    group: 'core',
  },
  {
    type: 'secret',
    name: 'AWS_ACCESS_KEY_ID',
    envKeys: ['AWS_ACCESS_KEY_ID'],
    group: 'aws',
  },
  {
    type: 'secret',
    name: 'AWS_SECRET_ACCESS_KEY',
    envKeys: ['AWS_SECRET_ACCESS_KEY'],
    group: 'aws',
  },
  {
    type: 'secret',
    name: 'AWS_SESSION_TOKEN',
    envKeys: ['AWS_SESSION_TOKEN'],
    optional: true,
    group: 'aws',
  },
  {
    type: 'secret',
    name: 'STAGING_SUPABASE_URL',
    envKeys: ['STAGING_SUPABASE_URL'],
    group: 'staging',
  },
  {
    type: 'secret',
    name: 'STAGING_SUPABASE_ANON_KEY',
    envKeys: ['STAGING_SUPABASE_ANON_KEY'],
    group: 'staging',
  },
  {
    type: 'secret',
    name: 'STAGING_SUPABASE_PROJECT_REF',
    envKeys: ['STAGING_SUPABASE_PROJECT_REF'],
    group: 'staging',
  },
  {
    type: 'secret',
    name: 'STAGING_SUPABASE_DB_PASSWORD',
    envKeys: ['STAGING_SUPABASE_DB_PASSWORD'],
    group: 'staging',
  },
  {
    type: 'secret',
    name: 'STAGING_STRIPE_SECRET_KEY',
    envKeys: ['STAGING_STRIPE_SECRET_KEY'],
    group: 'staging',
  },
  {
    type: 'secret',
    name: 'STAGING_STRIPE_WEBHOOK_SECRET',
    envKeys: ['STAGING_STRIPE_WEBHOOK_SECRET'],
    group: 'staging',
  },
  {
    type: 'secret',
    name: 'STAGING_BILLING_ALLOWED_ORIGINS',
    envKeys: ['STAGING_BILLING_ALLOWED_ORIGINS'],
    optional: true,
    group: 'staging',
  },
  {
    type: 'secret',
    name: 'PRODUCTION_SUPABASE_URL',
    envKeys: ['PRODUCTION_SUPABASE_URL'],
    group: 'production',
  },
  {
    type: 'secret',
    name: 'PRODUCTION_SUPABASE_ANON_KEY',
    envKeys: ['PRODUCTION_SUPABASE_ANON_KEY'],
    group: 'production',
  },
  {
    type: 'secret',
    name: 'PRODUCTION_SUPABASE_PROJECT_REF',
    envKeys: ['PRODUCTION_SUPABASE_PROJECT_REF'],
    group: 'production',
  },
  {
    type: 'secret',
    name: 'PRODUCTION_SUPABASE_DB_PASSWORD',
    envKeys: ['PRODUCTION_SUPABASE_DB_PASSWORD'],
    group: 'production',
  },
  {
    type: 'secret',
    name: 'PRODUCTION_STRIPE_SECRET_KEY',
    envKeys: ['PRODUCTION_STRIPE_SECRET_KEY'],
    group: 'production',
  },
  {
    type: 'secret',
    name: 'PRODUCTION_STRIPE_WEBHOOK_SECRET',
    envKeys: ['PRODUCTION_STRIPE_WEBHOOK_SECRET'],
    group: 'production',
  },
  {
    type: 'secret',
    name: 'PRODUCTION_BILLING_ALLOWED_ORIGINS',
    envKeys: ['PRODUCTION_BILLING_ALLOWED_ORIGINS'],
    optional: true,
    group: 'production',
  },
  {
    type: 'secret',
    name: 'PREVIEW_SUPABASE_URL',
    envKeys: ['PREVIEW_SUPABASE_URL', 'PR_TESTING_SUPABASE_URL'],
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'PREVIEW_SUPABASE_ANON_KEY',
    envKeys: ['PREVIEW_SUPABASE_ANON_KEY', 'PR_TESTING_SUPABASE_ANON_KEY'],
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'SUPABASE_PREVIEW_PROJECT_REF',
    envKeys: ['SUPABASE_PREVIEW_PROJECT_REF', 'PR_TESTING_SUPABASE_PROJECT_REF'],
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'SUPABASE_PREVIEW_DB_PASSWORD',
    envKeys: ['SUPABASE_PREVIEW_DB_PASSWORD'],
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'SUPABASE_PREVIEW_DB_URL',
    envKeys: ['SUPABASE_PREVIEW_DB_URL'],
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'PREVIEW_STRIPE_SECRET_KEY',
    envKeys: ['PREVIEW_STRIPE_SECRET_KEY'],
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'PREVIEW_STRIPE_WEBHOOK_SECRET',
    envKeys: ['PREVIEW_STRIPE_WEBHOOK_SECRET'],
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'PREVIEW_BILLING_ALLOWED_ORIGINS',
    envKeys: ['PREVIEW_BILLING_ALLOWED_ORIGINS'],
    optional: true,
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'PR_PREVIEW_CERTIFICATE_ARN',
    envKeys: ['PR_PREVIEW_CERTIFICATE_ARN'],
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'CLOUDFRONT_SIGNING_KEY',
    envKeys: ['CLOUDFRONT_SIGNING_KEY'],
    optional: true,
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'CLOUDFRONT_SIGNING_KEY_ID',
    envKeys: ['CLOUDFRONT_SIGNING_KEY_ID'],
    optional: true,
    group: 'preview',
  },
  {
    type: 'secret',
    name: 'EXPO_TOKEN',
    envKeys: ['EXPO_TOKEN'],
    group: 'expo',
  },
  {
    type: 'secret',
    name: 'EXPO_PROJECT_ID',
    envKeys: ['EXPO_PROJECT_ID'],
    group: 'expo',
  },
  {
    type: 'secret',
    name: 'GOOGLE_SERVICES_PROJECT_NUMBER',
    envKeys: ['GOOGLE_SERVICES_PROJECT_NUMBER'],
    optional: true,
    group: 'google',
  },
  {
    type: 'secret',
    name: 'GOOGLE_SERVICES_PROJECT_ID',
    envKeys: ['GOOGLE_SERVICES_PROJECT_ID'],
    optional: true,
    group: 'google',
  },
  {
    type: 'secret',
    name: 'GOOGLE_SERVICES_STORAGE_BUCKET',
    envKeys: ['GOOGLE_SERVICES_STORAGE_BUCKET'],
    optional: true,
    group: 'google',
  },
  {
    type: 'secret',
    name: 'GOOGLE_SERVICES_MOBILESDK_APP_ID',
    envKeys: ['GOOGLE_SERVICES_MOBILESDK_APP_ID'],
    optional: true,
    group: 'google',
  },
  {
    type: 'secret',
    name: 'GOOGLE_SERVICES_ANDROID_CLIENT_ID',
    envKeys: ['GOOGLE_SERVICES_ANDROID_CLIENT_ID'],
    optional: true,
    group: 'google',
  },
  {
    type: 'secret',
    name: 'GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH',
    envKeys: ['GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH'],
    optional: true,
    group: 'google',
  },
  {
    type: 'secret',
    name: 'GOOGLE_SERVICES_WEB_CLIENT_ID',
    envKeys: ['GOOGLE_SERVICES_WEB_CLIENT_ID'],
    optional: true,
    group: 'google',
  },
  {
    type: 'secret',
    name: 'GOOGLE_SERVICES_IOS_CLIENT_ID',
    envKeys: ['GOOGLE_SERVICES_IOS_CLIENT_ID'],
    optional: true,
    group: 'google',
  },
  {
    type: 'secret',
    name: 'GOOGLE_SERVICES_API_KEY',
    envKeys: ['GOOGLE_SERVICES_API_KEY'],
    optional: true,
    group: 'google',
  },
  {
    type: 'secret',
    name: 'LHCI_GITHUB_APP_TOKEN',
    envKeys: ['LHCI_GITHUB_APP_TOKEN'],
    optional: true,
    group: 'preview',
  },
];

/** CLI `--from=` shorthand → canonical phase id (see setup-full PHASE_ORDER). */
export const SETUP_FROM_PHASE_ALIASES = {
  gh: 'github',
};

/**
 * @param {string} phase raw `--from=` value
 * @returns {string}
 */
export function resolveSetupFromPhase(phase) {
  const p = String(phase ?? '').trim();
  return SETUP_FROM_PHASE_ALIASES[p] || p;
}

/** @type {GhVariableDef[]} */
export const GITHUB_VARIABLES = [
  {
    type: 'variable',
    name: 'PR_PREVIEW_DOMAIN',
    envKeys: ['PR_PREVIEW_DOMAIN'],
    group: 'preview',
  },
  {
    type: 'variable',
    name: 'PR_PREVIEW_HOSTED_ZONE_ID',
    envKeys: ['PR_PREVIEW_HOSTED_ZONE_ID'],
    group: 'preview',
  },
  {
    type: 'variable',
    name: 'PR_PREVIEW_STACK_NAME',
    envKeys: ['PR_PREVIEW_STACK_NAME'],
    group: 'preview',
  },
  {
    type: 'variable',
    name: 'PR_PREVIEW_PREFIX',
    envKeys: ['PR_PREVIEW_PREFIX'],
    optional: true,
    group: 'preview',
  },
  {
    type: 'variable',
    name: 'PR_PREVIEW_AWS_REGION',
    envKeys: ['PR_PREVIEW_AWS_REGION', 'AWS_REGION'],
    optional: true,
    group: 'aws',
  },
  {
    type: 'variable',
    name: 'EXPO_ACCOUNT',
    envKeys: ['EXPO_ACCOUNT'],
    group: 'expo',
  },
  {
    type: 'variable',
    name: 'MOBILE_ENABLED',
    envKeys: ['MOBILE_ENABLED'],
    optional: true,
    group: 'core',
  },
];

/** Env keys written by setup but not listed on GitHub secret defs (local generated env only). */
const EXTRA_MERGEABLE_ENV_KEYS = [
  'STAGING_SUPABASE_SERVICE_ROLE_KEY',
  'PRODUCTION_SUPABASE_SERVICE_ROLE_KEY',
  'PREVIEW_SUPABASE_SERVICE_ROLE_KEY',
  'PR_TESTING_SUPABASE_SERVICE_ROLE_KEY',
];

/**
 * Keys allowed when merging a dotenv-style secret file or paste into setup `acc`.
 * @returns {Set<string>}
 */
export function mergeableSetupEnvKeys() {
  /** @type {Set<string>} */
  const keys = new Set();
  for (const def of GITHUB_SECRETS) {
    for (const k of def.envKeys) keys.add(k);
  }
  for (const def of GITHUB_VARIABLES) {
    for (const k of def.envKeys) keys.add(k);
  }
  for (const k of EXTRA_MERGEABLE_ENV_KEYS) keys.add(k);
  return keys;
}

/**
 * @param {Record<string, string>} env
 * @param {GhSecretDef | GhVariableDef} def
 */
export function resolveValueForGithub(env, def) {
  for (const key of def.envKeys) {
    const v = env[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

const MOBILE_GROUPS = new Set(['expo', 'google']);

/**
 * @param {Record<string, string>} env
 * @param {string} [group] if set, only entries with this group
 */
export function collectGithubSecretPayload(env, group) {
  /** @type {Record<string, string>} */
  const out = {};
  const mobileDisabled = env.MOBILE_ENABLED === 'false';
  for (const def of GITHUB_SECRETS) {
    if (group && def.group !== group) continue;
    if (mobileDisabled && MOBILE_GROUPS.has(def.group)) continue;
    const val = resolveValueForGithub(env, def);
    if (!val && def.optional) continue;
    if (val) out[def.name] = val;
  }
  return out;
}

/**
 * @param {Record<string, string>} env
 * @param {string} [group]
 */
export function collectGithubVariablePayload(env, group) {
  /** @type {Record<string, string>} */
  const out = {};
  const mobileDisabled = env.MOBILE_ENABLED === 'false';
  for (const def of GITHUB_VARIABLES) {
    if (group && def.group !== group) continue;
    if (mobileDisabled && MOBILE_GROUPS.has(def.group)) continue;
    const val = resolveValueForGithub(env, def);
    if (!val && def.optional) continue;
    if (val) out[def.name] = val;
  }
  return out;
}

/**
 * Merge gitignored env layers for GitHub sync: local, then cloud, then AWS bootstrap file;
 * values already in `session` (wizard `acc`) win on key conflicts.
 * @param {Record<string, string>} session
 * @param {Record<string, string>} local
 * @param {Record<string, string>} cloud
 * @param {Record<string, string>} aws
 * @returns {Record<string, string>}
 */
export function mergeGithubSyncEnv(session, local, cloud, aws) {
  const s = session && typeof session === 'object' ? session : {};
  const l = local && typeof local === 'object' ? local : {};
  const c = cloud && typeof cloud === 'object' ? cloud : {};
  const a = aws && typeof aws === 'object' ? aws : {};
  return { ...l, ...c, ...a, ...s };
}

/**
 * Non-optional manifest entries with no resolved value (names only; for CI completeness warnings).
 * @param {Record<string, string>} env
 * @returns {{ kind: 'secret' | 'variable'; name: string; group: string }[]}
 */
export function listMissingRequiredGithubForCi(env) {
  /** @type {{ kind: 'secret' | 'variable'; name: string; group: string }[]} */
  const missing = [];
  const mobileDisabled = env.MOBILE_ENABLED === 'false';
  for (const def of GITHUB_SECRETS) {
    if (def.optional) continue;
    if (mobileDisabled && MOBILE_GROUPS.has(def.group)) continue;
    if (resolveValueForGithub(env, def)) continue;
    missing.push({ kind: 'secret', name: def.name, group: def.group || 'unknown' });
  }
  for (const def of GITHUB_VARIABLES) {
    if (def.optional) continue;
    if (mobileDisabled && MOBILE_GROUPS.has(def.group)) continue;
    if (resolveValueForGithub(env, def)) continue;
    missing.push({ kind: 'variable', name: def.name, group: def.group || 'unknown' });
  }
  return missing;
}

/** Sort order for prompting missing CI env keys before GitHub sync. */
const GITHUB_CI_DETAIL_GROUP_ORDER = /** @type {Record<string, number>} */ ({
  core: 0,
  aws: 1,
  staging: 2,
  production: 3,
  preview: 4,
  expo: 5,
  google: 6,
});

/**
 * Missing required defs with manifest metadata (primary env file key for prompts).
 * @param {Record<string, string>} env
 * @returns {{ kind: 'secret' | 'variable'; name: string; group: string; primaryEnvKey: string; envKeys: string[]; def: GhSecretDef | GhVariableDef }[]}
 */
export function listMissingRequiredGithubCiDetails(env) {
  const missing = listMissingRequiredGithubForCi(env);
  /** @type {{ kind: 'secret' | 'variable'; name: string; group: string; primaryEnvKey: string; envKeys: string[]; def: GhSecretDef | GhVariableDef }[]} */
  const out = [];
  for (const m of missing) {
    /** @type {GhSecretDef | GhVariableDef | undefined} */
    const def =
      m.kind === 'secret' ? GITHUB_SECRETS.find((d) => d.name === m.name) : GITHUB_VARIABLES.find((d) => d.name === m.name);
    if (!def || !def.envKeys.length) continue;
    out.push({
      kind: m.kind,
      name: m.name,
      group: m.group,
      primaryEnvKey: def.envKeys[0],
      envKeys: [...def.envKeys],
      def,
    });
  }
  out.sort((a, b) => {
    const ra = GITHUB_CI_DETAIL_GROUP_ORDER[a.group] ?? 99;
    const rb = GITHUB_CI_DETAIL_GROUP_ORDER[b.group] ?? 99;
    if (ra !== rb) return ra - rb;
    if (a.kind !== b.kind) return a.kind === 'secret' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

/** AWS bootstrap output keys -> env.example style keys */
export const AWS_BOOTSTRAP_TO_ENV = {
  PROD_BUCKET_NAME: 'PRODUCTION_S3_BUCKET',
  PROD_DISTRIBUTION_ID: 'PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID',
  STAGING_BUCKET_NAME: 'STAGING_S3_BUCKET',
  STAGING_DISTRIBUTION_ID: 'STAGING_CLOUDFRONT_DISTRIBUTION_ID',
  DEPLOY_BUCKET_NAME: 'WEB_BUCKET',
  DEPLOY_DISTRIBUTION_ID: 'CLOUDFRONT_DISTRIBUTION_ID',
  PR_PREVIEW_WEBSITE_BUCKET: 'PR_PREVIEW_WEBSITE_BUCKET',
  PR_PREVIEW_DISTRIBUTION_ID: 'PR_PREVIEW_DISTRIBUTION_ID',
  PR_PREVIEW_PREFIX: 'PR_PREVIEW_PREFIX',
};
