require('babel-polyfill')

// Webpack config for creating the production bundle.
const path = require('path')
const jsreportStudioDev = require('jsreport-studio-dev')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
const CleanPlugin = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const webpack = jsreportStudioDev.deps.webpack

const projectRootPath = path.resolve(__dirname, '../')
const assetsPath = path.resolve(projectRootPath, './static/dist')

module.exports = {
  mode: 'production',
  devtool: 'hidden-source-map',
  context: path.resolve(__dirname, '..'),
  entry: {
    'main': [
      './src/client.js',
      'font-awesome-webpack-4!./src/theme/font-awesome.config.prod.js'
    ]
  },
  output: {
    path: assetsPath,
    filename: 'client.js',
    chunkFilename: '[name].client.js',
    // this makes the worker-loader bundle to work fine at runtime, otherwise you
    // will see error in the web worker
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        include: [path.resolve(__dirname, '../src/components/Editor/workers')],
        use: [{
          loader: 'worker-loader',
          options: {
            name: '[name].js'
          }
        }]
      },
      {
        test: /\.jsx?$/,
        exclude: (modulePath) => {
          if (modulePath.includes('eslint-browser.js')) {
            return true
          }

          if (modulePath.includes('node_modules')) {
            return true
          }

          return false
        },
        use: ['babel-loader']
      },
      {
        test: /\.css$/,
        include: [path.resolve(__dirname, '../node_modules/monaco-editor')],
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              importLoaders: 2,
              sourceMap: true,
              localIdentName: '[local]___[hash:base64:5]'
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: getPostcssPlugins
            }
          },
          {
            loader: 'less-loader',
            options: {
              outputStyle: 'expanded',
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.scss$/,
        exclude: [/.*theme.*/],
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              importLoaders: 2,
              sourceMap: true,
              localIdentName: '[local]___[hash:base64:5]'
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: getPostcssPlugins
            }
          },
          {
            loader: 'sass-loader',
            options: {
              outputStyle: 'expanded',
              sourceMap: true
            }
          }
        ]
      },
      {
        include: [/.*theme.*\.scss/],
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: getPostcssPlugins
            }
          },
          {
            loader: 'sass-loader',
            options: {
              outputStyle: 'expanded'
            }
          }
        ]
      },
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 10000,
            mimetype: 'application/font-woff'
          }
        }]
      },
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 10000,
            mimetype: 'application/font-woff'
          }
        }]
      },
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 10000,
            mimetype: 'application/octet-stream'
          }
        }]
      },
      {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        use: ['file-loader']
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 10000,
            mimetype: 'image/svg+xml'
          }
        }]
      },
      {
        test: /\.(png|jpg)$/,
        use: [{
          loader: 'url-loader',
          options: {
            limit: 8192
          }
        }]
      }
    ],
    noParse: /eslint-browser\.js$/
  },
  resolve: {
    extensions: ['.json', '.js', '.jsx'],
    alias: {
      'eslint-browser': path.join(__dirname, '../static/dist/eslint-browser.js')
    },
    modules: [
      'src',
      'node_modules',
      path.join(__dirname, '../node_modules')
    ]
  },
  resolveLoader: {
    modules: [
      path.join(__dirname, '../node_modules'),
      path.join(__dirname, '../node_modules/jsreport-studio-dev/node_modules')
    ]
  },
  plugins: [
    new CleanPlugin({
      cleanOnceBeforeBuildPatterns: ['**/*', '!eslint-browser.js']
    }),
    new webpack.DefinePlugin({
      __DEVELOPMENT__: false
    }),
    // ignore dev config
    new webpack.IgnorePlugin(/\.\/dev/, /\/config$/),
    new MonacoWebpackPlugin({
      languages: ['xml', 'html', 'handlebars', 'css', 'json', 'javascript', 'typescript'],
      // we exclude some features
      features: ['!iPadShowKeyboard', '!dnd']
    }),
    new HtmlWebpackPlugin({
      hash: true,
      template: path.join(__dirname, '../static/index.html')
    }),
    new webpack.ProgressPlugin()
  ]
}

function getPostcssPlugins () {
  return [
    jsreportStudioDev.deps['postcss-flexbugs-fixes'],
    jsreportStudioDev.deps.autoprefixer
  ]
}
