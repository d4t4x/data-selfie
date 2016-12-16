var debug = process.env.NODE_ENV !== "prod";
var webpack = require('webpack');
var CleanWebpackPlugin = require('clean-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var copyPatterns = [
    { from: "./manifest.json", to: "../manifest.json" },
    { from: "./img", to: "../img" },
    { from: "./css", to: "../css" },
    { from: "./views", to: "../views" }
];

module.exports = {
    context: __dirname + "/src",
    devtool: debug ? "inline-sourcemap" : null,
    entry: {
        content: "./js/content.js",
        background: "./js/background.js",
        me: "./js/views/me.js",
        options: "./js/views/options.js",
        popup: "./js/views/popup.js"
    },
    output: {
        path: __dirname + "/build/js",
        filename: "[name].js"
    },
    module: {
        loaders: [{
            test: /\.scss$/,
            loaders: ["style-loader", "css-loader", "sass-loader"]
        }]
    },
    plugins: debug ? [
        new CleanWebpackPlugin(['build']),
        new webpack.ProvidePlugin({ '$': 'jquery', 'Dexie': 'dexie', 'moment': 'moment', '_': 'lodash' }),
        new CopyWebpackPlugin(copyPatterns)
    ] : [
        new CleanWebpackPlugin(['build']),
        new webpack.ProvidePlugin({ '$': 'jquery', 'Dexie': 'dexie', 'moment': 'moment', '_': 'lodash' }),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.optimize.UglifyJsPlugin({ mangle: false, sourcemap: false, compress: false }),
        new CopyWebpackPlugin(copyPatterns),
    ],
};
