/**
 * Intro banner, per-phase intros, skip confirmations, and manual fallback text for setup-full.
 */

/** @typedef {{ logInfo: (s: string) => void; logWarn: (s: string) => void; repoRoot: string }} LogCtx */

/** User chose to exit the entire wizard from a prompt. */
export class SetupQuit extends Error {
  constructor() {
    super('Setup quit by user');
    this.name = 'SetupQuit';
  }
}

/**
 * @param {unknown} e
 * @returns {boolean}
 */
export function isSetupQuit(e) {
  return Boolean(
    e &&
    typeof e === 'object' &&
    'name' in e &&
    /** @type {{ name: string }} */ (e).name === 'SetupQuit'
  );
}

const BANNER_W = 72;

function horiz(ch = '=') {
  return `+${ch.repeat(BANNER_W - 2)}+`;
}

/**
 * @param {string} text
 */
function bannerRow(text) {
  const inner = BANNER_W - 2;
  const t = String(text);
  if (t.length >= inner) {
    return `+${t.slice(0, inner)}+`;
  }
  const pad = inner - t.length;
  const l = Math.floor(pad / 2);
  const r = pad - l;
  return `+${' '.repeat(l)}${t}${' '.repeat(r)}+`;
}

/** @typedef {'full' | 'brief'} SetupGuideLevel */

/**
 * @param {(s: string) => void} logInfo
 */
function printExternalPrerequisites(logInfo) {
  logInfo(
    'Before you run this wizard — required outside the repo for a complete setup:'
  );
  logInfo('');
  logInfo('  GitHub');
  logInfo(
    '    • Repo you can administer; branches develop (staging) and main (production) for workflows.'
  );
  logInfo(
    '    • For automated secret sync: gh CLI + gh auth login with permission to set Actions secrets/variables.'
  );
  logInfo('');
  logInfo('  Supabase');
  logInfo(
    '    • Account + organization; PAT (dashboard) or supabase login (prefer Terminal.app if IDE login fails).'
  );
  logInfo(
    '    • Plan to create or link preview, staging, and production projects + database passwords for CI link.'
  );
  logInfo('');
  logInfo('  AWS');
  logInfo('    • Route 53 hosted zone for your apex domain.');
  logInfo(
    '    • ACM certificate in us-east-1 covering apex + *.yourdomain (DNS validated).'
  );
  logInfo(
    '    • IAM credentials allowed to run the CloudFormation bootstrap (S3, CloudFront, etc.).'
  );
  logInfo('');
  logInfo('  Expo');
  logInfo(
    '    • Expo account; EAS project for apps/mobile; EXPO_TOKEN from expo.dev for CI.'
  );
  logInfo('');
  logInfo(
    '  Google OAuth / Firebase (for Google sign-in + mobile native config)'
  );
  logInfo(
    '    • OAuth clients (web/iOS/Android) and Supabase Auth Google provider + redirect URLs per env.'
  );
  logInfo(
    '    • google-services.json path ready if you import mobile keys in this wizard.'
  );
}

/**
 * @param {(s: string) => void} logInfo
 * @param {{ brief: boolean }} opts
 */
function printGuidePointers(logInfo, opts) {
  if (opts.brief) {
    logInfo(
      'Before you run this wizard — read docs/setup-prep-checklist.md (prompts, one-time secrets, post-wizard work).'
    );
    logInfo(
      'For the in-terminal GitHub / Supabase / AWS / Expo checklist: npm run setup:full -- --guide=full'
    );
    logInfo(
      'Short account checklist: QUICKSTART.md §6.4. Actions secret names: docs/reference/github-actions-secrets.md'
    );
  } else {
    printExternalPrerequisites(logInfo);
    logInfo('');
    logInfo(
      'Also see docs/setup-prep-checklist.md for every wizard prompt and one-time secrets.'
    );
    logInfo(
      'Short account checklist: QUICKSTART.md §6.4. Actions secret names: docs/reference/github-actions-secrets.md'
    );
  }
}

/**
 * @param {(s: string) => void} logInfo
 */
function printWizardCapabilities(logInfo) {
  logInfo('-'.repeat(72));
  logInfo('This wizard can:');
  logInfo(
    '  • Optionally rebrand the template (display name + legal organization).'
  );
  logInfo(
    '  • Create or link Supabase projects and write keys to gitignored .env files.'
  );
  logInfo('  • Optionally deploy the AWS PR-preview CloudFormation stack.');
  logInfo(
    '  • Link or create an Expo (EAS) project and collect EXPO_TOKEN for CI.'
  );
  logInfo('  • Optionally import google-services.json keys for mobile CI.');
  logInfo('  • Merge results into .env.local / .env.cloud.generated.local.');
  logInfo('  • Optionally push secrets and variables to GitHub Actions (gh).');
  logInfo('');
  logInfo(
    'Also read: README.md, docs/pr-preview-setup.md, docs/preview-access-control.md (optional signed cookies), docs/renaming.md'
  );
  logInfo('');
  logInfo(
    'If you skip every automated step, env files may stay empty until you complete manual steps.'
  );
  logInfo('-'.repeat(72));
}

/**
 * @param {LogCtx} ctx
 * @param {{ resumeFrom?: string; variant?: 'menu'; guide?: SetupGuideLevel }} [opts]
 */
export function printIntroBanner(ctx, opts = {}) {
  const resume = opts.resumeFrom;
  const isMenu = opts.variant === 'menu';
  const guide = opts.guide ?? (resume ? 'brief' : 'full');
  const brief = guide === 'brief';
  const { logInfo } = ctx;

  console.log('');
  console.log(horiz('='));
  if (isMenu) {
    console.log(bannerRow(''));
    console.log(bannerRow('BeakerStack'));
    console.log(bannerRow(''));
    console.log(bannerRow('Choose (1) local setup or (2) full cloud wizard.'));
    console.log(bannerRow(''));
    console.log(horiz('='));
    console.log('');
    return;
  }
  if (resume) {
    console.log(bannerRow(''));
    console.log(bannerRow('BeakerStack — resuming setup'));
    console.log(bannerRow(`--from=${resume}`));
    console.log(bannerRow(''));
    console.log(horiz('='));
    console.log('');
    return;
  }

  console.log(bannerRow(''));
  console.log(bannerRow('BeakerStack'));
  console.log(bannerRow('Full environment setup'));
  console.log(bannerRow(''));
  console.log(horiz('='));
  console.log('');

  logInfo(
    'CI note: GitHub Actions only reads repository secrets (e.g. SUPABASE_ACCESS_TOKEN, EXPO_TOKEN, AWS keys)—not your local supabase/aws/eas CLI logins.'
  );
  logInfo('');
  printGuidePointers(logInfo, { brief });
  logInfo('');
  printWizardCapabilities(logInfo);
  logInfo('');
}

const PHASE_INTROS = {
  prereqs: {
    title: 'Prerequisites',
    body: [
      'Checks Node/npm and reports whether supabase, aws, and gh CLIs are installed.',
      'Nothing to prepare; install missing CLIs when prompted.',
    ],
  },
  identity: {
    title: 'Template rebrand (rename)',
    body: [
      'Runs npm run rename to replace the template display name and optional legal organization string across the repo.',
      'Current names are read from packages/shared branding and package.json author; you only enter the new display name (and optional new legal name).',
      'Tip: use --dry-run on rename first via npm run rename -- --dry-run …',
      'Risk: touches many files — review git diff after.',
    ],
  },
  supabase: {
    title: 'Supabase (staging / production / preview)',
    body: [
      'Creates or selects remote Supabase projects and fetches anon + service keys (not printed).',
      'Prepare: Supabase CLI auth (PASTE token or SUPABASE_ACCESS_TOKEN; avoid embedded supabase login in IDE).',
      'After all tiers: prompts for account personal access token (SUPABASE_ACCESS_TOKEN) for GitHub Actions — not project anon/service keys.',
    ],
  },
  aws: {
    title: 'AWS CloudFormation (PR preview stack)',
    body: [
      'Creates/updates S3 + CloudFront for production, staging, and PR previews (bootstrap-aws-stack.sh).',
      'If you choose Yes, a full prerequisites checklist prints next — Route53, ACM cert, AWS CLI login.',
    ],
  },
  expo: {
    title: 'Expo / EAS',
    body: [
      'Links apps/mobile to your Expo project and collects EXPO_TOKEN for CI (EAS Update / Build).',
      'If you choose Yes, a prerequisites checklist prints next — account, project link vs create, access token.',
    ],
  },
  google: {
    title: 'Google Services (optional)',
    body: [
      'Imports google-services.json into GOOGLE_SERVICES_* keys for mobile CI (EAS Build / Update).',
      'If you choose Yes, a prerequisites checklist prints next — optional; press Enter to skip.',
    ],
  },
  write: {
    title: 'Write env files',
    body: [
      'Merges collected keys into .env.cloud.generated.local and .env.local (gitignored).',
      'No preparation.',
    ],
  },
  github: {
    title: 'GitHub Actions sync',
    body: [
      'Pushes secrets/variables to GitHub from merged .env files + values collected earlier in this run.',
      'If you choose Yes, a prerequisites checklist prints next — gh auth, what may still be missing, and prompts.',
    ],
  },
};

/**
 * Prerequisites checklist shown after you confirm the AWS phase (before bootstrap runs).
 * @param {LogCtx} ctx
 */
export function printAwsPhaseReadinessBriefing(ctx) {
  const { logInfo } = ctx;
  const doc = 'docs/pr-preview-setup.md#before-the-aws-wizard-phase';
  logInfo('');
  logInfo('── Before AWS bootstrap runs ──');
  logInfo('');
  logInfo(
    'Complete these in the AWS account you will use (same account as `aws sts get-caller-identity`):'
  );
  logInfo('');
  logInfo('1) Apex domain in Route 53');
  logInfo(
    '   • You own a domain (e.g. example.com) with a **public** Route 53 hosted zone for that apex.'
  );
  logInfo(
    '   • If the domain is registered elsewhere, its NS records must point at that hosted zone.'
  );
  logInfo(
    '   • The wizard can auto-detect the zone ID when it exists in this account.'
  );
  logInfo('');
  logInfo('2) TLS certificate in ACM (required for CloudFront)');
  logInfo(
    '   • Region: **us-east-1 only** (CloudFront requirement — not your stack region choice).'
  );
  logInfo(
    '   • Request a certificate for the **apex** and ***.apex** (e.g. example.com + *.example.com).'
  );
  logInfo(
    '   • Validation: **DNS** in Route 53; status must be **Issued** before bootstrap.'
  );
  logInfo(
    '   • The wizard can auto-detect the certificate ARN when one matches.'
  );
  logInfo('');
  logInfo('3) AWS credentials on this machine (for the wizard right now)');
  logInfo(
    '   • `aws sts get-caller-identity` must succeed (IAM access keys via `aws configure`, or SSO profile).'
  );
  logInfo(
    '   • IAM needs CloudFormation, S3, CloudFront, Route 53, ACM (read), and IAM pass-role for the stack.'
  );
  logInfo(
    '   • This is separate from GitHub Actions deploy keys (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in github phase).'
  );
  logInfo('');
  logInfo('4) Know your apex domain name');
  logInfo(
    '   • You will type it when prompted (e.g. example.com — no https://, no path).'
  );
  logInfo('');
  logInfo(
    'During bootstrap the wizard may ask for stack name, region, and preview URL prefix (defaults are fine).'
  );
  logInfo(
    'S3 buckets are named <apex>-prod, <apex>-staging, <apex>-deploy. Leftover buckets from a'
  );
  logInfo(
    'removed stack can block redeploy; preflight may offer skip, continue, or destructive cleanup.'
  );
  logInfo('');
  logInfo(`Full checklist and rotation notes: ${doc}`);
  logInfo('');
}

/**
 * Prerequisites checklist shown after you confirm the Expo phase.
 * @param {LogCtx} ctx
 */
export function printExpoPhaseReadinessBriefing(ctx) {
  const { logInfo } = ctx;
  const doc = 'docs/MOBILE_BUILD_TESTING.md#before-the-expo-wizard-phase';
  logInfo('');
  logInfo('── Before Expo / EAS setup runs ──');
  logInfo('');
  logInfo(
    'This phase wires apps/mobile to **your** Expo account (not the template BeakerStack project).'
  );
  logInfo('');
  logInfo('1) Expo account');
  logInfo('   • Sign in at https://expo.dev (personal or org account).');
  logInfo(
    '   • `eas whoami` should work after login — use Terminal.app if the IDE terminal hangs on `eas login`.'
  );
  logInfo('');
  logInfo('2) EAS project for this app (choose during setup)');
  logInfo(
    '   • **[l] Link** — paste **Project ID** UUID (expo.dev → Projects → your app → Project settings).'
  );
  logInfo(
    '   •     apps/mobile uses dynamic app.config.js — eas init may exit 1; setup patches projectId for you.'
  );
  logInfo(
    '   • **[n] New** — run `eas init` to create a project under your account (wizard patches app.config.js + .eas/project.json).'
  );
  logInfo(
    '   • **[s] Skip** — web-only repo or mobile later (`--skip-mobile` skips this entire phase).'
  );
  logInfo(
    '   • The template EAS project id is removed — do not keep the shipped BeakerStack project id.'
  );
  logInfo('');
  logInfo('3) Expo access token for GitHub Actions (end of this phase)');
  logInfo(
    '   • Type: **Access token** at https://expo.dev/settings/access-tokens (automation / CI — not your password).'
  );
  logInfo(
    '   • Stored as GitHub secret **EXPO_TOKEN** for PR preview OTA, staging/production mobile deploys, and `eas build` in CI.'
  );
  logInfo(
    '   • Also collected: **EXPO_PROJECT_ID**, **EXPO_ACCOUNT** (variable) from your linked project.'
  );
  logInfo(
    '   • Copy the token when created — you cannot view it again. Rotate: see doc below.'
  );
  logInfo('');
  logInfo(
    '4) Optional next phase: google-services.json (Firebase) for native Google Sign-In in mobile CI builds.'
  );
  logInfo('');
  logInfo(`Full checklist, scopes, and rotation: ${doc}`);
  logInfo('');
}

/**
 * Prerequisites checklist shown after you confirm the Google phase.
 * @param {LogCtx} ctx
 */
export function printGooglePhaseReadinessBriefing(ctx) {
  const { logInfo } = ctx;
  const doc = 'docs/MOBILE_BUILD_TESTING.md#before-the-google-wizard-phase';
  const oauthDoc = 'docs/OAUTH.md';
  logInfo('');
  logInfo('── Before Google Services import (optional) ──');
  logInfo('');
  logInfo(
    'This phase is **optional**. Press Enter at the path prompt with blank to skip.'
  );
  logInfo('');
  logInfo('What it is for:');
  logInfo(
    '  • **Native Android Google Sign-In** in mobile CI builds (EAS), not web OAuth in the browser.'
  );
  logInfo(
    '  • The wizard reads **google-services.json** and stores **GOOGLE_SERVICES_*** for GitHub Actions.'
  );
  logInfo(
    '  • Web + Supabase Google OAuth (client id/secret in Supabase) is separate — see OAUTH.md.'
  );
  logInfo('');
  logInfo('If you want mobile Google Sign-In in CI, have ready:');
  logInfo('');
  logInfo('1) Firebase / Google Cloud project');
  logInfo(
    '   • https://console.firebase.google.com (or link an existing GCP project).'
  );
  logInfo(
    '   • Register an **Android** app whose package name matches apps/mobile (see app.config.js `android.package`).'
  );
  logInfo(
    '   • Default template package: **com.anonymous.beakerstack** (change after `npm run rename`).'
  );
  logInfo('');
  logInfo('2) Download google-services.json');
  logInfo(
    '   • Firebase Console → your project → Project settings (gear) → **Your apps** → Android app'
  );
  logInfo(
    '   • Download **google-services.json** (not the OAuth client JSON from GCP Credentials alone).'
  );
  logInfo(
    '   • Know the full path on disk (e.g. ~/Downloads/google-services.json).'
  );
  logInfo('');
  logInfo('3) What the wizard does');
  logInfo(
    '   • Parses the file and fills GOOGLE_SERVICES_PROJECT_*, *_CLIENT_ID, API_KEY, etc.'
  );
  logInfo(
    '   • Values sync to GitHub in the **github** phase (optional secrets in manifest).'
  );
  logInfo(
    '   • CI can regenerate apps/mobile/google-services.json from those secrets during deploy.'
  );
  logInfo('');
  logInfo(
    'Skip if: web-only repo, no native Google login yet, or you will add secrets later (`--from=google` or github phase).'
  );
  logInfo('');
  logInfo(`Full steps: ${doc}`);
  logInfo(`Supabase / web Google OAuth (different credentials): ${oauthDoc}`);
  logInfo('');
}

/**
 * Prerequisites checklist shown after you confirm the GitHub sync phase.
 * @param {LogCtx} ctx
 */
export function printGithubPhaseReadinessBriefing(ctx) {
  const { logInfo } = ctx;
  const secretsDoc = 'docs/reference/github-actions-secrets.md';
  logInfo('');
  logInfo('── Before GitHub Actions sync ──');
  logInfo('');
  logInfo(
    'This phase uses the **GitHub CLI** (`gh`) to set repository **secrets** and **variables**'
  );
  logInfo('from values in this wizard run and your gitignored .env files.');
  logInfo('');
  logInfo('1) Which repository? (read this before Yes)');
  logInfo(
    '   • Secrets go to **`gh repo view`** in this folder — usually `git remote origin`.'
  );
  logInfo(
    '   • **Adopters:** fork BeakerStack, clone **your** fork, then sync — not the upstream template.'
  );
  logInfo(
    '   • If `origin` is Artificer-Innovations/BeakerStack, you will get an extra type-to-confirm warning.'
  );
  logInfo('   • Override: `--github-repo=youruser/YourRepo`');
  logInfo('');
  logInfo('2) GitHub CLI + permissions');
  logInfo(
    '   • Install https://cli.github.com and run `gh auth login` (HTTPS or SSH).'
  );
  logInfo(
    '   • Your user needs **admin** on the target repo (manage Actions secrets/variables).'
  );
  logInfo('');
  logInfo('3) What gets synced (from earlier phases + .env files)');
  logInfo('   • **Core:** SUPABASE_ACCESS_TOKEN');
  logInfo(
    '   • **AWS:** AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (+ optional session token)'
  );
  logInfo(
    '   • **Supabase tiers:** staging / production / preview URLs, keys, project refs, DB passwords'
  );
  logInfo(
    '   • **PR preview:** PR_PREVIEW_* domain, hosted zone, stack name, certificate ARN, etc.'
  );
  logInfo(
    '   • **Stripe (if set):** STAGING_*, PRODUCTION_*, PREVIEW_* Stripe keys + webhook secrets'
  );
  logInfo(
    '   • **Mobile (if enabled):** EXPO_TOKEN, EXPO_PROJECT_ID, EXPO_ACCOUNT, GOOGLE_SERVICES_*'
  );
  logInfo('');
  logInfo('4) If you skipped earlier phases');
  logInfo(
    '   • Missing values are listed and you can paste them now (masked for secrets).'
  );
  logInfo(
    '   • Skipped **expo** / **google** but still want web-only CI? Set MOBILE_ENABLED=false (variable) when prompted,'
  );
  logInfo('     or re-run setup with `--skip-mobile`.');
  logInfo(
    '   • Skipped **AWS** or **Supabase**? Add secrets manually later or re-run `--from=aws` / `--from=supabase`.'
  );
  logInfo('');
  logInfo('5) During this phase');
  logInfo('   • `gh auth login` if needed');
  logInfo('   • Optional: path to a .env file to bulk-import missing keys');
  logInfo(
    '   • Per-key prompts for anything still missing → then `gh secret set` / `gh variable set`'
  );
  logInfo('   • Nothing is printed to the terminal except secret **names**');
  logInfo('');
  logInfo('6) Skip entirely');
  logInfo(
    '   • Answer **N** at Run github now, use `--skip-github`, or set secrets in GitHub Settings manually.'
  );
  logInfo('');
  logInfo(
    `Full name list (generated): ${secretsDoc}  (npm run docs:actions-secrets)`
  );
  logInfo(
    'Post-wizard: Stripe webhooks, OAuth providers — docs/stripe-billing-setup.md, docs/OAUTH.md'
  );
  logInfo('');
}

/**
 * @param {LogCtx} ctx
 * @param {string} phaseId
 */
export function printPhaseIntro(ctx, phaseId) {
  const { logInfo } = ctx;
  const block = PHASE_INTROS[phaseId];
  if (!block) return;
  logInfo('');
  logInfo(`── ${block.title} ──`);
  for (const line of block.body) {
    logInfo(`  ${line}`);
  }
  logInfo('');
}

/**
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {string} phaseLabel
 * @returns {Promise<'run' | 'skip'>}
 */
export async function confirmRunPhase(rl, phaseLabel) {
  const a = (
    await rl.question(
      `Run "${phaseLabel}" now? (Y)es / (N)o skip / (Q)uit [Y]: `
    )
  )
    .trim()
    .toLowerCase();
  if (a === 'q' || a === 'quit' || a === 'exit' || a === 'x') {
    throw new SetupQuit();
  }
  if (a === 'n' || a === 'no' || a === 'skip' || a === 's') {
    return 'skip';
  }
  return 'run';
}

/**
 * @param {LogCtx} ctx
 * @param {string} phaseId
 */
export function printManualInstructions(ctx, phaseId) {
  const { logInfo } = ctx;
  const R = ctx.repoRoot;
  logInfo('');
  logInfo(`══ Manual steps (you skipped: ${phaseId}) ══`);
  switch (phaseId) {
    case 'identity':
      logInfo(
        '1. Run: npm run rename -- --from "<display-from>" --to "<display-to>" \\'
      );
      logInfo('     --from-legal "<legal-from>" --to-legal "<legal-to>"');
      logInfo('2. Add --dry-run first to preview, then rerun without it.');
      logInfo('3. See docs/renaming.md');
      break;
    case 'supabase':
      logInfo(
        '1. supabase login (use Terminal.app or: supabase login --token <PAT>)'
      );
      logInfo(
        '2. Create/link staging, production, and preview projects in the Supabase dashboard.'
      );
      logInfo(
        '3. Set STAGING_*, PRODUCTION_*, PREVIEW_*, PR_TESTING_*, SUPABASE_PREVIEW_* in .env.local / .env.cloud.generated.local'
      );
      logInfo(
        '4. Set GitHub secret SUPABASE_ACCESS_TOKEN and project refs/passwords per .github/workflows/*.yml'
      );
      logInfo(
        '5. supabase link + supabase db push per environment; see docs/supabase-staging-production-setup.md'
      );
      break;
    case 'aws':
      logInfo(
        '1. Issue ACM cert in us-east-1 (apex + wildcard); validate in Route53.'
      );
      logInfo('2. Run from repo root:');
      logInfo(
        `   bash scripts/pr-preview/bootstrap-aws-stack.sh --domain YOUR_DOMAIN --hosted-zone-id ZONE \\`
      );
      logInfo(
        `     --certificate-arn arn:aws:acm:us-east-1:…:certificate/… --stack-name beakerstack-pr-preview --region us-east-1 \\`
      );
      logInfo(
        `     --preview-prefix pr- --env-file ${R}/.env.aws.generated.local`
      );
      logInfo(
        '3. Map stack outputs to PR_PREVIEW_* / bucket env vars; set GitHub vars per workflows.'
      );
      logInfo('4. See docs/pr-preview-setup.md');
      break;
    case 'expo':
      logInfo('1. cd apps/mobile && npx eas-cli login');
      logInfo('2. npx eas-cli init (or link an existing project UUID)');
      logInfo(
        '3. If dynamic app.config.js: set extra.eas.projectId, updates.url, and .eas/project.json'
      );
      logInfo(
        '4. Set EXPO_TOKEN, EXPO_PROJECT_ID, EXPO_ACCOUNT for GitHub (see workflows)'
      );
      logInfo('5. https://docs.expo.dev/eas/');
      break;
    case 'google':
      logInfo(
        '1. Download google-services.json from Firebase (Android app matching your package name).'
      );
      logInfo('2. Re-run: npm run setup:full -- --from=google');
      logInfo(
        '3. Or set GOOGLE_SERVICES_* GitHub secrets manually — see docs/reference/github-actions-secrets.md'
      );
      logInfo(
        '4. See docs/MOBILE_BUILD_TESTING.md#before-the-google-wizard-phase'
      );
      break;
    case 'github':
      logInfo('1. gh auth login with admin on the repository');
      logInfo(
        '2. Set secrets/variables per docs/reference/github-actions-secrets.md'
      );
      logInfo('3. Or re-run: npm run setup:full -- --from=github');
      logInfo('4. See docs/setup-prep-checklist.md (github section)');
      break;
    default:
      logInfo('(No extra manual text for this phase.)');
  }
  logInfo('');
}
