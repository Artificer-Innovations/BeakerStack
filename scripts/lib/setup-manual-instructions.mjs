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
  return Boolean(e && typeof e === 'object' && 'name' in e && /** @type {{ name: string }} */ (e).name === 'SetupQuit');
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

/**
 * @param {LogCtx} ctx
 * @param {{ resumeFrom?: string; variant?: 'menu' }} [opts]
 */
export function printIntroBanner(ctx, opts = {}) {
  const resume = opts.resumeFrom;
  const isMenu = opts.variant === 'menu';
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
    'CI note: GitHub Actions only reads repository secrets (e.g. SUPABASE_ACCESS_TOKEN, EXPO_TOKEN, AWS keys)—not your local supabase/aws/eas CLI logins.',
  );
  logInfo('');
  logInfo('Before you run this wizard — required outside the repo for a complete setup:');
  logInfo('');
  logInfo('  GitHub');
  logInfo('    • Repo you can administer; branches develop (staging) and main (production) for workflows.');
  logInfo('    • For automated secret sync: gh CLI + gh auth login with permission to set Actions secrets/variables.');
  logInfo('');
  logInfo('  Supabase');
  logInfo('    • Account + organization; PAT (dashboard) or supabase login (prefer Terminal.app if IDE login fails).');
  logInfo('    • Plan to create or link preview, staging, and production projects + database passwords for CI link.');
  logInfo('');
  logInfo('  AWS');
  logInfo('    • Route 53 hosted zone for your apex domain.');
  logInfo('    • ACM certificate in us-east-1 covering apex + *.yourdomain (DNS validated).');
  logInfo('    • IAM credentials allowed to run the CloudFormation bootstrap (S3, CloudFront, etc.).');
  logInfo('');
  logInfo('  Expo');
  logInfo('    • Expo account; EAS project for apps/mobile; EXPO_TOKEN from expo.dev for CI.');
  logInfo('');
  logInfo('  Google OAuth / Firebase (for Google sign-in + mobile native config)');
  logInfo('    • OAuth clients (web/iOS/Android) and Supabase Auth Google provider + redirect URLs per env.');
  logInfo('    • google-services.json path ready if you import mobile keys in this wizard.');
  logInfo('');
  logInfo('Skim QUICKSTART.md; Actions names table: docs/reference/github-actions-secrets.md (npm run docs:actions-secrets).');
  logInfo('');
  logInfo('-'.repeat(72));
  logInfo('This wizard can:');
  logInfo('  • Optionally rebrand the template (display name + legal organization).');
  logInfo('  • Create or link Supabase projects and write keys to gitignored .env files.');
  logInfo('  • Optionally deploy the AWS PR-preview CloudFormation stack.');
  logInfo('  • Link or create an Expo (EAS) project and collect EXPO_TOKEN for CI.');
  logInfo('  • Optionally import google-services.json keys for mobile CI.');
  logInfo('  • Merge results into .env.local / .env.cloud.generated.local.');
  logInfo('  • Optionally push secrets and variables to GitHub Actions (gh).');
  logInfo('');
  logInfo('Also read: README.md, docs/pr-preview-setup.md, docs/supabase-staging-production-setup.md, docs/renaming.md');
  logInfo('');
  logInfo('If you skip every automated step, env files may stay empty until you complete manual steps.');
  logInfo('-'.repeat(72));
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
      'Also collects SUPABASE_ACCESS_TOKEN for GitHub Actions migrations.',
    ],
  },
  aws: {
    title: 'AWS CloudFormation (PR preview stack)',
    body: [
      'Runs scripts/pr-preview/bootstrap-aws-stack.sh to create/update the shared preview/staging/prod buckets and CloudFront.',
      'Prepare: apex domain in Route53; hosted zone ID and ACM certificate ARN in us-east-1 (apex + *.wildcard) can be auto-detected from the apex when they exist in the same AWS account.',
      'AWS credentials with CloudFormation + S3 + CloudFront + IAM.',
      'S3 bucket names are fixed as <apex>-prod, <apex>-staging, <apex>-deploy with Retain policies; if the stack was removed, leftover buckets block redeploy until you delete or empty them (CloudFormation early validation).',
      'If preflight detects conflicts, setup can skip AWS, continue deploy anyway, delete FAILED change sets, or run an interactive teardown of only those three buckets (not CloudFront).',
    ],
  },
  expo: {
    title: 'Expo / EAS',
    body: [
      'Ensures apps/mobile is not stuck on the template EAS project; may run eas init or link by UUID.',
      'Prepare: Expo account; run eas login in Terminal.app if the IDE terminal fails; EXPO_TOKEN for CI.',
      'After eas init, the script reads the new project id from apps/mobile/.eas/project.json (and app.config.ts), not only from CLI text.',
    ],
  },
  google: {
    title: 'Google Services (optional)',
    body: ['Imports GOOGLE_SERVICES_* from a google-services.json path for EAS/CI.', 'Prepare: path to the JSON file from Firebase / Google Cloud.'],
  },
  write: {
    title: 'Write env files',
    body: ['Merges collected keys into .env.cloud.generated.local and .env.local (gitignored).', 'No preparation.'],
  },
  github: {
    title: 'GitHub Actions sync',
    body: [
      'Uses gh to set repository secrets and variables from the manifest, merged with .env.local, .env.cloud.generated.local, and .env.aws.generated.local (wizard values override files on conflicts).',
      'If required CI keys are still missing, you can enter them here (masked where appropriate) or point at a dotenv file; they are merged into the gitignored env files then pushed to GitHub.',
      'Deploy and PR-preview workflows need AWS credentials, Supabase tokens/URLs, and PR preview domain/stack vars—not only Expo/Google; see docs/reference/github-actions-secrets.md (npm run docs:actions-secrets).',
      'Prepare: gh auth login; repo permission to configure Actions secrets.',
    ],
  },
};

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
    await rl.question(`Run "${phaseLabel}" now? (Y)es / (N)o skip / (Q)uit [Y]: `)
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
      logInfo('1. Run: npm run rename -- --from "<display-from>" --to "<display-to>" \\');
      logInfo('     --from-legal "<legal-from>" --to-legal "<legal-to>"');
      logInfo('2. Add --dry-run first to preview, then rerun without it.');
      logInfo('3. See docs/renaming.md');
      break;
    case 'supabase':
      logInfo('1. supabase login (use Terminal.app or: supabase login --token <PAT>)');
      logInfo('2. Create/link staging, production, and preview projects in the Supabase dashboard.');
      logInfo('3. Set STAGING_*, PRODUCTION_*, PREVIEW_*, PR_TESTING_*, SUPABASE_PREVIEW_* in .env.local / .env.cloud.generated.local');
      logInfo('4. Set GitHub secret SUPABASE_ACCESS_TOKEN and project refs/passwords per .github/workflows/*.yml');
      logInfo('5. supabase link + supabase db push per environment; see docs/supabase-staging-production-setup.md');
      break;
    case 'aws':
      logInfo('1. Issue ACM cert in us-east-1 (apex + wildcard); validate in Route53.');
      logInfo('2. Run from repo root:');
      logInfo(
        `   bash scripts/pr-preview/bootstrap-aws-stack.sh --domain YOUR_DOMAIN --hosted-zone-id ZONE \\`,
      );
      logInfo(
        `     --certificate-arn arn:aws:acm:us-east-1:…:certificate/… --stack-name beakerstack-pr-preview --region us-east-1 \\`,
      );
      logInfo(`     --preview-prefix pr- --env-file ${R}/.env.aws.generated.local`);
      logInfo('3. Map stack outputs to PR_PREVIEW_* / bucket env vars; set GitHub vars per workflows.');
      logInfo('4. See docs/pr-preview-setup.md');
      break;
    case 'expo':
      logInfo('1. cd apps/mobile && npx eas-cli login');
      logInfo('2. npx eas-cli init (or link an existing project UUID)');
      logInfo('3. If dynamic app.config.ts: set extra.eas.projectId, updates.url, and .eas/project.json');
      logInfo('4. Set EXPO_TOKEN, EXPO_PROJECT_ID, EXPO_ACCOUNT for GitHub (see workflows)');
      logInfo('5. https://docs.expo.dev/eas/');
      break;
    case 'google':
      logInfo('1. Obtain google-services.json from Firebase Console.');
      logInfo('2. Set each GOOGLE_SERVICES_* secret in GitHub or merge into .env.cloud.generated.local');
      break;
    case 'github':
      logInfo('1. gh auth login');
      logInfo('2. For each name in scripts/lib/setup-manifest.mjs: printf \'…\' | gh secret set NAME --repo OWNER/REPO');
      logInfo('3. gh variable set for PR_PREVIEW_* and EXPO_ACCOUNT per workflows');
      break;
    default:
      logInfo('(No extra manual text for this phase.)');
  }
  logInfo('');
}
