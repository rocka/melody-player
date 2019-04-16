module.exports = {
    extends: 'eslint:recommended',
    env: {
        es6: true,
        node: true,
        browser: true
    },
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 8,
        ecmaFeatures: {
            jsx: true,
        }
    },
    rules: {
        semi: 'error'
    }
};
