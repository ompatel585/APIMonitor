module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'boundaries'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'eslint-config-prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
  settings: {
    'boundaries/elements': [
      { type: 'modules', pattern: 'src/modules/*' },
      { type: 'infrastructure', pattern: 'src/infrastructure/*' },
      { type: 'common', pattern: 'src/common/*' },
      { type: 'config', pattern: 'src/config/*' },
      { type: 'workers', pattern: 'src/workers/*' },
      { type: 'health', pattern: 'src/health/*' },
    ],
  },
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
    'no-console': 'error',
    'boundaries/element-types': [
      'error',
      {
        default: 'allow',
        rules: [
          { from: 'infrastructure', disallow: ['modules', 'workers'], message: 'infrastructure/ must never import from modules/ or workers/.' },
          { from: 'common', disallow: ['modules', 'workers'], message: 'common/ must never import from modules/ or workers/.' },
          { from: 'config', disallow: ['modules', 'infrastructure', 'workers'], message: 'config/ must be leaf-level; nothing else may be imported into it.' },
        ],
      },
    ],
  },
};
