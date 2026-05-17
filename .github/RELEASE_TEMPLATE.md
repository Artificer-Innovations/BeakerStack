# CalVer release notes (maintainer reference)

**Do not paste this file into GitHub Releases manually** unless the Release Template workflow could not find a promotion PR.

## Where release prose lives

1. Open **`develop` → `main`** with the [**Promote develop to main** PR template](PULL_REQUEST_TEMPLATE/promote-develop-to-main.md) (`?template=promote-develop-to-main.md`).
2. Fill in **`## CalVer release notes`** (above the `---` separator). Everything below `---` is maintainer-only and is **not** published.
3. Merge with **Create a merge commit**.
4. Run [**Release Template**](../workflows/release-template.yml) on `main` — it copies the CalVer section from the merged promotion PR and appends a git-cliff changelog.

## CalVer section outline

Use these subsections inside **`## CalVer release notes`** in the promotion PR:

### Summary

3–4 sentences: what this release represents, headline capabilities, any breaking fork steps.

### Highlights

Bullet list of user-facing changes (group by theme; link PRs).

### Adopter notes

Table + links for forks upgrading from the previous CalVer tag (secrets, migrations, conflict paths, npm).

Include standard links:

- **Landing:** https://beakerstack.com
- **Quick start:** https://github.com/Artificer-Innovations/BeakerStack/blob/main/QUICKSTART.md
- **Feedback:** https://github.com/Artificer-Innovations/BeakerStack/discussions
- **Upgrade guide:** https://github.com/Artificer-Innovations/BeakerStack/blob/main/docs/UPGRADING.md

---

The workflow appends git-cliff output (`feat` / `fix` commits since the previous `YYYY.NNN` tag) below a `---` separator.
