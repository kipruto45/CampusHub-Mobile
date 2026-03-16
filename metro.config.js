const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const { sourceExts = [] } = config.resolver || {};
const defaultResolveRequest = config.resolver.resolveRequest;

// Exclude build directories from watching to fix ENOSPC error
config.resolver.blockList = [
  /android\/.*/,
  /ios\/.*/,
  /\.expo\/.*/,
];

// Allow CommonJS modules with .cjs extension (axios ships CJS builds)
config.resolver.sourceExts = Array.from(new Set([...sourceExts, 'cjs']));

// Force resolution of axios from project node_modules to avoid "module not found" during bundling
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  axios: path.resolve(__dirname, 'node_modules/axios'),
};

// Enable package exports resolution (needed for axios 1.x)
config.resolver.unstable_enablePackageExports = true;

// Hard alias axios to its commonjs entry to satisfy Metro
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/axios/index.js'),
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Use minimal workers
config.maxWorkers = 2;

module.exports = config;
