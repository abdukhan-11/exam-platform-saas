module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-this-alias': 'warn',
    'prefer-const': 'warn',
    '@next/next/no-img-element': 'off',
    'react/no-unescaped-entities': 'warn',
  },
  overrides: [
    {
      files: ['src/lib/security/**/*.ts'],
      rules: {},
    },
  ],
};
