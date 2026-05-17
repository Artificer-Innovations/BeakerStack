# Documentation index

Start on the repo root **[README.md](../README.md)** and **[QUICKSTART.md](../QUICKSTART.md)**. Use this page when you need a specific topic.

## Setup and infrastructure

| Document                                                                     | Purpose                                                                                       |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [QUICKSTART.md](../QUICKSTART.md)                                            | First run: local hello-world vs full cloud + CI checklist                                     |
| [setup-prep-checklist.md](setup-prep-checklist.md)                           | **Before `setup:full`:** wizard prompts, values to gather, one-time secrets, post-wizard work |
| [pr-preview-setup.md](pr-preview-setup.md)                                   | AWS PR previews, DNS, CloudFormation                                                          |
| [supabase-staging-production-setup.md](supabase-staging-production-setup.md) | Remote staging/production Supabase projects                                                   |
| [supabase-preview-setup.md](supabase-preview-setup.md)                       | Shared PR preview database and redirects                                                      |
| [stripe-billing-setup.md](stripe-billing-setup.md)                           | Stripe + Supabase Edge billing (keys, webhooks, sync, local vs hosted)                        |
| [reference/github-actions-secrets.md](reference/github-actions-secrets.md)   | Actions secret/variable names (regenerate with `npm run docs:actions-secrets`)                |
| [project-label-bridge.md](project-label-bridge.md)                           | **Optional:** label-driven org GitHub Project updates (`npm run setup:project-label-bridge`)  |
| [branch-protection-setup.md](branch-protection-setup.md)                     | Branch rules                                                                                  |

## OAuth

| Document             | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| [OAUTH.md](OAUTH.md) | **Canonical guide** — local setup, production (Google + Apple), mobile native flow |

## Testing and quality

| Document                                                                   | Purpose                                     |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| [TESTING.md](TESTING.md)                                                   | Unit, integration, E2E, DB testing strategy |
| [testing/TESTING_OAUTH.md](testing/TESTING_OAUTH.md)                       | OAuth testing notes                         |
| [testing/TESTING_PROTECTED_ROUTES.md](testing/TESTING_PROTECTED_ROUTES.md) | Protected routes manual checks              |
| [MOBILE_BUILD_TESTING.md](MOBILE_BUILD_TESTING.md)                         | EAS / dev client testing                    |

## Product and repo maintenance

| Document                   | Purpose             |
| -------------------------- | ------------------- |
| [BRANDING.md](BRANDING.md) | Icons, colors, copy |
| [renaming.md](renaming.md) | Rename the template |

## Specs

| Document                                                                   | Purpose                                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [specs/beakerstack-billing-v1.md](specs/beakerstack-billing-v1.md)         | Billing module design (schema, RPCs, entitlements, app boundary) |
| [specs/beakerstack-billing-ui-v1.md](specs/beakerstack-billing-ui-v1.md)   | `/billing` route family, UI states, migration (shipped)          |
| [../apps/web/docs/billing-testing.md](../apps/web/docs/billing-testing.md) | Stripe CLI, webhooks, demo mode QA                               |

## Guides

| Document                                                         | Purpose                                                                    |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [stripe-billing-setup.md](stripe-billing-setup.md)               | Stripe account → webhooks → Edge secrets → price sync                      |
| [guides/billing-plan-catalog.md](guides/billing-plan-catalog.md) | Plan `features` / `usage_limits`, `billing:apply-plans`, rollout checklist |
| [guides/MOBILE.md](guides/MOBILE.md)                             | Native rebuilds, dev client                                                |
| [mobile-ios-patching.md](mobile-ios-patching.md)                 | iOS-specific patches                                                       |
| [REALTIME_DEVELOPMENT.md](REALTIME_DEVELOPMENT.md)               | Realtime dev notes                                                         |

## Architecture, versioning, development

| Document                           | Purpose                                   |
| ---------------------------------- | ----------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Environments, data flow, design decisions |
| [VERSIONING.md](VERSIONING.md)     | Template CalVer vs npm semver             |
| [UPGRADING.md](UPGRADING.md)       | Pull template updates into a fork         |
| [DEVELOPMENT.md](DEVELOPMENT.md)   | Day-to-day commands, tests, CI/CD         |

## Contributing

See root **[CONTRIBUTING.md](../CONTRIBUTING.md)**.
