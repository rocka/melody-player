module.exports = {
    extends: 'eslint:recommended',
    env: {
        es6: true,
        browser: true
    },
    globals: {
        PLAYER_STYLE: true,
        PLAYER_FONT_FACE: true
    },
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 8,
        ecmaFeatures: {
            jsx: true,
            experimentalObjectRestSpread: true
        }
    },
    rules: {
        semi: 'error'
    }
};
