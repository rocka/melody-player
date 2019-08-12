'use strict';

const fs = require('fs');
const path = require('path');
const less = require('less');
const webpack = require('webpack');
const CleanCSS = require('clean-css');

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

const preloadCss = fs.readFileSync(path.join(__dirname, '../src/preload.less'), 'utf8');
less.render(preloadCss).then(r => {
    const o = new CleanCSS({ level: 2 }).minify(r.css);
    fs.writeFileSync(path.join(__dirname, '../dist/preload.css'), o.styles);
}).catch(e => {
    console.error('Error when processing "preload.less":');
    console.error(e);
    process.exitCode = 1;
});
