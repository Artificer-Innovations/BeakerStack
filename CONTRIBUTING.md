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

## Documentation

- **Canonical quick path:** [QUICKSTART.md](QUICKSTART.md).
- **Topic index:** [docs/README.md](docs/README.md).
- Before merging doc-only changes, run **`npm run docs:linkcheck`** (uses [markdown-link-check](https://github.com/tcort/markdown-link-check) with [.markdown-link-check.json](.markdown-link-check.json)).

## Questions

Use GitHub Issues or your team’s usual channel. For OAuth-specific setup, start with [docs/oauth/README.md](docs/oauth/README.md).
