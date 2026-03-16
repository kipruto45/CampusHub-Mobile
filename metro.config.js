const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude build directories from watching to fix ENOSPC error
config.resolver.blockList = [
  /android\/.*/,
  /ios\/.*/,
  /\.expo\/.*/,
];

// Force resolution of axios from project node_modules to avoid "module not found" during bundling
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  axios: path.resolve(__dirname, 'node_modules/axios'),
};

// Enable package exports resolution (needed for axios 1.x)
config.resolver.unstable_enablePackageExports = true;

// Use minimal workers
config.maxWorkers = 2;

module.exports = config;
