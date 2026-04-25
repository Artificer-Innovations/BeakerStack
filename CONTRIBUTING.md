# Contributing

Thank you for helping improve Beaker Stack.

## Workflow

1. Create a branch from `develop` (or the branch your team uses for integration).
2. Make focused changes; match existing style, types, and test patterns.
3. Run checks locally:

   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

4. Open a pull request with a clear description of **what** changed and **why**.

## Pull requests

- Prefer small PRs over large mixed ones.
- If you change `scripts/lib/setup-manifest.mjs`, run `npm run docs:actions-secrets` and commit updates to `docs/reference/github-actions-secrets.md`.
- Do not commit `.env*` files or real secrets.

## Branch flow and releases

Beaker Stack uses a two-stage branch flow:

- **Feature branches** → PR into `develop` (squash merge)
- **`develop`** → periodic promotion PR into `main` (merge commit, preserves feature history)
- **`main`** → triggers deploy workflows and, for changes to publishable packages, the npm release workflow

Feature branches should always target `develop`, never `main` directly. The `develop` → `main` promotion is done deliberately when the integrated state is ready for production.

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

## Questions

Use GitHub Issues or your team's usual channel. For OAuth-specific setup, start with [docs/oauth/README.md](docs/oauth/README.md).
