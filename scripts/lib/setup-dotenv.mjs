/**
 * Escape a value for use inside double quotes in a dotenv line (backslashes first, then quotes).
 * Compatible with common dotenv loaders that interpret `\\` and `\"` inside quoted values.
 * @param {string} s
 * @returns {string}
 */
export function escapeDotEnvDoubleQuotedValue(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Minimal dotenv parsing for setup scripts (KEY=value, # comments, quoted values).
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parseDotEnv(content) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!content) return out;
  for (const line of content.split('\n')) {
    let t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (/^export\s+/i.test(t)) {
      t = t.replace(/^export\s+/i, '').trim();
    }
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}
