export interface KitAdapterConfig {
  formId: string;
  namespace: string;
  tagScheme?: {
    separator?: string;
    tierPrefix?: string;
  };
  // NOTE: tierTagNames is unused in Phase 1. Phase 3 kit-sync will use it to
  // iterate known tiers for tier_changed removal without listing Kit subscriber tags.
  tierTagNames?: string[];
}

export function defineKitConfig(config: KitAdapterConfig): KitAdapterConfig {
  if (!config.formId || config.formId.trim() === '') {
    throw new Error('KitAdapterConfig.formId is required');
  }
  if (!config.namespace || config.namespace.trim() === '') {
    throw new Error('KitAdapterConfig.namespace is required');
  }
  return config;
}
