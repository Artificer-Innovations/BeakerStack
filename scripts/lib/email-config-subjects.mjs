import { readFileSync } from 'fs';

/**
 * Substitute config.toml branding tokens used in auth email subject lines.
 * Committed config keeps __PRODUCT_NAME__ / __BRAND_COLOR__; deploy/local
 * materialization replaces them from .personalization.json.
 *
 * @param {string} content
 * @param {{ productName?: string, brandColor?: string }} values
 * @returns {string}
 */
export function substituteConfigTomlTokens(
  content,
  { productName, brandColor }
) {
  let updated = content;
  if (productName) {
    updated = updated.replaceAll('__PRODUCT_NAME__', productName);
  }
  if (brandColor) {
    updated = updated.replaceAll('__BRAND_COLOR__', brandColor);
  }
  return updated;
}

/**
 * @param {string} personalizationPath
 * @returns {{ productName: string, brandColor?: string }}
 */
export function readPersonalizationBranding(personalizationPath) {
  const record = JSON.parse(readFileSync(personalizationPath, 'utf8'));
  return {
    productName: record.PRODUCT_NAME ?? 'BeakerStack',
    brandColor: record.BRAND_COLOR,
  };
}
