/**
 * CloudFront viewer-request function to map wildcard subdomains to S3 prefixes.
 *
 * Expected layout:
 *   - production assets live under /production
 *   - preview assets live under /pr-<number>
 *   - arbitrary staging/testing prefixes can also be supported
 *
 * The function rewrites the request URI so CloudFront requests the correct S3 key.
 * For directory-like URLs, it falls back to the appropriate index.html to support SPAs.
 *
 * The bootstrap script injects the values for DOMAIN_NAME, PREVIEW_PREFIX, and PRODUCTION_PREFIX
 * via template substitution before publishing the function.
 */
function handler(event) {
  var request = event.request;
  var headers = request.headers || {};
  var hostHeader = headers.host && headers.host.value ? headers.host.value : '';
  var uri = request.uri || '/';

  var domain = '%%DOMAIN_NAME%%';
  var previewPrefixBase = '%%PREVIEW_PREFIX%%'; // e.g., "pr-"
  var productionPrefix = '%%PRODUCTION_PREFIX%%';

  function getSubdomain(hostname) {
    if (!hostname) {
      return '';
    }
    var normalized = hostname.toLowerCase();
    if (normalized === domain || normalized === 'www.' + domain) {
      return '';
    }
    if (normalized.endsWith('.' + domain)) {
      return normalized.slice(0, normalized.length - domain.length - 1);
    }
    return '';
  }

  function isFilePath(path) {
    return /\.[a-z0-9]+$/i.test(path);
  }

  function rewritePath(prefix, path) {
    var sanitizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
    var sanitizedPath = path.replace(/^\/+/, '');

    if (!sanitizedPath || sanitizedPath === '') {
      return '/' + sanitizedPrefix + '/index.html';
    }

    if (!isFilePath(sanitizedPath)) {
      return '/' + sanitizedPrefix + '/index.html';
    }

    return '/' + sanitizedPrefix + '/' + sanitizedPath;
  }

  var subdomain = getSubdomain(hostHeader);

  if (!subdomain) {
    request.uri = rewritePath(productionPrefix, uri);
    return request;
  }

  if (subdomain === 'www') {
    request.uri = rewritePath(productionPrefix, uri);
    return request;
  }

  if (subdomain.indexOf(previewPrefixBase) === 0) {
    request.uri = rewritePath(subdomain, uri);
    return request;
  }

  // Support additional static prefixes like "staging" by mapping subdomain -> folder 1:1.
  request.uri = rewritePath(subdomain, uri);
  return request;
}

export { handler };
