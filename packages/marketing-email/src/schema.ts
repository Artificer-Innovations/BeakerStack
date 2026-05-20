// kitApiKey is intentionally NOT part of this config — it is a runtime secret
// passed directly to KitAdapter (e.g. from Deno.env.get('KIT_API_KEY')),
// never stored in build-time configuration.
export interface MarketingEmailConfig {
  provider: 'kit';
  namespace: string;
  kitFormId: string;
  tagScheme?: {
    separator?: string;
    tierPrefix?: string;
  };
  tierTagNames?: string[];
  piiDisplay?: 'visible' | 'hashed';
  syncFunctionName?: string;
}

// Namespace must be lowercase, start with a letter, and contain only letters,
// digits, and hyphens — matching DB constraints added in Phase 2 (#286).
const NAMESPACE_RE = /^[a-z][a-z0-9-]*$/;

export function defineMarketingEmailConfig(
  config: MarketingEmailConfig
): MarketingEmailConfig {
  if (!config.namespace || config.namespace.trim() === '') {
    throw new Error('marketingEmail.namespace is required');
  }
  if (!NAMESPACE_RE.test(config.namespace)) {
    throw new Error(
      'marketingEmail.namespace must be lowercase letters, digits, and hyphens, starting with a letter'
    );
  }
  if (!config.kitFormId || config.kitFormId.trim() === '') {
    throw new Error('marketingEmail.kitFormId is required');
  }
  return config;
}
