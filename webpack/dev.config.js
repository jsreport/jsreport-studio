require('babel-polyfill')

// Webpack config for development
const fs = require('fs')
const path = require('path')
const jsreportStudioDev = require('jsreport-studio-dev')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
const assetsPath = path.resolve(__dirname, '../static/dist')
const babelrc = fs.readFileSync(path.join(__dirname, '../.babelrc'))
let babelrcObject = {}

const webpack = jsreportStudioDev.deps.webpack

try {
  babelrcObject = JSON.parse(babelrc)
} catch (err) {
  console.error('==>     ERROR: Error parsing your .babelrc.')
  console.error(err)
}

const babelrcObjectDevelopment = babelrcObject.env && babelrcObject.env.development || {}

// merge global and dev-only plugins
let combinedPlugins = babelrcObject.plugins || []

combinedPlugins = combinedPlugins.concat(babelrcObjectDevelopment.plugins)

const babelLoaderQuery = Object.assign({}, babelrcObjectDevelopment, babelrcObject, { plugins: combinedPlugins })

delete babelLoaderQuery.env

// Since we use .babelrc for client and server, and we don't want HMR enabled on the server, we have to add
// the babel plugin react-transform-hmr manually here.

// make sure react-transform is enabled
babelLoaderQuery.plugins = babelLoaderQuery.plugins || []
let reactTransform = null

for (let i = 0; i < babelLoaderQuery.plugins.length; ++i) {
  const plugin = babelLoaderQuery.plugins[i]
  if (Array.isArray(plugin) && plugin[0] === 'react-transform') {
    reactTransform = plugin
  }
}

if (!reactTransform) {
  reactTransform = [require.resolve('babel-plugin-react-transform'), { transforms: [] }]
  babelLoaderQuery.plugins.push(reactTransform)
}

for (let j = 0; j < babelLoaderQuery.plugins.length; j++) {
  if (typeof babelLoaderQuery.plugins[j] === 'string') {
    babelLoaderQuery.plugins[j] = require.resolve('babel-plugin-' + babelLoaderQuery.plugins[j])
  }

  if (Array.isArray(babelLoaderQuery.plugins[j])) {
    babelLoaderQuery.plugins[j][0] = require.resolve('babel-plugin-' + babelLoaderQuery.plugins[j][0])
  }
}

for (let p = 0; p < babelLoaderQuery.presets.length; p++) {
  babelLoaderQuery.presets[p] = require.resolve('babel-preset-' + babelLoaderQuery.presets[p])
}

if (!reactTransform[1] || !reactTransform[1].transforms) {
  reactTransform[1] = Object.assign({}, reactTransform[1], { transforms: [] })
}

// make sure react-transform-hmr is enabled
reactTransform[1].transforms.push({
  transform: 'react-transform-hmr',
  imports: ['react'],
  locals: ['module']
})

module.exports = (extensions, extensionsInNormalMode) => {
  return {
    mode: 'development',
    devtool: 'eval-source-map',
    context: path.resolve(__dirname, '..'),
    entry: {
      'main': [
        './src/client.js',
        'webpack-hot-middleware/client',
        // we use a forked font-awesome-webpack (named: font-awesome-webpack-4)
        // because the original repository does not support webpack 4,
        // see this issue for a bit of history: https://github.com/gowravshekar/font-awesome-webpack/issues/41#issuecomment-413213495
        // we should be able to go back to original package when it is updated.
        'font-awesome-webpack-4!./src/theme/font-awesome.config.js'
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
    externals: [
      (context, request, callback) => {
        if (request === 'jsreport-studio') {
          return callback(null, 'Studio')
        }

        callback()
      }
    ],
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
          test: /\.js$/,
          exclude: (modulePath) => {
            // we need to tell babel to exclude the processing of eslint-browser bundle
            if (modulePath.includes('eslint-browser.js')) {
              return true
            }

            for (let key in extensions) {
              const shouldExcludeExplicitly = (
                modulePath.indexOf(extensions[key].directory) !== -1
              ) && (
                extensionsInNormalMode.find((e) => {
                  return e.directory === extensions[key].directory
                }) != null
              )

              if (shouldExcludeExplicitly) {
                return true
              }

              if (modulePath.indexOf(extensions[key].directory) !== -1 && modulePath.replace(extensions[key].directory, '').indexOf('node_modules') === -1) {
                return false
              }
            }

            return true
          },
          use: [{
            loader: 'babel-loader',
            options: babelLoaderQuery
          }]
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
            }, {
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
      // hot reload
      new webpack.HotModuleReplacementPlugin(),
      new webpack.IgnorePlugin(/webpack-stats\.json$/),
      new webpack.DefinePlugin({
        __DEVELOPMENT__: true
      }),
      new MonacoWebpackPlugin({
        languages: ['xml', 'html', 'handlebars', 'css', 'json', 'javascript', 'typescript'],
        // we exclude some features
        features: ['!iPadShowKeyboard', '!dnd']
      }),
      new HtmlWebpackPlugin({
        hash: true,
        template: path.join(__dirname, '../static/index.html')
      })
    ]
  }
}

function getPostcssPlugins () {
  return [
    jsreportStudioDev.deps['postcss-flexbugs-fixes'],
    jsreportStudioDev.deps.autoprefixer
  ]
}
