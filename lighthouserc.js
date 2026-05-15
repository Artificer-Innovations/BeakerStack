'use strict';

// Lighthouse CI configuration for PR preview environments.
// The target URL is supplied at runtime via --collect.url (see the lighthouse job in
// pr-preview-environment.yml). This file controls assertion thresholds and upload target.
//
// All assertions use 'warn' severity — scores are surfaced as informational GitHub status
// checks, not hard commit blockers. Tighten to 'error' if you want failing scores to block merge.

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      settings: {
        // Emulate a mid-range mobile device (Lighthouse default). Switch to
        // { preset: 'desktop' } here if the app is desktop-first.
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
