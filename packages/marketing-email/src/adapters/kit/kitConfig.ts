export interface KitAdapterConfig {
  formId: string;
  namespace: string;
  tagScheme?: {
    separator?: string;
    tierPrefix?: string;
  };
  tierTagNames?: string[];
}

export function defineKitConfig(config: KitAdapterConfig): KitAdapterConfig {
  return config;
}
