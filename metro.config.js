const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude build directories from watching to fix ENOSPC error
config.resolver.blockList = [
  /node_modules\/.*\/android\/build\/.*/,
  /node_modules\/.*\/ios\/build\/.*/,
  /node_modules\/.*\/build\/.*/,
  /\.expo\/.*/,
  /android\/.*/,
  /ios\/.*/,
];

// Use minimal workers
config.maxWorkers = 2;

module.exports = config;
