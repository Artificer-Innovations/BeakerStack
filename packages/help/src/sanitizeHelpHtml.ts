import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const purify = DOMPurify(new JSDOM('').window);

/** Sanitize help HTML generated from trusted repo markdown at build time. */
export function sanitizeHelpHtml(html: string): string {
  return purify.sanitize(html);
}
