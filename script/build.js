'use strict';

const fsp = require('fs/promises');
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
    // build preload.css
    fsp.readFile(path.join(__dirname, '../src/preload.less'), 'utf8').then(str => {
        return less.render(str);
    }).then(out => {
        const o2 = new CleanCSS({ level: 2 }).minify(out.css);
        fsp.writeFile(path.join(__dirname, '../dist/preload.css'), o2.styles);
    }).catch(e => {
        console.error('Error when processing "preload.less":');
        console.error(e);
        process.exitCode = 1;
    });
});
