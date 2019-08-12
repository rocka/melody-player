'use strict';

const { resolve, join } = require('path');

const context = resolve(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';

const cfg = {
    mode: process.env.NODE_ENV,
    context,
    entry: {
        player: './src/player.jsx'
    },
    output: {
        path: join(context, 'dist'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        plugins: [
                            ['@babel/plugin-transform-react-jsx', { pragma: 'h' }],
                        ]
                    }
                }
            },
            {
                test: /\.less$/,
                use: [
                    { loader: 'css-loader' },
                    { loader: 'less-loader' }
                ]
            },
            {
                test: /\.woff2$/,
                use: { loader: 'url-loader' }
            }
        ]
    }
};

if (isProd) {
    cfg.devtool = 'source-map';
    cfg.output.filename = '[name].min.js';
    cfg.module.rules[1].use.splice(1, 0, { loader: 'clean-css-loader', options: { level: 2 } });
}

module.exports = cfg;
