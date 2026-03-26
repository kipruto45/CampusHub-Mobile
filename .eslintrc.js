module.exports = {
  extends: [
    'expo',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', {
      varsIgnorePattern: '^_',
      argsIgnorePattern: '^_',
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    }],
    'react-hooks/exhaustive-deps': 'warn',
  },
};
