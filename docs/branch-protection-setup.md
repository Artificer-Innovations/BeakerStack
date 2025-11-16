# Branch Protection Setup Guide

This guide explains how to configure GitHub branch protection rules to enforce the correct merge strategy.

## Why Branch Protection?

Branch protection prevents accidental squash merges into `main`, which can cause merge conflicts when merging `develop` → `main`. By restricting merge types on `main`, we ensure that only merge commits are allowed, preserving branch history.

## Setting Up Branch Protection

### Important Note

⚠️ **GitHub Limitation**: GitHub does not support branch-specific merge method restrictions. The merge method settings (squash, merge, rebase) are repository-wide only. However, we can use a combination of:

1. Repository-wide settings (prefer merge commits)
2. Branch protection rules (enforce PR requirements)
3. Team discipline and documentation
4. Optional: GitHub Action to enforce merge strategy (see below)

### Step 1: Configure Repository-Wide Merge Settings

1. Go to your repository on GitHub
2. Navigate to **Settings** → **General**
3. Scroll down to the **Pull Requests** section
4. Configure merge methods:
   - ✅ **Allow merge commits** (keep enabled)
   - ✅ **Allow squash merging** (keep enabled - needed for feature → develop)
   - ❌ **Allow rebase merging** (optional - can disable if you prefer)

**Note**: Since we need squash merging for feature branches → `develop`, we keep it enabled. We'll rely on team discipline and documentation to ensure `develop` → `main` uses merge commits only.

### Step 2: Set Up Branch Protection for `main`

1. Navigate to **Settings** → **Branches**
2. Click **Add rule** (or edit existing rule for `main`)
3. In **Branch name pattern**, enter: `main`
4. Configure the following settings:

   **Protect matching branches:**
   - ✅ Require a pull request before merging
     - ✅ Require approvals: 1 (or your team's requirement)
     - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
     - Select required status checks (e.g., "Test", "Lint & Type Check")
   - ✅ Require branches to be up to date before merging
   - ✅ **Require merge queue** (optional, but recommended for teams)

   **Restrict who can push to matching branches:**
   - ✅ Do not allow bypassing the above settings

5. Click **Create** (or **Save changes**)

### Step 3: Set Up Branch Protection for `develop`

1. Click **Add rule** (or edit existing rule for `develop`)
2. In **Branch name pattern**, enter: `develop`
3. Configure the following settings:

   **Protect matching branches:**
   - ✅ Require a pull request before merging
     - ✅ Require approvals: 1 (or your team's requirement)
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

   **Restrict who can push to matching branches:**
   - ✅ Do not allow bypassing the above settings

4. Click **Create** (or **Save changes**)

### Step 4: Optional - GitHub Action to Enforce Merge Strategy

Since GitHub doesn't support branch-specific merge restrictions, you can add a GitHub Action to check the merge method. Create `.github/workflows/check-merge-strategy.yml`:

```yaml
name: Check Merge Strategy

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check-merge-strategy:
    if: github.base_ref == 'main'
    runs-on: ubuntu-latest
    steps:
      - name: Check if PR targets main
        run: |
          echo "⚠️ This PR targets 'main' branch"
          echo "⚠️ Please ensure you use 'Create a merge commit' (NOT squash merge) when merging"
          echo "⚠️ Squash merging to main can cause conflicts when merging develop → main"
```

This won't block the merge, but it will remind contributors to use the correct merge method.

## Verification

After setting up branch protection:

1. ✅ Branch protection rules are active (PRs required, status checks enforced)
2. ⚠️ All merge methods will still be available (GitHub limitation)
3. ✅ Team members should use "Create a merge commit" for `develop` → `main` PRs
4. ✅ Team members can use "Squash and merge" for feature → `develop` PRs

**Workaround**: Since GitHub doesn't enforce this automatically, consider:

- Adding a PR template reminder
- Using the GitHub Action above to add a comment
- Training team members on the correct merge strategy

## Troubleshooting

### "I can't merge my PR to main"

- Check that you're using "Create a merge commit" (not squash)
- Ensure all required status checks have passed
- Make sure you have the required number of approvals

### "I accidentally squash merged to main"

If this happens:

1. Revert the squash merge commit
2. Create a new PR with a merge commit instead
3. Consider using `git revert` to undo the squash merge

### "Merge conflicts when merging develop → main"

This usually means:

- A PR was squash-merged to both `main` and `develop`
- Solution: Rebase `develop` onto `main` (as we did in this fix)

## Summary

- **`main`**: Only merge commits allowed (prevents squash merge conflicts)
- **`develop`**: All merge types allowed (squash is fine for feature branches)
- **Feature branches → `develop`**: Use squash merge
- **`develop` → `main`**: Use merge commit only
