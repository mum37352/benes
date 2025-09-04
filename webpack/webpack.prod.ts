import CompressionPlugin from 'compression-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { merge } from 'webpack-merge';

import commonConfig from './webpack.common.ts';

const isAnalyze = process.env.ANALYZE === 'true';

const prodConfig: webpack.Configuration = {
    mode: 'production',
    devtool: 'source-map',
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                    },
                    output: {
                        comments: /@license|@preserve/i,
                    },
                },
            }),
            new CssMinimizerPlugin({
                minimizerOptions: {
                    preset: [
                        'default',
                        {
                            discardComments: { removeAll: true },
                        },
                    ],
                },
            }),
        ],
        splitChunks: {
            cacheGroups: {
                default: false,
                vendors: false,
            }
        }
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
        }),
        new CompressionPlugin({
            filename: '[path][base].gz',
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 8192,
            minRatio: 0.8,
        }),
        ...(isAnalyze
            ? [
                  new BundleAnalyzerPlugin({
                      analyzerMode: 'static',
                      logLevel: 'info',
                      defaultSizes: 'gzip',
                      generateStatsFile: true,
                      reportFilename: 'bundle-analyzer.html',
                  }),
              ]
            : []),
    ],
};

export default merge(commonConfig, prodConfig);
