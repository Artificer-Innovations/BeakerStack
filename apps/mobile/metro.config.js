const { getDefaultConfig } = require('expo/metro-config');
// Metro 0.84+ only exports this helper under the private path.
const exclusionList =
  require('metro-config/private/defaults/exclusionList').default;
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const loggerPkg = path.resolve(projectRoot, '../../packages/logger');
const sharedPkg = path.resolve(projectRoot, '../../packages/shared');
const billingPkg = path.resolve(projectRoot, '../../packages/billing');
const observabilityPkg = path.resolve(
  projectRoot,
  '../../packages/observability'
);

const config = getDefaultConfig(projectRoot);

// Store the default resolver to preserve Expo's behavior
const defaultResolver = config.resolver.resolveRequest;

// keep your .native priority bit (unchanged)
const { sourceExts } = config.resolver;
const otherExts = sourceExts.filter(e => !e.includes('.native'));
const nativeExts = sourceExts.filter(e => e.includes('.native'));
config.resolver.sourceExts = [
  '.native.tsx',
  '.native.ts',
  ...nativeExts.filter(e => e !== '.native.tsx' && e !== '.native.ts'),
  ...otherExts,
];

const adopterDir = path.resolve(projectRoot, '../../adopter');

// Only watch what we need
config.watchFolders = [
  loggerPkg,
  sharedPkg,
  billingPkg,
  observabilityPkg,
  adopterDir,
];

// Resolve node_modules (mobile first, then root)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// ✅ Safer excludes: target your repo's build outputs explicitly,
// not generic "build" anywhere (which breaks expo/build).
// Note: We must NOT block .expo/metro/ which Metro needs for polyfills
config.resolver.blockList = exclusionList([
  // web app outputs
  new RegExp(
    `${path.sep}apps${path.sep}web${path.sep}(dist|build)${path.sep}.*`
  ),

  // typical junk/caches
  /[/\\]coverage[/\\].*/,
  /[/\\]\.next[/\\].*/,
  /[/\\]\.turbo[/\\].*/,
  /[/\\]storybook-static[/\\].*/,
  /[/\\]node_modules[/\\]\.cache[/\\].*/,
  // Block .expo subdirectories but NOT .expo/metro (which Metro needs)
  /[/\\]\.expo[/\\](cache|logs)[/\\].*/,
  /[/\\]\.gradle[/\\].*/,
  /[/\\]\.git[/\\].*/,
]);

// Metro alias for expo/virtual/env -> shim file
// This prevents build failures if a stray import remains in shared code
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo/virtual/env') {
    return {
      filePath: path.resolve(projectRoot, 'shims/expo-virtual-env.js'),
      type: 'sourceFile',
    };
  }

  if (typeof moduleName === 'string' && moduleName.startsWith('@adopter/')) {
    const subpath = moduleName.slice('@adopter/'.length);
    const base = path.join(adopterDir, subpath);
    const candidates = [
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.native.ts`,
      `${base}.native.tsx`,
      path.join(base, 'index.ts'),
      path.join(base, 'index.tsx'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return { filePath: candidate, type: 'sourceFile' };
      }
    }
  }

  const workspacePackageAliases = {
    '@beakerstack/observability': path.join(observabilityPkg, 'src/index.ts'),
    '@beakerstack/observability/web': path.join(observabilityPkg, 'src/web.ts'),
    '@beakerstack/observability/native': path.join(
      observabilityPkg,
      'src/native.ts'
    ),
    '@beakerstack/observability/edge': path.join(
      observabilityPkg,
      'src/edge.ts'
    ),
  };
  if (workspacePackageAliases[moduleName]) {
    return {
      filePath: workspacePackageAliases[moduleName],
      type: 'sourceFile',
    };
  }

  // TypeScript ESM style: `from './foo.js'` in source; Metro looks for a real .js file.
  // Map to .ts / .tsx (and platform .native.*) when present (e.g. packages/billing).
  if (
    typeof moduleName === 'string' &&
    moduleName.startsWith('.') &&
    moduleName.endsWith('.js') &&
    context.originModulePath
  ) {
    const originDir = path.dirname(context.originModulePath);
    const stem = moduleName.replace(/\.js$/, '');
    const relativeCandidates = [
      `${stem}.ts`,
      `${stem}.tsx`,
      `${stem}.native.ts`,
      `${stem}.native.tsx`,
    ];
    for (const rel of relativeCandidates) {
      const candidate = path.normalize(path.join(originDir, rel));
      if (fs.existsSync(candidate)) {
        return { filePath: candidate, type: 'sourceFile' };
      }
    }
  }

  // Fall back to default Expo resolver for everything else
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }

  // If no default resolver, use Metro's default
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
