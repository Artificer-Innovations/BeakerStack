# Upgrading

This guide covers how to pull Beaker Stack changes into a fork you have already set up. See [VERSIONING.md](VERSIONING.md) for how template tags and package versions work.

## Prerequisites

Add the Beaker Stack repo as an upstream remote if you have not already:

```bash
git remote add upstream https://github.com/Artificer-Innovations/BeakerStack.git
```

---

## Option A — Upgrade to a full template snapshot

Use this when you want to pull in everything from a specific tagged release as a single merge commit.

```bash
# Fetch upstream commits and tags (tags land as local refs, not as upstream/TAG)
git fetch upstream --tags

# Merge the snapshot tag into your branch
git merge 2026.003
```

> **"Use this template" users:** If you created your repo using GitHub's "Use this template" button, git treats the histories as unrelated. Your first merge will need `--allow-unrelated-histories`:
>
> ```bash
> git merge --allow-unrelated-histories 2026.003
> ```
>
> Subsequent merges work without the flag.

Resolve any conflicts, then review the release notes for that tag on GitHub for any breaking changes that need manual follow-up (new secrets, renamed variables, migration steps).

## Option B — Cherry-pick specific changes

Use this when you only want selected commits, not the full snapshot:

```bash
git fetch upstream
git log upstream/main --oneline  # find the commit(s) you want
git cherry-pick <sha>
```

## Option C — Upgrade an individual `@beakerstack/*` package

Use this when a package dependency has shipped a new version and you want to update it in isolation:

```bash
npm install @beakerstack/billing@x.y.z
```

Read the package's GitHub Release notes for that version — package release notes describe what changed at the API level, not the broader template context.

---

## After any upgrade

1. Re-run `npm install` to sync lockfile.
2. Check the release notes for any new required GitHub Actions secrets or variables.
3. Run `npm run upgrade:check` to verify adopter zone wiring (`.gitattributes`, config bootstrap).
4. Run `npm run type-check && npm run test` to catch regressions before pushing.

## Adopter-owned zones

Fork customization lives under `adopter/` — see [CUSTOMIZING.md](CUSTOMIZING.md). `.gitattributes` sets `adopter/** merge=ours` so upstream merges keep your product code.

| Zone              | Path                                  |
| ----------------- | ------------------------------------- |
| Config & identity | `adopter/config/`                     |
| Marketing content | `adopter/content/`, `adopter/assets/` |
| Your app UI       | `adopter/web/`, `adopter/mobile/`     |
| Your DB schema    | `adopter/db/`                         |

After pulling template migrations (`supabase db push`), apply adopter DDL:

```bash
npm run db:init-adopter
npm run db:apply-adopter
```

Production deploy workflows run `db:apply-adopter -- --linked` after `supabase db push`.

## Reusable workflow pins

Forks may add a thin wrapper that calls the template reusable workflow:

```yaml
jobs:
  adopter:
    uses: Artificer-Innovations/BeakerStack/.github/workflows/adopter-tests-reusable.yml@v2026.NNN
```

Bump the `@v` tag when upgrading to a template release that changes the reusable workflow inputs.

## `@beakerstack/shared` major migration (v2)

If upgrading across the adopter-zones release:

| Removed                                                | Replacement                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `BRANDING` from `@beakerstack/shared/config/branding`  | `getAdopterConfig().branding` or `@adopter/config/branding` |
| `LEGAL_CONFIG` from `@beakerstack/shared/config/legal` | `getAdopterConfig().legal` or `@adopter/config/legal`       |
| `HOME_TITLE` constant                                  | `getHomeTitle()` after `configureAdopter()`                 |

Call `configureAdopter(adopterConfig)` in app entry points before rendering shared components.
