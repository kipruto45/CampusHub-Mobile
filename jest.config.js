module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/android/'],
  clearMocks: true,
};
