function handler(event) {
  var request = event.request;
  var uri = request.uri || '/';
  var previewPrefixBase = '%%PREVIEW_PREFIX%%';

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
