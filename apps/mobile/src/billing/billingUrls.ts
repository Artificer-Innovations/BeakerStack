const appScheme =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_SCHEME) ||
  'exp';

export const BILLING_DEEP_LINK_URL = `${appScheme}://billing`;
