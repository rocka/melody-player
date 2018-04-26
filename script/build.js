'use strict';

const webpack = require('webpack');

const cfg = require('./webpack.conofig');

webpack(cfg, (err, stats) => {
    process.stdout.write(stats.toString({ colors: true }));
    if (err || stats.hasErrors()) {
        process.exitCode = 1;
    }
});
