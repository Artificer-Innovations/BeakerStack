# @beakerstack/help

Help & Support page UI and build-time markdown for BeakerStack web apps.

## Content source

Markdown lives in `adopter/content/help.md` (not in this package). At build time, `scripts/build-help.ts`:

1. Reads `help.md`
2. Substitutes tokens from `adopter/config/legal.ts` (`{{brandName}}`, `{{contactEmail}}`, etc.)
3. Parses sections and renders HTML via `marked`
4. Writes `src/generated/help.ts`

Regenerate:

```bash
npm run build:help -w @beakerstack/help
```

CI fails if `src/generated/help.ts` is stale relative to content.

## Exports

| Subpath       | Purpose                                                            |
| ------------- | ------------------------------------------------------------------ |
| `.`           | Types, `HELP_NAV_LINK`                                             |
| `./web`       | React components (`HelpContent`, search, accordion, feedback form) |
| `./generated` | Committed `HELP` manifest                                          |
| `./nav`       | `{ href: '/help', label: 'Help' }`                                 |

## App integration

```tsx
import { HelpContent } from '@beakerstack/help/web';
import { HELP_NAV_LINK } from '@beakerstack/help/nav';
```

Wire a public route at `/help` and pass `productName` and `contactEmail` from adopter config.
