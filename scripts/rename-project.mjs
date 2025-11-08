#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import url from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const ANSI_PATTERN = /\u001B\[[0-9;]*[A-Za-z]/g;

function stripAnsi(value) {
  if (!value) {
    return '';
  }
  return value.replace(ANSI_PATTERN, '');
}

const DEFAULT_IGNORE_DIRS = new Set([
  '.git',
  '.turbo',
  '.expo',
  '.husky',
  '.idea',
  '.next',
  '.vscode',
  'node_modules',
  'android',
  'ios',
  'dist',
  'build',
  'coverage'
]);

const DEFAULT_IGNORE_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'Podfile.lock',
  'Gemfile.lock'
]);

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.zip',
  '.gz',
  '.jar',
  '.keystore',
  '.db',
  '.sqlite',
  '.mp3',
  '.mp4'
]);

export function tokenizeName(name) {
  if (!name || typeof name !== 'string') {
    throw new TypeError('Name must be a non-empty string');
  }

  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

export function capitalize(word) {
  if (!word) {
    return word;
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function buildNameVariants(name) {
  const tokens = tokenizeName(name);

  if (tokens.length === 0) {
    throw new Error('Unable to derive tokens from name');
  }

  const titleCase = tokens.map(capitalize).join(' ');
  const pascalCase = tokens.map(capitalize).join('');
  const camelCase = [tokens[0], ...tokens.slice(1).map(capitalize)].join('');
  const kebabCase = tokens.join('-');
  const snakeCase = tokens.join('_');
  const upperSnakeCase = tokens.map((token) => token.toUpperCase()).join('_');
  const upperFlat = tokens.map((token) => token.toUpperCase()).join('');
  const flatLower = tokens.join('');

  return {
    original: name,
    tokens,
    titleCase,
    pascalCase,
    camelCase,
    kebabCase,
    snakeCase,
    upperSnakeCase,
    upperFlat,
    flatLower
  };
}

function uniquePairs(pairs) {
  const map = new Map();
  for (const pair of pairs) {
    const key = pair.from;
    if (!key || key === pair.to) {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, pair);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.from.length - a.from.length);
}

export function buildReplacementPairs(fromName, toName) {
  const fromVariants = buildNameVariants(fromName);
  const toVariants = buildNameVariants(toName);

  const pairs = [
    { from: fromVariants.original, to: toVariants.original, description: 'Original casing' },
    { from: fromVariants.titleCase, to: toVariants.titleCase, description: 'Title case' },
    { from: fromVariants.pascalCase, to: toVariants.pascalCase, description: 'PascalCase' },
    { from: fromVariants.camelCase, to: toVariants.camelCase, description: 'camelCase' },
    { from: fromVariants.kebabCase, to: toVariants.kebabCase, description: 'kebab-case' },
    { from: fromVariants.snakeCase, to: toVariants.snakeCase, description: 'snake_case' },
    { from: fromVariants.upperSnakeCase, to: toVariants.upperSnakeCase, description: 'SCREAMING_SNAKE_CASE' },
    { from: fromVariants.upperFlat, to: toVariants.upperFlat, description: 'UPPERFLAT' },
    { from: fromVariants.flatLower, to: toVariants.flatLower, description: 'flatlower' }
  ];

  return {
    variants: { from: fromVariants, to: toVariants },
    replacements: uniquePairs(pairs)
  };
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    verbose: false,
    strict: false,
    skipSupabaseCheck: false,
    from: undefined,
    to: undefined
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];

    if (value === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (value === '--verbose') {
      args.verbose = true;
      continue;
    }

    if (value === '--strict') {
      args.strict = true;
      continue;
    }

    if (value === '--no-supabase-check') {
      args.skipSupabaseCheck = true;
      continue;
    }

    if (value.startsWith('--from=')) {
      args.from = value.slice('--from='.length);
      continue;
    }

    if (value === '--from') {
      args.from = argv[i + 1];
      i += 1;
      continue;
    }

    if (value.startsWith('--to=')) {
      args.to = value.slice('--to='.length);
      continue;
    }

    if (value === '--to') {
      args.to = argv[i + 1];
      i += 1;
      continue;
    }
  }

  return args;
}

function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

async function walkDirectory(dir, ignoreDirs = DEFAULT_IGNORE_DIRS) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) {
        continue;
      }

      const nested = await walkDirectory(entryPath, ignoreDirs);
      files.push(...nested);
    } else if (entry.isFile()) {
      if (DEFAULT_IGNORE_FILES.has(entry.name) || isBinaryFile(entryPath)) {
        continue;
      }

      files.push(entryPath);
    }
  }

  return files;
}

function isProbablyText(buffer) {
  const length = Math.min(buffer.length, 24);
  for (let i = 0; i < length; i += 1) {
    if (buffer[i] === 0) {
      return false;
    }
  }

  return true;
}

async function readTextFile(filePath) {
  const buffer = await fs.readFile(filePath);
  if (!isProbablyText(buffer)) {
    return null;
  }

  return buffer.toString('utf8');
}

function replaceAll(content, replacements) {
  let updated = content;
  let replacementsMade = 0;

  for (const { from, to } of replacements) {
    if (!from) {
      continue;
    }

    const parts = updated.split(from);
    if (parts.length > 1) {
      replacementsMade += parts.length - 1;
      updated = parts.join(to);
    }
  }

  return { updated, replacementsMade };
}

export function findRemainingOccurrences(content, patterns) {
  const matches = [];

  for (const pattern of patterns) {
    if (!pattern || pattern.trim() === '') {
      continue;
    }

    if (content.includes(pattern)) {
      matches.push(pattern);
    }
  }

  return matches;
}

async function processFile(filePath, replacements, options) {
  const original = await readTextFile(filePath);
  if (original === null) {
    return { changed: false, replacements: 0 };
  }

  const { updated, replacementsMade } = replaceAll(original, replacements);

  if (replacementsMade === 0) {
    return { changed: false, replacements: 0 };
  }

  if (options.dryRun) {
    return { changed: true, replacements: replacementsMade };
  }

  await fs.writeFile(filePath, updated, 'utf8');
  return { changed: true, replacements: replacementsMade };
}

async function collectRemainingMatches(files, patterns) {
  const occurrences = [];

  for (const file of files) {
    const content = await readTextFile(file);
    if (content === null) {
      continue;
    }

    const matches = findRemainingOccurrences(content, patterns);
    if (matches.length > 0) {
      occurrences.push({ file, matches: Array.from(new Set(matches)) });
    }
  }

  return occurrences;
}

function logUsage() {
  const relativeScript = path.relative(repoRoot, __filename);
  console.log(`Usage: npm run rename -- --from "Old Name" --to "New Name" [--dry-run] [--strict] [--verbose]`);
  console.log('');
  console.log('Options:');
  console.log('  --from "Old Name"     Existing project name (display form).');
  console.log('  --to "New Name"       Replacement project name (display form).');
  console.log('  --dry-run             Show files that would change without writing.');
  console.log('  --strict              Exit with failure if any legacy names remain.');
  console.log('  --no-supabase-check   Skip the running Supabase instance guard.');
  console.log('  --verbose             Print detailed progress information.');
  console.log('');
  console.log(`Example: npm run rename -- --from "Beaker Stack" --to "Acme App"`);
  console.log(`Script: ${relativeScript}`);
}

function checkSupabaseStatus(verbose = false) {
  const logVerbose = (message) => {
    if (verbose) {
      console.log(`[supabase-check] ${message}`);
    }
  };

  try {
    let jsonResult = null;
    try {
      jsonResult = spawnSync('supabase', ['status', '--output', 'json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      logVerbose(`Supabase CLI not available: ${error instanceof Error ? error.message : error}`);
    }

    if (jsonResult && jsonResult.status === 0 && jsonResult.stdout.trim()) {
      try {
        const data = JSON.parse(jsonResult.stdout);
        const services = Object.values(data.services ?? {});
        const running = services.filter(
          (service) => String(service.state || '').toUpperCase() === 'RUNNING'
        );
        if (running.length > 0) {
          return {
            projectId: data.project_id ?? data.projectId ?? data.projectRef ?? null,
            running
          };
        }
      } catch (error) {
        logVerbose(
          `Failed to parse Supabase status JSON: ${error instanceof Error ? error.message : error}`
        );
      }
    } else if (jsonResult && jsonResult.status !== 0 && jsonResult.stderr.trim()) {
      logVerbose(`Supabase status command failed: ${jsonResult.stderr.trim()}`);
    }

    const textResult = spawnSync('supabase', ['status'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    if (textResult.error) {
      logVerbose(`Supabase CLI not available (fallback): ${textResult.error.message}`);
      return null;
    }

    if (textResult.status !== 0) {
      logVerbose(`Supabase status (fallback) exited with ${textResult.status}`);
      return null;
    }

    const stdoutRaw = (textResult.stdout || '') + '\n' + (textResult.stderr || '');
    const stdout = stripAnsi(stdoutRaw);
    const normalized = stdout.toLowerCase();

    if (/\bis running\b/.test(normalized)) {
      const projectMatch =
        stdout.match(/supabase_[a-z]+_([A-Za-z0-9_-]+)/) ||
        stdout.match(/Project ID:\s*([A-Za-z0-9_-]+)/i);

      return {
        projectId: projectMatch ? projectMatch[1] : null,
        running: [{ name: 'Supabase local development stack' }]
      };
    }

    const running = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /\bRUNNING\b/i.test(line));

    if (running.length === 0) {
      return { projectId: null, running: [] };
    }

    return {
      projectId: null,
      running: running.map((line) => ({ name: line }))
    };
  } catch (error) {
    logVerbose(`Supabase status check failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.from || !args.to) {
    console.error('Error: --from and --to arguments are required.');
    logUsage();
    process.exitCode = 1;
    return;
  }

  if (!args.skipSupabaseCheck) {
    const supabaseStatus = checkSupabaseStatus(args.verbose);
    if (supabaseStatus?.running?.length) {
      const projectIdText = supabaseStatus.projectId
        ? ` (project ID: ${supabaseStatus.projectId})`
        : '';
      console.error(
        `Supabase services appear to be running${projectIdText}. Please stop them before renaming.`
      );
      console.error(
        'Recommended: `supabase stop` or `supabase stop --project-id <your-project>`; ' +
          'then rerun this command.'
      );
      console.error(
        'Use --no-supabase-check to bypass this safety check if you are sure Supabase is not needed.'
      );
      process.exitCode = 1;
      return;
    }
  }

  const { replacements, variants } = buildReplacementPairs(args.from, args.to);
  const files = await walkDirectory(repoRoot);

  const stats = {
    filesChanged: 0,
    replacements: 0,
    examined: files.length
  };

  const changedFiles = [];

  for (const file of files) {
    const { changed, replacements: count } = await processFile(file, replacements, args);
    if (changed) {
      stats.filesChanged += 1;
      stats.replacements += count;
      changedFiles.push({ file, count });

      if (args.verbose) {
        console.log(`${args.dryRun ? '[dry-run]' : '[update]'} ${path.relative(repoRoot, file)} (${count} replacements)`);
      }
    }
  }

  const searchPatterns = replacements.map((item) => item.from);
  const remaining = await collectRemainingMatches(files, searchPatterns);

  console.log('');
  console.log('Rename Summary');
  console.log('--------------');
  console.log(`Files scanned:      ${stats.examined}`);
  console.log(`Files ${args.dryRun ? 'to update' : 'updated'}: ${stats.filesChanged}`);
  console.log(`Total replacements: ${stats.replacements}`);

  if (remaining.length > 0) {
    console.log('');
    console.log('Warning: Legacy name instances remain after processing.');
    for (const entry of remaining) {
      const relative = path.relative(repoRoot, entry.file);
      console.log(`  ${relative}: ${entry.matches.join(', ')}`);
    }

    if (args.strict) {
      console.error('\nRename failed due to remaining legacy identifiers (strict mode).');
      process.exitCode = 1;
      return;
    }
  }

  if (args.dryRun) {
    console.log('\nDry-run complete. Re-run without --dry-run to apply changes.');
  } else {
    console.log('\nRename complete.');
  }
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error('Rename script failed.');
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}

