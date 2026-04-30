# Documentation index

Start on the repo root **[README.md](../README.md)** and **[QUICKSTART.md](../QUICKSTART.md)**. Use this page when you need a specific topic.

## Setup and infrastructure

| Document                                                                     | Purpose                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [QUICKSTART.md](../QUICKSTART.md)                                            | First run: local hello-world vs full cloud + CI checklist                      |
| [pr-preview-setup.md](pr-preview-setup.md)                                   | AWS PR previews, DNS, CloudFormation                                           |
| [supabase-staging-production-setup.md](supabase-staging-production-setup.md) | Remote staging/production Supabase projects                                    |
| [supabase-preview-setup.md](supabase-preview-setup.md)                       | Shared PR preview database and redirects                                       |
| [stripe-billing-setup.md](stripe-billing-setup.md)                           | Stripe + Supabase Edge billing (keys, webhooks, sync, local vs hosted)         |
| [reference/github-actions-secrets.md](reference/github-actions-secrets.md)   | Actions secret/variable names (regenerate with `npm run docs:actions-secrets`) |
| [branch-protection-setup.md](branch-protection-setup.md)                     | Branch rules                                                                   |

## OAuth (canonical order)

| Document                                                   | Purpose                       |
| ---------------------------------------------------------- | ----------------------------- |
| [oauth/README.md](oauth/README.md)                         | OAuth doc map                 |
| [oauth/OAUTH_QUICK_SETUP.md](oauth/OAUTH_QUICK_SETUP.md)   | Quick local Google + Supabase |
| [oauth/OAUTH_SETUP.md](oauth/OAUTH_SETUP.md)               | Production OAuth setup        |
| [oauth/MOBILE_OAUTH_SETUP.md](oauth/MOBILE_OAUTH_SETUP.md) | Native mobile OAuth           |

## Testing and quality

| Document                                                                   | Purpose                                     |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| [TESTING.md](TESTING.md)                                                   | Unit, integration, E2E, DB testing strategy |
| [testing/TESTING_OAUTH.md](testing/TESTING_OAUTH.md)                       | OAuth testing notes                         |
| [testing/TESTING_PROTECTED_ROUTES.md](testing/TESTING_PROTECTED_ROUTES.md) | Protected routes manual checks              |
| [MOBILE_BUILD_TESTING.md](MOBILE_BUILD_TESTING.md)                         | EAS / dev client testing                    |

## Product and repo maintenance

| Document                             | Purpose                                            |
| ------------------------------------ | -------------------------------------------------- |
| [BRANDING.md](BRANDING.md)           | Icons, colors, copy                                |
| [renaming.md](renaming.md)           | Rename the template                                |
| [project/TASKS.md](project/TASKS.md) | Historical task checklist (may be partially stale) |

## Guides

| Document                                                         | Purpose                                                                    |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [stripe-billing-setup.md](stripe-billing-setup.md)               | Stripe account → webhooks → Edge secrets → price sync                      |
| [guides/billing-plan-catalog.md](guides/billing-plan-catalog.md) | Plan `features` / `usage_limits`, `billing:apply-plans`, rollout checklist |
| [guides/MOBILE.md](guides/MOBILE.md)                             | Native rebuilds, dev client                                                |
| [guides/DEBUGGING_NAVIGATION.md](guides/DEBUGGING_NAVIGATION.md) | Navigation debugging notes                                                 |
| [mobile-ios-patching.md](mobile-ios-patching.md)                 | iOS-specific patches                                                       |
| [REALTIME_DEVELOPMENT.md](REALTIME_DEVELOPMENT.md)               | Realtime dev notes                                                         |

## Architecture

See root **[ARCHITECTURE.md](../ARCHITECTURE.md)** for environments, data flow, and design decisions.

## Contributing

See root **[CONTRIBUTING.md](../CONTRIBUTING.md)**.
