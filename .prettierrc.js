/**
 * Prettier configuration
 * Moved from package.json to satisfy Task 1.11 requirements
 */
module.exports = {
  tabWidth: 2,
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss'],
};
