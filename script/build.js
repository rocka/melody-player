'use strict';

const webpack = require('webpack');

if (process.argv.includes('--dev')) {
    process.env.NODE_ENV = 'development';
} else if (process.argv.includes('--prod')) {
    process.env.NODE_ENV = 'production';
}

webpack(require('./webpack.conofig'), (err, stats) => {
    process.stdout.write(stats.toString({ colors: true }));
    if (err || stats.hasErrors()) {
        process.exitCode = 1;
    }
});
