const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const { sourceExts = [] } = config.resolver || {};

// Allow CommonJS modules with .cjs extension
config.resolver.sourceExts = Array.from(new Set([...sourceExts, 'cjs']));

// Enable package exports resolution (needed for axios 1.x)
config.resolver.unstable_enablePackageExports = true;

// Use minimal workers
config.maxWorkers = 2;

module.exports = config;
