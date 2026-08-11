const path = require('path');
const webpack = require('webpack');

/**
 * Both configs derive `mode` and `devtool` from the CLI so that the packaged build is
 * explicitly minified rather than relying on webpack-cli flag-over-config precedence.
 * Production uses hidden-source-map: maps are emitted but not referenced, and .vscodeignore
 * keeps them out of the .vsix.
 */
module.exports = (env, argv) => {
  const mode = (argv && argv.mode) || 'none';
  const devtool = mode === 'production' ? 'hidden-source-map' : 'source-map';

  const extensionConfig = {
    target: 'node',
    mode,
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2'
    },
    externals: {
      vscode: 'commonjs vscode',
      // Optional native add-ons used by the 'ws' package for performance — not required
      bufferutil: 'commonjs bufferutil',
      'utf-8-validate': 'commonjs utf-8-validate',
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.json'
              }
            }
          ]
        }
      ]
    },
    devtool,
    infrastructureLogging: {
      level: "log",
    },
  };

  const webviewConfig = {
    target: 'web',
    mode,
    entry: './webview/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'webview.js',
      libraryTarget: 'umd',
      globalObject: 'self'
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
      fallback: {
        path: false,
        fs: false,
        process: false
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.webview.json'
              }
            }
          ]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          // Inline font files as base64 data URIs so they work in VS Code webview sandboxes
          // without any external network requests or vscode-resource URI handling.
          test: /\.(woff2?)$/,
          type: 'asset/inline'
        }
      ]
    },
    devtool,
    infrastructureLogging: {
      level: "log",
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
      })
    ],
    performance: {
      hints: false
    }
  };

  return [extensionConfig, webviewConfig];
};
