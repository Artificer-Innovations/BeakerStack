function handler(event) {
  var request = event.request;
  var uri = request.uri || '/';
  var previewPrefixBase = '%%PREVIEW_PREFIX%%';

  // Return a synthetic robots.txt before any S3 routing to avoid the
  // CloudFront HTML error-page fallback (no file at bucket root → 404 →
  // HTML) that causes Lighthouse to fail the robots.txt validity check.
  //
  // Disallow the deploy origin by default, then explicitly Allow the PR
  // prefix so Lighthouse (and Google) treat /pr-<N>/... as crawlable.
  // Longest-prefix matching means /pr-152/ is allowed while stray apex
  // paths remain blocked. Uses previewPrefixBase (not a hardcoded "pr-")
  // so custom PREVIEW_PREFIX stacks stay correct.
  if (uri === '/robots.txt') {
    return {
      statusCode: 200,
      statusDescription: 'OK',
      headers: {
      'content-type': { value: 'text/plain' },
      'cache-control': { value: 'public, max-age=3600' },
    },
      body: 'User-agent: *\nDisallow: /\nAllow: /' + previewPrefixBase + '\n',
    };
  }

  var prPathPattern = new RegExp('^/(' + previewPrefixBase + '\\d+)(/.*)?$');
  var match = uri.match(prPathPattern);

  if (!match) {
    return request;
  }

  var prPrefix = match[1];
  var restOfPath = match[2];

  // No sub-path or root slash -> pre-rendered home page (mirrors Default Root Object for prod/staging)
  if (!restOfPath || restOfPath === '/') {
    request.uri = '/' + prPrefix + '/prerender-home.html';
    return request;
  }

  // Strip slashes for extension check
  var trimmedPath = restOfPath.replace(/^\//, '').replace(/\/$/, '');

  // File path (has extension) -> serve directly
  if (/\.[a-z0-9]+$/i.test(trimmedPath)) {
    request.uri = '/' + prPrefix + restOfPath;
    return request;
  }

  // No extension -> SPA route, serve index.html
  request.uri = '/' + prPrefix + '/index.html';
  return request;
}
