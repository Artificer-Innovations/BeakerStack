# Upgrading

This guide covers how to pull BeakerStack changes into a fork you have already set up. See [VERSIONING.md](VERSIONING.md) for how template tags and package versions work.

## Prerequisites

Add the BeakerStack repo as an upstream remote if you have not already:

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
3. Run `npm run type-check && npm run test` to catch regressions before pushing.
