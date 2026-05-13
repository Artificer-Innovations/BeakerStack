# Lighthouse CI

The `lighthouse` job in `pr-preview-environment.yml` runs [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) against every PR preview environment and posts the results as GitHub status checks on the PR.

## How it works

1. `lhci collect` runs Lighthouse against the deployed preview URL.
2. `lhci assert` checks the scores against the thresholds in `lighthouserc.js`.
3. `lhci upload` pushes the report to [temporary public storage](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md#target) and — when `LHCI_GITHUB_APP_TOKEN` is configured — posts per-category status checks to the PR.

## Requirements

### GitHub secret: `LHCI_GITHUB_APP_TOKEN`

This is an optional secret. Without it the Lighthouse run is skipped — the job itself still runs (checkout, install, and warmup all execute) and the step exits 0, so the job appears in the workflow graph as successful. With it, Lighthouse runs and scores are posted as GitHub status checks.

To obtain the token:

1. Install the [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci) on your repository.
2. Copy the token from the app's configuration page.
3. Add it as a repository secret named `LHCI_GITHUB_APP_TOKEN`.

### Signed-cookie access mode

Lighthouse runs headlessly without any cookies. If the PR preview is protected by CloudFront signed cookies (`CLOUDFRONT_SIGNING_KEY` + `CLOUDFRONT_SIGNING_KEY_ID` both set), Lighthouse would hit 403s or be redirected to the auth page — producing meaningless scores.

The `lighthouse` job is therefore **skipped automatically** when `access-mode == 'signed-cookies'`. A note is logged in the job output. There is no action required; configure either signed cookies or Lighthouse CI, not both simultaneously.

## Thresholds

Configured in [`lighthouserc.js`](../lighthouserc.js) at the repo root. All assertions use `warn` severity — scores below threshold are surfaced as informational status checks but do not block merging. Change `'warn'` to `'error'` to make failing scores block the PR.

| Category       | Min score |
|----------------|-----------|
| Performance    | 0.70      |
| Accessibility  | 0.90      |
| Best practices | 0.90      |
| SEO            | 0.80      |

## Warmup

The job runs a `curl` warmup against the preview URL (5 retries, 5 s delay) followed by a 5-second pause before `lhci autorun`. This avoids cold-start latency from CloudFront and the Vite-built app inflating the first-paint metrics.
