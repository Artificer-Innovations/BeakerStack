/* eslint-disable @typescript-eslint/no-unused-vars -- CloudFront Function entrypoint */
function handler(event) {
  const request = event.request;
  const uri = request.uri || '/';
  const previewPrefixBase = '%%PREVIEW_PREFIX%%';

  function mapArticlesPrerenderUri(basePrefix, restOfPath) {
    // Keep in sync with infra/aws/pr-preview-stack.yml.
    if (!restOfPath) {
      return null;
    }
    if (restOfPath === '/articles' || restOfPath === '/articles/') {
      return basePrefix + '/prerender-articles/index.html';
    }
    const tagMatch = restOfPath.match(/^\/articles\/tags\/([^/]+)\/?$/);
    if (tagMatch) {
      return basePrefix + '/prerender-articles/tags/' + tagMatch[1] + '.html';
    }
    const articleMatch = restOfPath.match(/^\/articles\/([^/]+)\/?$/);
    if (articleMatch) {
      return basePrefix + '/prerender-articles/' + articleMatch[1] + '.html';
    }
    return null;
  }

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
      headers: { 'content-type': { value: 'text/plain' } },
      body: 'User-agent: *\nDisallow: /\nAllow: /' + previewPrefixBase + '\n',
    };
  }

  const prPathPattern = new RegExp('^/(' + previewPrefixBase + '\\d+)(/.*)?$');
  const match = uri.match(prPathPattern);

  if (!match) {
    return request;
  }

  const prPrefix = match[1];
  const restOfPath = match[2];

  // No sub-path or root slash -> pre-rendered home page (mirrors Default Root Object for prod/staging)
  if (!restOfPath || restOfPath === '/') {
    request.uri = '/' + prPrefix + '/prerender-home.html';
    return request;
  }

  const articlesUri = mapArticlesPrerenderUri('/' + prPrefix, restOfPath);
  if (articlesUri) {
    request.uri = articlesUri;
    return request;
  }

  // Strip slashes for extension check
  const trimmedPath = restOfPath.replace(/^\//, '').replace(/\/$/, '');

  // File path (has extension) -> serve directly
  if (/\.[a-z0-9]+$/i.test(trimmedPath)) {
    request.uri = '/' + prPrefix + restOfPath;
    return request;
  }

  // No extension -> SPA route, serve index.html
  request.uri = '/' + prPrefix + '/index.html';
  return request;
}
