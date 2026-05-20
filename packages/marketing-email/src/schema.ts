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

export function defineMarketingEmailConfig(
  config: MarketingEmailConfig
): MarketingEmailConfig {
  if (!config.namespace || config.namespace.trim() === '') {
    throw new Error('marketingEmail.namespace is required');
  }
  if (!config.kitFormId || config.kitFormId.trim() === '') {
    throw new Error('marketingEmail.kitFormId is required');
  }
  return config;
}
