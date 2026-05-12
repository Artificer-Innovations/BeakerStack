# Versioning

BeakerStack uses two parallel versioning schemes — one for the monorepo template and one for its published packages.

## Template releases — `YYYY.NNN`

Template releases are **monorepo snapshot tags** on `main`. A tag like `2026.003` means: _this is what BeakerStack looked like at that point in time, and it is a good base to fork from._

Tags use **CalVer with a zero-padded sequence number** within the year:

```
2026.001   first release of 2026
2026.002   second release of 2026
2026.013   thirteenth release of 2026
```

`NNN` increments arbitrarily — there is no meaning to how much time passes between releases.

### What counts as a breaking change

A template release is **breaking** if adopters who have forked the template need to take manual action before upgrading. That includes:

- A new required GitHub Actions secret or repository variable
- A renamed or removed secret / variable that CI depends on
- A changed top-level folder structure (e.g. a directory moved or renamed)
- A changed setup script behavior (flags renamed, phases reordered, outputs changed)
- A new migration step needed to align an existing fork with the updated baseline

Breaking changes are called out explicitly in the release notes generated for that tag.

### `main` vs. tagged releases

| Ref | What it is | Recommended for |
|-----|-----------|-----------------|
| `main` | Current stable HEAD | Following along with active development |
| `2026.NNN` | Snapshot tag | Starting a new fork; upgrading an existing fork in a controlled way |

If you are forking BeakerStack to build a product, start from a tagged release so your upgrade story is clear from day one.

## Package releases — semver

`@beakerstack/*` packages published to npm use standard **semantic versioning** (`MAJOR.MINOR.PATCH`). Each package is versioned independently via changesets. Release notes for package releases live on the package's GitHub Release page.

Package versions are independent of template CalVer tags.
