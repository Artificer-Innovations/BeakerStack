## CalVer release notes

<!-- Do not use a bare `---` line inside this section — it ends published notes early. -->

### Summary

<!-- 3–4 sentences: what this promotion represents, headline capabilities, breaking fork steps (if any). -->

### Highlights

<!-- User-facing changes grouped by theme; link PRs where helpful. -->

### Adopter notes

<!-- Forks upgrading from the previous CalVer tag — secrets, migrations, likely conflict paths. -->

| Area                       | Action                                                    |
| -------------------------- | --------------------------------------------------------- |
| **Secrets**                | <!-- None new / list new required secrets -->             |
| **Database**               | <!-- No new migrations / list migration files -->         |
| **Likely merge conflicts** | <!-- e.g. README.md, docs/** -->                          |
| **npm packages**           | <!-- Changesets / @beakerstack/* publishes, or "none" --> |

- **Landing:** https://beakerstack.com
- **Quick start:** https://github.com/Artificer-Innovations/BeakerStack/blob/main/QUICKSTART.md
- **Feedback:** https://github.com/Artificer-Innovations/BeakerStack/discussions
- **Upgrade guide:** https://github.com/Artificer-Innovations/BeakerStack/blob/main/docs/UPGRADING.md

---

## Maintainer checklist

<!-- Not published on the GitHub Release — for reviewers and releasers only. -->

### Merge instructions

**Use “Create a merge commit” — do NOT squash.** Required by [CONTRIBUTING.md](../../CONTRIBUTING.md) and enforced by [check-merge-strategy.yml](../workflows/check-merge-strategy.yml).

### Post-merge

1. Monitor **Deploy Production** workflow on `main`
2. Review auto-opened **“chore: release packages”** PR from changesets (if any); merge if correct
3. Run **Release Template** workflow on `main` (uses this PR’s CalVer section + git-cliff changelog)

### Test plan

- [ ] CI green on `develop` at promotion SHA
- [ ] Staging smoke: auth, dashboard, billing
- [ ] After merge: production deploy succeeds
- [ ] After **Release Template**: GitHub Release body matches **CalVer release notes** above + changelog
