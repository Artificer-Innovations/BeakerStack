# Versioning

Beaker Stack uses **two parallel versioning schemes**: CalVer for the monorepo **template**, and semver for **npm packages**. They are intentional and serve different consumers.

| Distribution | Version format                      | How it ships                                           | Release notes                                                             |
| ------------ | ----------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| **Template** | CalVer `YYYY.NNN` (e.g. `2026.001`) | Git tag on `main`, GitHub Release, "Use this template" | [git-cliff](https://github.com/orhun/git-cliff) from conventional commits |
| **Packages** | semver `MAJOR.MINOR.PATCH`          | npm (`@beakerstack/*`)                                 | Changesets → package CHANGELOG + GitHub Release                           |

Template release notes: [GitHub Releases](https://github.com/Artificer-Innovations/BeakerStack/releases). There is no hand-maintained root `CHANGELOG.md`; use Releases for "what's new."

---

## Template releases — `YYYY.NNN`

Template releases are **monorepo snapshot tags** on `main`. A tag like `2026.003` means: _this is what Beaker Stack looked like at that point in time, and it is a good base to fork from._

Tags use **CalVer with a zero-padded sequence number** within the year:

```
2026.001   first release of 2026
2026.002   second release of 2026
2026.013   thirteenth release of 2026
```

`NNN` increments arbitrarily — there is no meaning to how much time passes between releases.

### Why CalVer for the template

Fork-based templates do not have a single linear "installed version" in the npm sense. Consumers copy the repo and diverge immediately. **"Breaking change" is fuzzy** when the unit of adoption is a fork, not a dependency pin. CalVer tags answer: _"what snapshot am I based on, and when was it cut?"_ without implying semver compatibility across unrelated forks.

### Root `package.json` version

The root package is `"private": true` and is **not published to npm**. Its `"version"` field (`2026.1.0` today) is a semver-shaped mirror of the latest template tag (`2026.001`) for tooling that expects a version string. **The canonical template version is the git tag**, not `package.json`.

### What counts as a breaking change

A template release is **breaking** if adopters who have forked the template need to take manual action before upgrading. That includes:

- A new required GitHub Actions secret or repository variable
- A renamed or removed secret / variable that CI depends on
- A changed top-level folder structure (e.g. a directory moved or renamed)
- A changed setup script behavior (flags renamed, phases reordered, outputs changed)
- A new migration step needed to align an existing fork with the updated baseline

Breaking changes are called out explicitly in the release notes generated for that tag.

### `main` vs. tagged releases

| Ref        | What it is          | Recommended for                                                     |
| ---------- | ------------------- | ------------------------------------------------------------------- |
| `main`     | Current stable HEAD | Following along with active development                             |
| `2026.NNN` | Snapshot tag        | Starting a new fork; upgrading an existing fork in a controlled way |

If you are forking Beaker Stack to build a product, start from a tagged release so your upgrade story is clear from day one.

### Pulling template updates into a fork

See [UPGRADING.md](UPGRADING.md). Expect merge conflicts when you have customized shared files; release notes list manual steps (secrets, migrations, script flags). Template tags do not auto-update forks — you merge or cherry-pick deliberately.

---

## Package releases — semver

`@beakerstack/*` packages published to npm use standard **semantic versioning**. Each package is versioned independently via [Changesets](https://github.com/changesets/changesets). Release notes for package versions appear on each package's GitHub Release and in `packages/*/CHANGELOG.md` after publish.

### Why semver for packages

npm consumers expect semver. Patch/minor/major communicate API and behavior expectations for **dependencies**, which is a different contract than "whole template snapshot."

### Published vs. in-template today

| Package                     | npm status                             | Notes                                                                                                                    |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `@beakerstack/test-utils`   | **Published on npm** (`0.0.1` today)   | Workspace `package.json` may stay `0.0.0` until the Changesets release PR merges; pending `.changeset/` files are normal |
| `@beakerstack/billing`      | **In template only** (`private: true`) | Use via workspace; npm publish planned                                                                                   |
| `@beakerstack/shared`       | **In template only** (`private: true`) | Ignored in Changesets until publish is intentional                                                                       |
| `@beakerstack/shared-tests` | Internal                               | Not published                                                                                                            |

Infrastructure for npm publish (Changesets, `NPM_TOKEN`, build on `main`) is in place. Only packages removed from `.changeset/config.json` `ignore` and marked non-private with `publishConfig` will ship to npm.

### How template and package releases interact

- A **template tag** may ship at a point in time when package folders contain certain code, but the tag does not version those packages for npm.
- **Package releases** can happen independently when changesets merge to `main`, without a new CalVer tag.
- A template release **may** coincide with bumping in-repo package versions, but adopters who only use the template via fork care about the **CalVer tag**; adopters who `npm install @beakerstack/*` care about **package semver**.

---

## Cutting releases (maintainers)

| Kind            | Trigger                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Template CalVer | Manual: [release-template.yml](../.github/workflows/release-template.yml) — paste prose from [RELEASE_TEMPLATE.md](../.github/RELEASE_TEMPLATE.md) above git-cliff output |
| npm packages    | Push to `main` with pending changesets → Changesets "chore: release packages" PR → merge → publish                                                                        |

Commits on the template must use **conventional commits** (`feat:`, `fix:`, etc.) so git-cliff can group release notes. Changes under publishable `packages/*` require `npx changeset` in the PR. See [CONTRIBUTING.md](../CONTRIBUTING.md).
