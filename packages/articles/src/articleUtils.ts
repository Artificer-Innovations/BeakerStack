export function slugifyFilename(filename: string): string {
  return filename
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Linear-time markdown link label extraction (avoids ReDoS-prone link regexes). */
function stripMarkdownLinks(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '[') {
      const labelStart = i + 1;
      const bracketEnd = text.indexOf(']', labelStart);
      if (bracketEnd !== -1 && text[bracketEnd + 1] === '(') {
        const urlEnd = text.indexOf(')', bracketEnd + 2);
        if (urlEnd !== -1) {
          out += text.slice(labelStart, bracketEnd);
          i = urlEnd + 1;
          continue;
        }
      }
    }
    out += text[i];
    i += 1;
  }
  return out;
}

export function computeReadingTimeMinutes(markdown: string): number {
  const words = stripMarkdownLinks(
    markdown.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]+`/g, ' ')
  )
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function markdownToPlainText(markdown: string): string {
  return stripMarkdownLinks(markdown)
    .replace(/^[ \t]*[-*+] /gm, '')
    .replace(/[#*_`>~]/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildExcerpt(markdown: string, maxLength = 200): string {
  const plain = markdownToPlainText(markdown);
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1).trimEnd()}…`;
}
