import { billingError } from '../errors.js';

/**
 * Open an https (or custom-scheme) URL in the system browser / handler.
 */
export async function openExternalUrl(url: string): Promise<void> {
  const { Linking } = await import('react-native');
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw billingError('stripe', `Unable to open URL: ${url}`);
  }
  await Linking.openURL(url);
}
