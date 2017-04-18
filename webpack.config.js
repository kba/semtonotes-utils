const webpack = require('webpack');
const path = require('path');

// detect if webpack bundle is being processed in a production or development env
let prodBuild = require('yargs').argv.p || false;

const config = {
    entry: {
        core: './index.js',
    },
    node: { fs: "empty" },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: `xrx-utils.js`,
        library: 'XrxUtils',
        libraryTarget: 'umd'
    },
    externals: {
        'semtonotes-client': 'xrx',
    },
    module: {
        rules: [
            {
                test: /.*\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader?cacheDirectory',
                options: {
                    presets: ['env']
                }
            }
        ]
    },
    devtool: prodBuild ? 'source-map' : 'eval-source-map',
};

module.exports = config;
