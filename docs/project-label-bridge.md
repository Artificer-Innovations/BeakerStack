# Project label bridge (optional GitHub Actions)

This repository **does not depend** on the [Project label bridge workflow](../.github/workflows/project-label-bridge.yml). CI, builds, and day-to-day development work the same if you never configure it. It exists only if you want **automation between issue labels and an organization GitHub Project (v2) board**.

## Why it exists

At **Artificer Innovations** we treat AI coding agents as part of the engineering team: they follow the same habits we expect from human engineers—issues, PRs, reviews, and incremental work you can trace in history. You can see that pattern in this repository, where multiple agent-led changes sit alongside human contributions.

Humans still rely on **Kanban-style boards** to see flow at a glance. Agents can usually **label** issues and PRs, but we found that **fine-grained personal access tokens** often cannot grant **organization Projects** write access in a way agents can use reliably, so cards on the org board would not move even when work progressed.

This workflow bridges that gap: **agents (or humans) only change labels**; GitHub Actions runs with a **classic PAT** (or another token that can write org projects) and updates the project **Status** field so the board stays in sync with the labels.

If you do not use an org-level project board, or you move cards manually, you can ignore this workflow entirely.

## When the workflow runs

- Triggers on **`issues: labeled`** and **`pull_request: labeled`**.
- If `GITHUB_PROJECT_NUMBER` is unset, the job is skipped (no failure).
- If `ORG_PROJECT_GITHUB_TOKEN` is unset, the run exits with a warning and succeeds (so forks and clones without secrets do not break).

## Setup

### Quick setup (`gh` + npm)

If you use the [GitHub CLI](https://cli.github.com/) (`gh`) with permission to manage Actions **variables** and **secrets** on this repository:

```bash
npm run setup:project-label-bridge -- --help
# Preview:
npm run setup:project-label-bridge -- --dry-run --number 5 --org Artificer-Innovations
# Apply variables (org optional); you are then prompted once for the PAT (masked typing on a real TTY, same idea as npm run setup:full):
npm run setup:project-label-bridge -- --number 5 --org Artificer-Innovations
# Non-interactive: pipe or file (avoid echoing the PAT in argv)
printf '%s' "$ORG_PROJECT_GITHUB_TOKEN" | npm run setup:project-label-bridge -- --number 5 --token-stdin
npm run setup:project-label-bridge -- --number 5 --token-file ~/.config/beakerstack/github-pat-project.txt
# Variables only (skip secret prompt entirely):
npm run setup:project-label-bridge -- --number 5 --skip-secret
```

The helper is [`scripts/github/setup-project-label-bridge.mjs`](../scripts/github/setup-project-label-bridge.mjs). It uses [`scripts/lib/setup-secret-input.mjs`](../scripts/lib/setup-secret-input.mjs) (`readMaskedLineIfTty`, `resolveSecretInputLine`) so pastes, paths to bare secret files, and `ORG_PROJECT_GITHUB_TOKEN=...` dotenv lines behave like **setup-full**. Flags: `--plain-secret-prompts` (typed echo), `--skip-secret`, `--dry-run`. If the env var **`ORG_PROJECT_GITHUB_TOKEN`** is already set, it is used without prompting.

### Manual setup (GitHub UI)

1. **Repository variable (required)**  
   In GitHub: **Settings → Secrets and variables → Actions → Variables**  
   - **`GITHUB_PROJECT_NUMBER`** — the number in the project URL, e.g. `https://github.com/orgs/YourOrg/projects/5` → `5`.

2. **Repository variable (optional)**  
   - **`GITHUB_PROJECT_ORG`** — organization login owning the project. If omitted, the workflow default is `Artificer-Innovations` (change the default in the workflow file if your org differs and you prefer not to set a variable).

3. **Repository secret (required for the bridge to do anything)**  
   **Settings → Secrets and variables → Actions → Secrets**  
   - **`ORG_PROJECT_GITHUB_TOKEN`** — a **classic** personal access token with at least **`repo`** and **`project`** (and whatever your org requires for SSO). Fine-grained PATs are often insufficient for org Projects; see GitHub’s [Automating Projects using Actions](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions) note about `GITHUB_TOKEN` vs PAT/App for org projects.

4. **Labels and Status names**  
   Use labels **`project/status-<kebab>`** where `<kebab>` is lowercase letters, digits, and hyphens (for example `project/status-ready-for-qa`). The workflow derives the GitHub Project **Status** option name automatically:

   - Hyphens become spaces.
   - **Default:** each word is **title-cased** (first letter uppercase, rest lowercase), e.g. `project/status-backlog` → `Backlog`, `project/status-ready` → `Ready`, `project/status-planning` → `Planning`, `project/status-done` → `Done`.
   - **Exception:** if the slug starts with **`in-`** and has more segments (`in-*`), the result is **`In`** plus a space, then the **remaining words in all lowercase** — so `project/status-in-progress` → **`In progress`** and `project/status-in-review` → **`In review`** (matching this repo’s Kanban wording).

   The derived string must match a **Status** single-select option on the project **exactly**. If you add a column, pick a kebab slug that produces that name, or rename the option in GitHub Projects to match what the label derives to.

   Examples for this board:

   | Label | Derived Status |
   | ----- | ---------------- |
   | `project/status-backlog` | Backlog |
   | `project/status-ready` | Ready |
   | `project/status-planning` | Planning |
   | `project/status-in-progress` | In progress |
   | `project/status-in-review` | In review |
   | `project/status-done` | Done |

5. **Items not yet on the board**  
   If an issue or PR is not already on the project, the workflow adds it, then sets **Status**.

## Security notes

- Treat **`ORG_PROJECT_GITHUB_TOKEN`** like any other powerful PAT: minimal lifetime, rotate on schedule, and restrict org/repo access at the PAT level where GitHub allows it.
- Workflows triggered from **fork pull requests** do not receive secrets; the bridge will no-op for those runs.

## Related files

- [`.github/workflows/project-label-bridge.yml`](../.github/workflows/project-label-bridge.yml) — derives **Status** from `project/status-<kebab>` labels and GraphQL updates.
- [`scripts/github/setup-project-label-bridge.mjs`](../scripts/github/setup-project-label-bridge.mjs) — `gh` + masked secret prompts (`npm run setup:project-label-bridge`).
