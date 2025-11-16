/**
 * CloudFront viewer-request function to map path-based PR previews to S3 prefixes.
 *
 * For deploy.beakerstack.com:
 *   - Routes `/pr-<N>/*` paths to S3 prefix `pr-<N>/*`
 *   - Handles SPA fallback: `/pr-<N>/some/route` → `pr-<N>/index.html`
 *   - Supports both file paths (with extensions) and directory-like paths
 *
 * Example URIs:
 *   - `/pr-123/` → `pr-123/index.html`
 *   - `/pr-123/static/js/main.js` → `pr-123/static/js/main.js`
 *   - `/pr-123/dashboard` → `pr-123/index.html` (SPA routing)
 *   - `/pr-123/dashboard/settings` → `pr-123/index.html` (SPA routing)
 *
 * The bootstrap script injects the values for PREVIEW_PREFIX via template substitution.
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri || '/';
  var previewPrefixBase = '%%PREVIEW_PREFIX%%'; // e.g., "pr-"

  // Match /pr-<N>/ pattern at the start of the path
  var prPathPattern = new RegExp('^/(' + previewPrefixBase + '\\d+)(/.*)?$');
  var match = uri.match(prPathPattern);

  function isFilePath(path) {
    // Check if path has a file extension (e.g., .js, .css, .png)
    // Exclude trailing slashes
    var trimmed = path.replace(/\/$/, '');
    return /\.[a-z0-9]+$/i.test(trimmed);
  }

  function rewritePath(prPrefix, restOfPath) {
    var sanitizedPrefix = prPrefix.replace(/^\/+|\/+$/g, '');
    var sanitizedPath = (restOfPath || '/').replace(/^\/+/, '');

    // If no path or just a slash, serve index.html
    if (!sanitizedPath || sanitizedPath === '' || sanitizedPath === '/') {
      return sanitizedPrefix + '/index.html';
    }

    // If path doesn't have a file extension, treat as SPA route
    if (!isFilePath(sanitizedPath)) {
      return sanitizedPrefix + '/index.html';
    }

    // File path - preserve as-is
    return sanitizedPrefix + '/' + sanitizedPath;
  }

  // If the URI matches the PR pattern, rewrite it
  if (match) {
    var prPrefix = match[1]; // e.g., "pr-123"
    var restOfPath = match[2]; // e.g., "/dashboard" or "/static/js/main.js"
    request.uri = '/' + rewritePath(prPrefix, restOfPath);
    return request;
  }

  // If URI doesn't match PR pattern, pass through unchanged
  // (For root domain requests to deploy.beakerstack.com, this might be an error page)
  return request;
}
