# Contributing

Thank you for helping improve Beaker Stack.

## What belongs upstream

**Welcome:** bug fixes, documentation, performance improvements to shared logic, opt-in integrations that fit the template’s architecture, and new publishable `@beakerstack/*` packages.

**Usually not upstream:** swapping core stack choices (e.g. Firebase instead of Supabase, Paddle instead of Stripe, Next.js instead of Vite). Those belong in **downstream forks** where you own the tradeoffs.

**Larger changes:** open a [Discussion](https://github.com/Artificer-Innovations/BeakerStack/discussions) first — especially features that affect every adopter’s fork or CI secrets. Link the Discussion in your PR.

Issues: use [GitHub Issues](https://github.com/Artificer-Innovations/BeakerStack/issues) with the appropriate template (bug vs feature). Questions and usage help fit Discussions (Q&A).

## Workflow

**Package manager:** This repo uses **npm** exclusively — `pnpm` and `yarn` are not supported. The `engines` field in `package.json` requires `npm >= 9.0.0` and all CI runs use `npm ci`. Both `pnpm-lock.yaml` and `yarn.lock` are listed in `.gitignore` to prevent accidental commits.

1. Create a branch from `develop` (or the branch your team uses for integration).
2. Make focused changes; match existing style, types, and test patterns.
3. Run checks locally:

   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

4. Open a pull request with a clear description of **what** changed and **why**.

## Commits and release notes

**Conventional commits** are required on the integration branch. [git-cliff](https://github.com/orhun/git-cliff) uses them for **template** CalVer release notes.

Examples:

- `feat: add usage summary to billing dashboard`
- `fix: correct PR preview redirect for trailing slash`
- `docs: clarify OAuth redirect URLs in OAUTH guide`
- `chore: bump Supabase CLI in CI`

**Template-only changes** (anything outside publishable `packages/*`) need a conventional commit only — no Changeset.

**Publishable package changes** (`@beakerstack/test-utils` today) require a Changeset — see below.

**Mixed PRs** (template + package): use a conventional commit message and include a Changeset if any publishable package files changed.

Versioning overview: [docs/VERSIONING.md](docs/VERSIONING.md).

## Pre-commit hook

The repository uses [lint-staged](https://github.com/lint-staged/lint-staged) and [Husky](https://typicode.github.io/husky/) to enforce code quality on every commit.

**What runs on every commit:**

- ESLint `--fix` + Prettier on staged `*.{ts,tsx,js,mjs,cjs}` files
- Prettier on staged `*.{json,md}` files

**What runs only when TypeScript files are staged:**

- `npm run type-check` — runs `tsc --noEmit` across all packages. This triggers `pretype-check` first, which builds `packages/shared` so downstream packages type-check against the latest types. Expect a few extra seconds on commits that touch `.ts`/`.tsx` files.

If the hook blocks your commit, fix the reported errors and re-commit. Do not use `--no-verify` to skip the hook.

## Pull requests

- Prefer small PRs over large mixed ones.
- **E2E (PRs targeting `develop`):** The `e2e` status check stays **pending** until web Maestro tests run and pass. They do not run on every push — after the PR is review-ready, ask @ZappoMan for approval or comment `run e2e tests`. New commits reset `e2e` to pending; re-trigger after fixing. See [docs/TESTING.md](docs/TESTING.md#e2e-in-ci-develop-prs).
- If you change `scripts/lib/setup-manifest.mjs`, run `npm run docs:actions-secrets` and commit updates to `docs/reference/github-actions-secrets.md`.
- If you add or change setup wizard prompts in `scripts/setup-full.mjs` or `scripts/lib/setup-manual-instructions.mjs`, update `docs/setup-prep-checklist.md`.
- Do not commit `.env*` files or real secrets.

## Branch flow and releases

Beaker Stack uses a two-stage branch flow:

- **Feature branches** → PR into `develop` (squash merge)
- **`develop`** → periodic promotion PR into `main` (merge commit, preserves feature history)
- **`main`** → triggers deploy workflows and, for changes to publishable packages, the npm release workflow

Feature branches should always target `develop`, never `main` directly. The `develop` → `main` promotion is done deliberately when the integrated state is ready for production.

### Promoting `develop` → `main`

1. Open a PR: `develop` → `main` using the [**Promote develop to main** template](.github/PULL_REQUEST_TEMPLATE/promote-develop-to-main.md) (GitHub UI: choose the template when opening the PR, or append `?template=promote-develop-to-main.md` to the compare URL). **CLI / agents:** follow [`.cursor/skills/promote-develop-to-main/SKILL.md`](.cursor/skills/promote-develop-to-main/SKILL.md) and use `gh pr create --base main --head develop --body-file <filled-promotion-body.md>` (`gh` has no `--template` flag).
2. Fill in **`## CalVer release notes`** (Summary, Highlights, Adopter notes). Content **above** the `---` separator is published on the CalVer GitHub Release; content below is maintainer-only.
3. Merge with **Create a merge commit** (not squash).
4. After production deploy, run the [**Release Template** workflow](.github/workflows/release-template.yml) on `main`. It copies the CalVer section from the merged promotion PR and appends a git-cliff changelog.

## Working with packages

Beaker Stack is a monorepo with two distribution models living side by side:

- **Apps** (`apps/web`, `apps/mobile`) — distributed through deploy pipelines (S3/CloudFront for web, EAS for mobile). Marked `"private": true` in their `package.json` to prevent accidental npm publish.
- **Packages** (`packages/*`) — shared code. Either kept internal (`"private": true`) or published to npm under the `@beakerstack/*` scope.

When adding new shared code, prefer creating a new workspace package under `packages/` rather than burying it inside `apps/`. Clear package boundaries make it easier to promote mature code to published `@beakerstack/*` packages later, and they improve code quality even for single-app use.

### Adding a changeset

Any PR that modifies a publishable `@beakerstack/*` package needs a changeset describing the change. Changesets drive version bumps and changelog entries.

From the repo root:

```bash
npx changeset
```

Follow the prompts:

- **Which packages changed?** Select the publishable package(s) this PR touches. Do not select `web`, `mobile-app`, or private packages — they are configured to be ignored.
- **Bump type?**
  - **Patch** — bug fixes, internal refactors, anything that does not change the public API. Default for pre-1.0 packages.
  - **Minor** — new backward-compatible features (new functions, optional parameters).
  - **Major** — breaking changes. Reserved for post-1.0 packages committed to API stability.
- **Summary** — one or two sentences describing the change, written as a changelog entry (e.g., `"Add foo() helper for bar use case"` or `"Fix baz crash when qux is null"`).

The command creates a markdown file under `.changeset/`. Commit it with your code changes.

To verify the changeset was recorded:

```bash
npx changeset status
```

### Release flow

Publishing happens automatically when changesets land on `main`:

1. Feature branch with a changeset merges to `develop` (squash).
2. `develop` promotes to `main` (merge commit).
3. The release workflow detects pending changesets and opens a **"chore: release packages"** PR against `main`. This PR contains: version bumps in affected `package.json` files, `CHANGELOG.md` updates, and the consumed changeset file(s) deleted.
4. Review the release PR. If correct, merge it (squash).
5. The release workflow runs again, this time publishing the bumped packages to npm and creating GitHub releases.

No manual `npm publish` is needed or expected. The workflow handles it.

### Creating a new publishable package

When extracting reusable code into a new `@beakerstack/*` package:

1. Create `packages/<name>/` with a `package.json` that includes:
   - Name: `@beakerstack/<name>`
   - Version: `0.0.0` (first changeset patch bump takes it to `0.0.1`)
   - `"publishConfig": { "access": "public" }`
   - Standard `main`, `module`, `types`, `exports`, `files` fields
2. Add source, tests, a README, and copy the root LICENSE.
3. From repo root, run `npm install` to wire the workspace.
4. Add a changeset for the initial release.
5. Follow the standard branch flow. The release workflow handles the first publish.

See `packages/test-utils/` for a minimal working example.

## Documentation

- **Canonical quick path:** [QUICKSTART.md](QUICKSTART.md).
- **Topic index:** [docs/README.md](docs/README.md).
- Before merging doc-only changes, run **`npm run docs:linkcheck`** (uses [markdown-link-check](https://github.com/tcort/markdown-link-check) with [.markdown-link-check.json](.markdown-link-check.json)).

## Template releases (maintainers)

CalVer template releases use [.github/workflows/release-template.yml](.github/workflows/release-template.yml). Release prose is written in the **`## CalVer release notes`** section of the merged `develop` → `main` promotion PR (see [.github/PULL_REQUEST_TEMPLATE/promote-develop-to-main.md](.github/PULL_REQUEST_TEMPLATE/promote-develop-to-main.md)). The workflow publishes that section plus a git-cliff changelog — no manual paste unless you use `skip_pr_body` or an old promotion PR without the section. See [.github/RELEASE_TEMPLATE.md](.github/RELEASE_TEMPLATE.md).

## Questions

Use [Discussions](https://github.com/Artificer-Innovations/BeakerStack/discussions) for usage questions and [Issues](https://github.com/Artificer-Innovations/BeakerStack/issues) for bugs. OAuth setup: [docs/OAUTH.md](docs/OAUTH.md).
