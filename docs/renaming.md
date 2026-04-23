# Project Renaming Guide

This guide walks through renaming the Beaker Stack template to any new project name using the automated rename script. The workflow updates display strings, identifiers, bundle IDs, Supabase project references, CI configs, and supporting documentation.

## Canonical Name Variants

The script derives the following variants from the `--from` and `--to` names and replaces each across the repository:

| Form                 | Example (`Beaker Stack`) |
| -------------------- | ------------------------ |
| Display / Title Case | `Beaker Stack`           |
| PascalCase           | `BeakerStack`            |
| camelCase            | `beakerStack`            |
| kebab-case / slug    | `beaker-stack`           |
| snake_case           | `beaker_stack`           |
| flatlower            | `beakerstack`            |
| SCREAMING_SNAKE_CASE | `BEAKER_STACK`           |
| UPPERFLAT            | `BEAKERSTACK`            |

These cover display copy, route slugs, Supabase identifiers, Expo slugs, bundle identifiers, and other string-based references.

## Usage

Run the script from the repository root via the npm helper:

```bash
npm run rename -- --from "Beaker Stack" --to "Acme App"
```

`npm run setup` derives the same `--from` display string from `packages/shared/src/config/branding.ts` and `--from-legal` from `package.json` author so you are not asked to retype them. If those files disagree with strings still present elsewhere in the repo, run `npm run rename` manually with the exact `--from` / `--from-legal` literals you need.

When a **local** Supabase stack is running, the rename script warns and asks what to do (interactive terminal only): you can run `supabase stop` from the prompt, **proceed anyway** (for example you are rebranding a fresh clone while another checkout still has `supabase start` on the same machine — clones often share the default `project_id` in `supabase/config.toml`, so the status check can reflect another directory’s stack), or quit. From a non-interactive context (no TTY, such as CI), rename **fails** until the stack is stopped or you pass `--no-supabase-check`.

```bash
supabase stop            # or supabase stop --project-id <current-slug>
```

Use `--no-supabase-check` when stdin is not a TTY and you are certain skipping the guard is appropriate (typical for CI).

Recommended flags:

- `--dry-run` &mdash; Preview changes without writing to disk.
- `--strict` &mdash; Exit with a non-zero status if any legacy identifiers remain.
- `--verbose` &mdash; Print each file touched during the rename.
- `--no-supabase-check` &mdash; Skip the Supabase status guard.

Example dry-run with strict validation:

```bash
npm run rename -- --from "Beaker Stack" --to "Acme App" --dry-run --strict --verbose
```

> The script skips binary assets and the `ios/` and `android/` directories because those assets are typically regenerated after Expo prebuild. All other text files within `apps/`, `packages/`, `supabase/`, `.github/`, and `docs/` are processed.

## Post-Rename Checklist

After running the rename (without `--dry-run`):

1. Regenerate native directories if you maintain them locally:
   - `cd apps/mobile`
   - `npx expo prebuild --clean`
2. Rebuild and verify the apps:
   - Web: `npm run type-check:web`, `npm run lint:web`, `npm run test:unit:web`, then `npm run web`
   - Mobile (Expo managed): `npm run type-check:mobile`, `npm run lint:mobile`, `npm run test:unit:mobile`, then `npm run mobile`
3. Update store metadata or developer console configuration (Apple/Google) if bundle identifiers changed.
4. Review Supabase project settings (`project_id`, redirect URLs) and update environment variables or secrets in CI/CD systems.
5. Commit the rename and document the new project name for your team.

## Custom Identifiers

The script automatically converts bundle identifiers such as `com.anonymous.beakerstack` to match the flat lower-case variant (e.g., `com.anonymous.acmeapp`). If you need to change the prefix (`com.anonymous`), run the script first and then adjust the prefix manually or with a quick search-and-replace before rebuilding native projects.

For advanced scenarios (multiple bundle IDs, white-label variants), consider running the script with `--dry-run` to generate a change list, adjusting the output to match your naming strategy, and then re-running without the dry-run flag.

## Troubleshooting

- **Strict mode failures**: The script prints files that still contain legacy names. Inspect them for embedded assets, environment examples, or TODOs and update manually.
- **CI/CD secrets**: GitHub Actions and EAS may store project names or bundle IDs in repository secrets. Update those values manually after running the script.
- **Supabase deep links**: Ensure the redirect URLs in Supabase `config.toml` or dashboard match the new scheme (e.g., `acme-app://auth/callback`).

For questions or additional automation requirements, open an issue in your derived repository and tailor the script to your workflow.\*\*\*
