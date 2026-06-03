import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

/** Sanitize help HTML generated from trusted repo markdown at build time. */
export function sanitizeHelpHtml(html: string): string {
  const window = new JSDOM('').window;
  return DOMPurify(window).sanitize(html);
}
