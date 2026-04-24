import { readFile } from 'node:fs/promises';

/**
 * Map Firebase / google-services.json fields to GOOGLE_SERVICES_* env names.
 * @param {string} filePath
 * @returns {Promise<Record<string, string>>}
 */
export async function envVarsFromGoogleServicesJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const j = JSON.parse(raw);
  const pi = j.project_info || {};
  const clients = Array.isArray(j.client) ? j.client : [];
  const firstClient = clients[0] || {};
  const oauthClients = Array.isArray(firstClient.oauth_client)
    ? firstClient.oauth_client
    : [];
  const apiKeys = Array.isArray(firstClient.api_key) ? firstClient.api_key : [];
  const apiKeyCurrent = apiKeys[0]?.current_key || '';

  const androidClient = oauthClients.find(
    (c) => c.client_type === 1 || String(c.client_type) === '1',
  );
  const webClient = oauthClients.find(
    (c) => c.client_type === 3 || String(c.client_type) === '3',
  );
  const iosClient = oauthClients.find(
    (c) => c.client_type === 2 || String(c.client_type) === '2',
  );

  /** @type {Record<string, string>} */
  const out = {};
  if (pi.project_number) out.GOOGLE_SERVICES_PROJECT_NUMBER = String(pi.project_number);
  if (pi.project_id) out.GOOGLE_SERVICES_PROJECT_ID = String(pi.project_id);
  if (pi.storage_bucket) out.GOOGLE_SERVICES_STORAGE_BUCKET = String(pi.storage_bucket);
  if (firstClient.client_info?.mobilesdk_app_id) {
    out.GOOGLE_SERVICES_MOBILESDK_APP_ID = String(firstClient.client_info.mobilesdk_app_id);
  }
  if (androidClient?.client_id) {
    out.GOOGLE_SERVICES_ANDROID_CLIENT_ID = String(androidClient.client_id);
  }
  if (androidClient?.android_info?.certificate_hash) {
    out.GOOGLE_SERVICES_ANDROID_CERTIFICATE_HASH = String(
      androidClient.android_info.certificate_hash,
    );
  }
  if (webClient?.client_id) out.GOOGLE_SERVICES_WEB_CLIENT_ID = String(webClient.client_id);
  if (iosClient?.client_id) out.GOOGLE_SERVICES_IOS_CLIENT_ID = String(iosClient.client_id);
  if (apiKeyCurrent) out.GOOGLE_SERVICES_API_KEY = String(apiKeyCurrent);
  return out;
}
