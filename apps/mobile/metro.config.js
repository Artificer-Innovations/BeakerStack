const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const sharedPkg = path.resolve(projectRoot, '../../packages/shared');

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

// Only watch what we need
config.watchFolders = [sharedPkg];

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
  new RegExp(`${path.sep}apps${path.sep}web${path.sep}(dist|build)${path.sep}.*`),

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
  
  // Fall back to default Expo resolver for everything else
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  
  // If no default resolver, use Metro's default
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
