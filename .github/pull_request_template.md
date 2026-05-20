## Description

<!-- Describe your changes here -->

## Type of Change

- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactoring
- [ ] Other (please describe)

## Merge strategy

⚠️ **Use the correct merge strategy for your target branch:**

| Target branch | Merge method                             |
| ------------- | ---------------------------------------- |
| **`develop`** | **Squash and merge**                     |
| **`main`**    | **Create a merge commit** (never squash) |

Squash merging to `main` causes painful conflicts on the next `develop` → `main` promotion.

**Promoting `develop` → `main`?** Close this PR and open a new one with the [**Promote develop to main** template](?template=promote-develop-to-main.md) (`?template=promote-develop-to-main.md`). CalVer release prose lives in that template’s **CalVer release notes** section.

## Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated (if needed)
- [ ] No new warnings generated
- [ ] Tests added/updated (if needed)
- [ ] All tests pass locally

## Testing

<!-- Describe how you tested your changes -->

**E2E (PRs to `develop`):** Web E2E does not run on every push. When ready for merge, get approval from @ZappoMan or comment `run e2e tests`. Merge requires the `e2e` check to pass on the latest commit.

## Related Issues

<!-- Link to related issues, if any -->
