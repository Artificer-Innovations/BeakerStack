import { Linking } from 'react-native';
import { billingError } from '../errors.js';

function redactedUrlForMessage(url: string): string {
  try {
    const u = new URL(url);
    return u.host ? `${u.protocol}//${u.host}` : u.protocol;
  } catch {
    return 'external link';
  }
}

/**
 * Open an https (or custom-scheme) URL in the system browser / handler.
 */
export async function openExternalUrl(url: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw billingError(
      'stripe',
      `Unable to open ${redactedUrlForMessage(url)}`,
      url
    );
  }
  await Linking.openURL(url);
}
