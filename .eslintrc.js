module.exports = {
    env: {
        browser: true,
        es2021: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    globals: {
        'PullToRefresh': 'readonly'
    },
    rules: {
        'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
        'no-console': 'warn',
        'prefer-const': 'error',
        'no-var': 'error',
        'eqeqeq': 'error',
        'curly': 'error',
        'semi': ['error', 'always'],
        'quotes': ['error', 'single', { 'avoidEscape': true }]
    }
};