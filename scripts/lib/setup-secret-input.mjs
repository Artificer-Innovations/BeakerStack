import path from 'node:path';
import { existsSync, openSync } from 'node:fs';
import { platform } from 'node:os';
import { ReadStream as TtyReadStream } from 'node:tty';
import { parseDotEnv } from './setup-dotenv.mjs';

/** @param {import('node:readline/promises').ReadLine | null | undefined} rl */
function pauseRl(rl) {
  if (rl && typeof rl.pause === 'function') rl.pause();
}

/** @param {import('node:readline/promises').ReadLine | null | undefined} rl */
function resumeRl(rl) {
  if (rl && typeof rl.resume === 'function') rl.resume();
}

/**
 * Read one line with echo masked (TTY only).
 * Returns `null` when masking is unavailable — caller should use visible `rl.question` instead.
 * @param {import('node:readline/promises').ReadLine} rl
 * @param {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} inputStream
 * @param {NodeJS.WritableStream} out
 * @param {string} prompt
 * @param {{ maskChar?: string; __testRawSource?: import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void; isRawMode?: boolean } }} [opts]
 * @returns {Promise<string | null>}
 */
export async function readMaskedLineIfTty(rl, inputStream, out, prompt, opts = {}) {
  const maskChar = opts.maskChar ?? '*';
  /** When set (unit tests only), skip `/dev/tty` and use this stream; caller must not destroy it mid-read. */
  const testRawSource = opts.__testRawSource;
  pauseRl(rl);
  /** Second fd to controlling TTY — avoids fighting readline on stdin (Cursor / VS Code terminals). */
  /** @type {import('tty').ReadStream | null} */
  let ttyOnlyStream = null;
  const destroyTtyOnly = () => {
    if (ttyOnlyStream) {
      try {
        ttyOnlyStream.destroy();
      } catch {
        /* ignore */
      }
      ttyOnlyStream = null;
    }
  };
  try {
    /** @type {import('stream').Readable & { isTTY?: boolean; setRawMode?: (flag: boolean) => void }} */
    let rawSource = inputStream;

    if (testRawSource) {
      rawSource = testRawSource;
    } else if (platform() !== 'win32' && existsSync('/dev/tty')) {
      try {
        const fd = openSync('/dev/tty', 'r');
        /** `fs.ReadStream` on a TTY fd is not a TTY — use `tty.ReadStream` so `setRawMode` exists. */
        const ttyTry = new TtyReadStream(fd);
        if (ttyTry.isTTY && typeof ttyTry.setRawMode === 'function') {
          ttyOnlyStream = ttyTry;
          rawSource = ttyTry;
        } else {
          ttyTry.destroy();
        }
      } catch {
        /* fall back to inputStream */
      }
    }

    if (!rawSource.isTTY || typeof rawSource.setRawMode !== 'function') {
      destroyTtyOnly();
      return null;
    }

    let wasRaw = false;
    try {
      wasRaw = !!rawSource.isRawMode;
      rawSource.setRawMode(true);
    } catch {
      destroyTtyOnly();
      return null;
    }

    out.write(prompt);
    /** @type {string[]} */
    const chars = [];
    return await new Promise((resolve) => {
      let settled = false;
      const restoreRawMode = () => {
        if (rawSource.isTTY && typeof rawSource.setRawMode === 'function') {
          try {
            rawSource.setRawMode(!!wasRaw);
          } catch {
            /* ignore */
          }
        }
      };
      const detach = () => {
        rawSource.removeListener('data', onData);
      };
      /** @param {string} value */
      const settle = (value) => {
        if (settled) return;
        settled = true;
        restoreRawMode();
        detach();
        out.write('\n');
        resolve(value);
      };
      /** @param {Buffer | string} chunk */
      const onData = (chunk) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
        let i = 0;
        while (i < buf.length) {
          const c = buf[i];
          if (c === 3) {
            restoreRawMode();
            detach();
            out.write('\n');
            destroyTtyOnly();
            process.exitCode = 130;
            process.exit(130);
            return;
          }
          if (c === 4) {
            settle(chars.join(''));
            return;
          }
          if (c === 13 || c === 10) {
            if (c === 13 && i + 1 < buf.length && buf[i + 1] === 10) i += 1;
            settle(chars.join(''));
            return;
          }
          if (c === 127 || c === 8) {
            chars.pop();
            out.write('\b \b');
            i += 1;
            continue;
          }
          const len = Math.min(utf8CharLength(c), buf.length - i);
          const slice = buf.subarray(i, i + len);
          try {
            chars.push(slice.toString('utf8'));
          } catch {
            chars.push(String.fromCharCode(c));
          }
          out.write(maskChar);
          i += len;
        }
      };
      rawSource.on('data', onData);
    });
  } finally {
    destroyTtyOnly();
    resumeRl(rl);
  }
}

/** @param {number} firstByte */
function utf8CharLength(firstByte) {
  if (firstByte < 0x80) return 1;
  if ((firstByte & 0xe0) === 0xc0) return 2;
  if ((firstByte & 0xf0) === 0xe0) return 3;
  if ((firstByte & 0xf8) === 0xf0) return 4;
  return 1;
}

/**
 * @param {string} t trimmed first line / path
 * @param {string} repoRoot
 * @param {() => string} homedirFn
 * @param {(absPath: string) => Promise<string>} readFileUtf8
 * @returns {Promise<string | null>} file contents or null if not a readable path
 */
export async function tryReadUserPathAsFile(t, repoRoot, homedirFn, readFileUtf8) {
  /** @type {string[]} */
  const candidates = [];
  if (t.startsWith('~/')) {
    candidates.push(path.join(homedirFn(), t.slice(2)));
  } else if (path.isAbsolute(t)) {
    candidates.push(t);
  } else {
    candidates.push(path.join(repoRoot, t));
  }
  for (const p of candidates) {
    try {
      return await readFileUtf8(p);
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * @param {Record<string, string>} parsed
 * @param {Set<string>} allowKeys
 * @returns {{ merged: Record<string, string>; ignoredKeys: string[] }}
 */
export function pickAllowlistedDotEnv(parsed, allowKeys) {
  /** @type {Record<string, string>} */
  const merged = {};
  /** @type {string[]} */
  const ignoredKeys = [];
  for (const [k, v] of Object.entries(parsed)) {
    if (allowKeys.has(k)) {
      merged[k] = String(v).trim();
    } else {
      ignoredKeys.push(k);
    }
  }
  return { merged, ignoredKeys };
}

/**
 * @param {object} opts
 * @param {string} opts.line
 * @param {string} opts.primaryKey
 * @param {Set<string>} opts.allowKeys
 * @param {string} opts.repoRoot
 * @param {() => string} opts.homedir
 * @param {(absPath: string) => Promise<string>} opts.readFileUtf8
 * @returns {Promise<{ merged: Record<string, string>; primary: string; ignoredKeys: string[] }>}
 */
export async function resolveSecretInputLine(opts) {
  const { line, primaryKey, allowKeys, repoRoot, homedir: homedirFn, readFileUtf8 } = opts;
  const t = line.trim();
  if (!t) {
    return { merged: {}, primary: '', ignoredKeys: [] };
  }

  const fromFile = await tryReadUserPathAsFile(t, repoRoot, homedirFn, readFileUtf8);
  if (fromFile !== null) {
    const parsed = parseDotEnv(fromFile);
    const { merged, ignoredKeys } = pickAllowlistedDotEnv(parsed, allowKeys);
    if (Object.keys(merged).length > 0) {
      return {
        merged,
        primary: merged[primaryKey] ?? '',
        ignoredKeys,
      };
    }
    return {
      merged: {},
      primary: fromFile.trim(),
      ignoredKeys,
    };
  }

  const parsedInline = parseDotEnv(t);
  const { merged, ignoredKeys } = pickAllowlistedDotEnv(parsedInline, allowKeys);
  if (Object.keys(merged).length > 0) {
    return {
      merged,
      primary: merged[primaryKey] ?? '',
      ignoredKeys,
    };
  }

  return { merged: {}, primary: t, ignoredKeys: [] };
}
