function handler(event) {
  var request = event.request;
  var uri = request.uri || '/';
  var previewPrefixBase = '%%PREVIEW_PREFIX%%';

  // Preview domain should never be crawled. Return a synthetic robots.txt
  // before any other routing so S3 (which has no file at the bucket root)
  // never gets the request — avoiding the CloudFront HTML error-page fallback
  // that causes Lighthouse to fail the robots.txt validity check.
  if (uri === '/robots.txt') {
    return {
      statusCode: 200,
      statusDescription: 'OK',
      headers: { 'content-type': { value: 'text/plain' } },
      body: 'User-agent: *\nDisallow: /\n',
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
