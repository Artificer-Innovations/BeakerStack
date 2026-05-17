---
name: promote-develop-to-main
description: >-
  Open a production promotion pull request from develop to main with a complete
  CalVer release notes section (Summary, Highlights, Adopter notes). Use when the
  user asks to promote develop to main, create a develop→main PR, production
  promotion, release promotion PR, or cut a CalVer release candidate.
---

# Promote develop → main

Create a **high-quality `develop` → `main` promotion PR**. The PR body is the source of truth for the public CalVer GitHub Release (via Release Template workflow after merge).

**Do not merge** unless the user explicitly asks. **Do not** run Release Template or push tags in this skill — only open/update the promotion PR.

## Hard rules

| Rule              | Detail                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Base / head       | `main` ← `develop` only                                                                                                         |
| Merge method      | User must merge with **Create a merge commit** — never squash                                                                   |
| Published section | Everything under **`## CalVer release notes`** until the first `---` on its own line                                            |
| Maintainer-only   | Everything **below** `---` (checklist, test plan) — keep template defaults, tick test plan if verified                          |
| Heading           | Top of published prose must be **`## CalVer release notes`** — not bare `## Summary` (Release Template extractor requires this) |
| Title             | `release: promote develop to main (<short themes>)` — lowercase after prefix, 3–6 words of themes                               |

Template file: [`.github/PULL_REQUEST_TEMPLATE/promote-develop-to-main.md`](../../.github/PULL_REQUEST_TEMPLATE/promote-develop-to-main.md)

## Before opening the PR

Run from repo root:

```bash
git fetch origin main develop
```

1. **Confirm `develop` is ready** — `git log origin/main..origin/develop --oneline` is non-empty; mention if empty.
2. **Last CalVer tag** (anchor for release notes):

   ```bash
   git fetch origin --tags
   LAST_TAG="$(git tag -l | grep -E '^[0-9]{4}\.[0-9]{3}$' | sort -V | tail -1)"
   echo "Last CalVer tag: ${LAST_TAG:-none}"
   ```

3. **Commits in this promotion** — `git log ${LAST_TAG}..origin/develop --oneline` (if no tag, use `origin/main..origin/develop`).
4. **Diff scope** — `git diff ${LAST_TAG:-origin/main}..origin/develop --stat`
5. **Adopter signals** (ground truth — do not invent):
   - New migrations: `git diff ${LAST_TAG:-origin/main}..origin/develop --name-only -- supabase/migrations/*.sql | grep '/migrations/' || true`
   - Workflow / CI: `.github/workflows/`
   - Secrets hints: `env.example`, setup manifests
   - Pending changesets on develop: `ls .changeset/*.md 2>/dev/null` (warn if promotion may conflict with consumed changes on `main`)
6. **Existing promotion PR** — `gh pr list --base main --head develop --state open` — update body instead of duplicating.

## Drafting the CalVer section

Write **concrete prose** — no HTML comments, no `<!-- ... -->` placeholders in the final PR.

### Summary (3–4 sentences)

- What this promotion represents
- Headline capabilities
- Breaking fork steps **only if real** (new required secrets, migrations, folder moves)

### Highlights

- Group by theme (Documentation, Web, Mobile, CI, Packages, etc.)
- Bullet user-facing changes; link merged PRs as `(#NNN)` when known from commit messages
- Prefer `feat` / `fix` commits; mention notable `docs` / `ci` items if adopters care

### Adopter notes

Fill the table honestly:

| Area                       | Action                                                           |
| -------------------------- | ---------------------------------------------------------------- |
| **Secrets**                | None new — or list with where documented                         |
| **Database**               | No new migrations — or list `supabase/migrations/<file>.sql`     |
| **Likely merge conflicts** | Paths forks commonly customize (README, docs, theme files, etc.) |
| **npm packages**           | Pending changesets / expected publish — or "none"                |

Keep the standard links block (landing, quickstart, feedback, upgrading) from the template.

### Stats (optional but helpful)

One line: `N commits, +X / −Y lines` from diff stat.

## PR body structure

Use this exact shape (maintainer section from template below `---`):

```markdown
## CalVer release notes

### Summary

...

### Highlights

- ...

### Adopter notes

| Area                       | Action |
| -------------------------- | ------ |
| **Secrets**                | ...    |
| **Database**               | ...    |
| **Likely merge conflicts** | ...    |
| **npm packages**           | ...    |

- **Landing:** https://beakerstack.com
- **Quick start:** https://github.com/Artificer-Innovations/BeakerStack/blob/main/QUICKSTART.md
- **Feedback:** https://github.com/Artificer-Innovations/BeakerStack/discussions
- **Upgrade guide:** https://github.com/Artificer-Innovations/BeakerStack/blob/main/docs/UPGRADING.md

---

## Maintainer checklist

... (keep template content for merge instructions, post-merge, test plan)
```

Copy maintainer checklist and test plan from [promote-develop-to-main.md](../../.github/PULL_REQUEST_TEMPLATE/promote-develop-to-main.md) unchanged unless the user asked to update them.

## Create or update the PR

Write the full body to a temp file, then:

```bash
# New PR
gh pr create \
  --base main \
  --head develop \
  --title "release: promote develop to main (<themes>)" \
  --body-file /tmp/promotion-pr-body.md

# Or update existing open promotion PR
gh pr edit <number> --body-file /tmp/promotion-pr-body.md
```

Prefer `--body-file` over `--template` so the CalVer section is fully drafted. The template path is still the structural source of truth.

After create, return the PR URL and remind the user:

- Merge with **Create a merge commit**
- If `.changeset/*.md` conflicts at merge, delete consumed changeset (accept `main`)
- After merge: **Deploy Production** (automatic), then **Release Template** on `main` (reads this PR’s CalVer section)

## Quality checklist (self-verify before submit)

- [ ] `## CalVer release notes` present; `---` separator before maintainer checklist
- [ ] Summary is 3–4 complete sentences, not bullet stubs
- [ ] Highlights reflect actual commits since last CalVer tag
- [ ] Adopter table matches `git diff` (no false "no migrations" if files added)
- [ ] Title matches `release: promote develop to main (...)` pattern
- [ ] No instruction to squash merge

## Out of scope

- Feature PRs into `develop` (use default [pull_request_template.md](../../.github/pull_request_template.md))
- Hotfixes direct to `main`
- Running Release Template, editing published GitHub Releases, or pushing CalVer tags
- `git checkout origin/main -- .` (never use to resolve promotion conflicts)

## References

- [CONTRIBUTING.md — Promoting develop → main](../../CONTRIBUTING.md)
- [docs/VERSIONING.md](../../docs/VERSIONING.md)
- [release-template.yml](../../.github/workflows/release-template.yml)

## Repo layout

- **This skill:** `.cursor/skills/promote-develop-to-main/` (committed).
- **Stripe mirror skills:** `.claude/skills/stripe-*` (gitignored — install locally, not in repo).
