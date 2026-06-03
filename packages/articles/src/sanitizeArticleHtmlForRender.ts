import DOMPurify from 'dompurify';

/** Build-time HTML plus a browser-only DOMPurify pass (matches @beakerstack/help). */
export function sanitizeArticleHtmlForRender(html: string): string {
  if (typeof window === 'undefined') {
    return html;
  }
  return DOMPurify.sanitize(html);
}
