import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const commonConfig: webpack.Configuration = {
    context: path.resolve(__dirname, '../'),
    entry: {
        index: './src/index.tsx',
        benes: './src/benes.tsx',
        construction: './src/construction.tsx',
    },
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: '[name].[contenthash].js',
        chunkFilename: '[name].[contenthash].bundle.js',
        assetModuleFilename: 'assets/[name].[hash][ext][query]',
        clean: true,
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        alias: {
            '@': path.resolve(__dirname, '../src'),
        },
    },
    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                use: 'babel-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.module\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            modules: {
                                localIdentName:
                                    '[name]__[local]-[hash:base64:5]',
                            },
                        },
                    },
                    'postcss-loader',
                ],
            },
            {
                test: /\.css$/,
                exclude: /\.module\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'postcss-loader',
                ],
            },
            {
                test: /\.(png|jpg|gif|svg|webp)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'assets/[path][name].[hash:base64:5].[ext]',
                            context: 'src',
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            filename: 'index.html',
            chunks: ['index'],
        }),
        new HtmlWebpackPlugin({
            template: './public/construction.html',
            filename: 'construction.html',
            chunks: ['construction'],
        }),
        new HtmlWebpackPlugin({
            template: './public/benes.html',
            filename: 'benes.html',
            chunks: ['benes'],
        }),
        new CleanWebpackPlugin(),
        new MiniCssExtractPlugin({
            filename: 'css/[name].[contenthash].css',
            chunkFilename: 'css/[id].css',
            ignoreOrder: false,
        }),
    ],
};

export default commonConfig;
