// CloudFront Function: reads pre-computed signed cookie values from query params
// and returns a synthetic 302 that sets all three CloudFront signed cookies.
// This runs on /_preview-auth — the path that has NO TrustedKeyGroups, so
// unauthenticated users can reach it to acquire their access cookies.
function handler(event) {
  var request = event.request;
  var qs = request.querystring;
  var policy = qs.policy ? qs.policy.value : null;
  var sig    = qs.sig    ? qs.sig.value    : null;
  var kid    = qs.kid    ? qs.kid.value    : null;

  if (!policy || !sig || !kid) {
    return {
      statusCode: 400,
      statusDescription: 'Bad Request',
      headers: { 'content-type': { value: 'text/plain' } },
      body: 'Missing required parameters: policy, sig, kid.'
    };
  }

  // Restrict dest to a local path to prevent open redirect.
  // Also block protocol-relative URLs like //evil.com which startsWith('/') but are external.
  var dest = qs.dest ? decodeURIComponent(qs.dest.value) : '/';
  if (!dest.startsWith('/') || dest.startsWith('//')) dest = '/';

  return {
    statusCode: 302,
    statusDescription: 'Found',
    headers: {
      location:      { value: dest },
      'cache-control': { value: 'no-store, no-cache, must-revalidate' }
    },
    cookies: {
      'CloudFront-Policy':      { value: policy, attributes: 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800' },
      'CloudFront-Signature':   { value: sig,    attributes: 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800' },
      'CloudFront-Key-Pair-Id': { value: kid,    attributes: 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800' }
    }
  };
}
