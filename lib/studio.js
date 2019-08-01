const path = require('path')
const Promise = require('bluebird')
const url = require('url')
const fs = Promise.promisifyAll(require('fs'))
const crypto = require('crypto')
const { Lock } = require('semaphore-async-await')
const sass = require('node-sass')
const serveStatic = require('serve-static')
const favicon = require('serve-favicon')
const compression = require('compression')
const requestLog = require('./requestLog')

const THEMES = {
  light: {
    variables: require('./lightThemeVars'),
    previewColor: '#F6F6F6',
    editorTheme: 'chrome'
  },
  dark: {
    variables: require('./darkThemeVars'),
    previewColor: '#1D1D1D',
    editorTheme: 'vs-dark'
  }
}

const EDITOR_THEMES = {
  chrome: {
    previewColor: '#FFFFFF',
    previewAlternativeColor: '#AA0D91'
  },
  vs: {
    previewColor: '#FFFFFE',
    previewAlternativeColor: '#3501FF'
  },
  'vs-dark': {
    previewColor: '#1E1E1E',
    previewAlternativeColor: '#559BD4'
  },
  'hc-black': {
    previewColor: '#000000',
    previewAlternativeColor: '#3F6E95'
  }
}

const extensionsJsChunkName = 'studio-extensions.client.js'

module.exports = (reporter, definition) => {
  const themeCompilationLock = new Lock()
  const getCustomCssLock = new Lock()

  reporter.studio = {
    normalizeLogs: requestLog.normalizeLogs
  }

  reporter.logger.debug(`studio is using theme: ${definition.options.theme.name}`)

  if (definition.options.theme.editorThemeName == null) {
    definition.options.theme.editorThemeName = THEMES[definition.options.theme.name].editorTheme
  } else {
    reporter.logger.debug(`studio is using editor theme: ${definition.options.theme.editorThemeName}`)
  }

  reporter.addRequestContextMetaConfig('htmlTitle', { sandboxReadOnly: true })

  const distPath = reporter.execution ? reporter.execution.tempDirectory : path.join(__dirname, '../static/dist')

  if (definition.options.requestLogEnabled !== false) {
    reporter.logger.debug(`studio request logs are enabled (flush interval: ${definition.options.flushLogsInterval})`)
    requestLog(reporter, definition)
  } else {
    reporter.logger.debug('studio request logs are disabled')
  }

  let customLogoPath

  if (definition.options.theme.logo != null) {
    customLogoPath = path.resolve(reporter.options.rootDirectory, definition.options.theme.logo)
    reporter.logger.debug(`studio is using custom logo at: ${customLogoPath}`)
  }

  let customCssFiles = []
  let customCssFilesHash
  let customCssContent

  if (definition.options.theme.cssFiles) {
    customCssFiles = definition.options.theme.cssFiles.map((p) => path.resolve(reporter.options.rootDirectory, p))
    customCssFilesHash = crypto.randomBytes(4).toString('hex')
    reporter.logger.debug(`studio will include custom css styles from: ${customCssFiles.join(', ')}`)
  }

  let compiler
  let clientStudioExtensionsJsContent
  let clientStudioExtensionsCssContent
  let compiledThemeCss = {}

  function sendIndex (req, res, next) {
    const indexHtml = path.join(distPath, 'index.html')

    function send (err, content) {
      if (err) {
        return next(err)
      }

      content = content.replace('$jsreportTitle', req.context.htmlTitle || `jsreport ${reporter.version} ${reporter.options.mode}`)
      content = content.replace('$defaultTheme', definition.options.theme.name)
      content = content.replace('client.js', `${reporter.options.appPath}studio/assets/client.js`)
      content = content.replace('main.css', `${reporter.options.appPath}studio/assets/main.css`)
      content = content.replace('$customCssFiles', customCssFiles.length > 0 ? `<link href="${reporter.options.appPath}studio/assets/customCssFiles.css?${customCssFilesHash}" rel="stylesheet">` : '')

      res.send(content)
    }

    function tryRead () {
      compiler.outputFileSystem.readFile(indexHtml, 'utf8', (err, content) => {
        if (err) {
          return setTimeout(tryRead, 1000)
        }

        send(null, content)
      })
    }

    if (reporter.options.mode === 'jsreport-development') {
      tryRead()
    } else {
      fs.readFile(indexHtml, 'utf8', send)
    }
  }

  function redirectOrSendIndex (req, res, next) {
    const reqUrl = url.parse(req.originalUrl)
    if (reqUrl.pathname[reqUrl.pathname.length - 1] !== '/') {
      return res.redirect(reqUrl.pathname + '/' + (reqUrl.search || ''))
    }

    sendIndex(req, res, next)
  }

  async function getCustomCss () {
    if (customCssContent != null) {
      return Promise.resolve(customCssContent)
    }

    await getCustomCssLock.acquire()

    try {
      if (customCssContent != null) {
        return Promise.resolve(customCssContent)
      }

      const files = await Promise.all(customCssFiles.map(async (cssFile) => (await fs.readFileAsync(cssFile)).toString()))
      let cssContent = files.join('\n')

      const themeVars = Object.assign(
        {},
        THEMES[definition.options.theme.name].variables,
        (definition.options.theme.variables != null) ? definition.options.theme.variables : undefined
      )

      cssContent = await replaceThemeVars(cssContent, themeVars)

      customCssContent = cssContent

      return cssContent
    } finally {
      getCustomCssLock.release()
    }
  }

  async function compileTheme (themeName) {
    if (compiledThemeCss[themeName]) {
      return Promise.resolve(compiledThemeCss[themeName])
    }

    await themeCompilationLock.acquire()

    try {
      if (compiledThemeCss[themeName]) {
        return Promise.resolve(compiledThemeCss[themeName])
      }

      const mainCssPath = path.join(__dirname, '../static/dist/main.css')
      let readFile

      if (compiler) {
        readFile = compiler.outputFileSystem.readFile.bind(compiler.outputFileSystem)
      } else {
        readFile = fs.readFile.bind(fs)
      }

      let cssContent = await new Promise((resolve, reject) => {
        readFile(mainCssPath, 'utf8', (err, content) => {
          if (err) {
            return reject(err)
          }

          resolve(content)
        })
      })

      const themeVars = Object.assign(
        {},
        THEMES[themeName].variables,
        (definition.options.theme.variables != null) ? definition.options.theme.variables : undefined
      )

      if (clientStudioExtensionsCssContent) {
        cssContent = `${cssContent}\n\n${clientStudioExtensionsCssContent}`
      }

      const newCssContent = await replaceThemeVars(cssContent, themeVars)

      compiledThemeCss[themeName] = newCssContent

      return newCssContent
    } finally {
      themeCompilationLock.release()
    }
  }

  async function replaceThemeVars (content, themeVars) {
    function sassVariables (variablesObj) {
      return Object.keys(variablesObj).map((name) => {
        return `$${name}: ${variablesObj[name]};`
      }).join('\n')
    }

    const sassInput = `
      ${sassVariables(themeVars)}
      ${content}
    `

    const newCss = await new Promise((resolve, reject) => {
      sass.render({
        data: sassInput,
        outputStyle: 'expanded'
      }, (err, result) => {
        if (err) {
          return reject(err)
        }

        resolve(result.css)
      })
    })

    return newCss
  }

  reporter.on('after-authentication-express-routes', () => reporter.express.app.get('/', redirectOrSendIndex))

  reporter.on('after-express-static-configure', () => {
    if (!reporter.authentication) {
      return reporter.express.app.get('/', redirectOrSendIndex)
    }
  })

  reporter.on('before-express-configure', () => {
    reporter.express.app.use('/api/report', (req, res, next) => {
      res.cookie('render-complete', true)
      next()
    })
  })

  reporter.on('express-configure', () => {
    const extsInNormalMode = []

    if (reporter.options.mode !== 'jsreport-development') {
      let webpackJsWrap

      if (fs.existsSync(path.join(distPath, 'extensions.client.js'))) {
        webpackJsWrap = fs.readFileSync(path.join(distPath, 'extensions.client.js'), 'utf8')
      } else {
        webpackJsWrap = fs.readFileSync(path.join(distPath, extensionsJsChunkName), 'utf8')
      }

      const webpackExtensionsJs = webpackJsWrap.replace('$extensionsHere', () => {
        return reporter.extensionsManager.extensions.map((e) => {
          try {
            if (reporter.execution && reporter.execution.resource(e.name)) {
              return reporter.execution.resource(e.name)
            }
            return fs.readFileSync(path.join(e.directory, 'studio/main.js'))
          } catch (e) {
            return ''
          }
        }).join('\n')
      })

      const webpackExtensionsCss = reporter.extensionsManager.extensions.map((e) => {
        try {
          return fs.readFileSync(path.join(e.directory, 'studio/main.css'))
        } catch (e) {
          return ''
        }
      }).join('\n')

      clientStudioExtensionsJsContent = webpackExtensionsJs
      clientStudioExtensionsCssContent = webpackExtensionsCss
    } else {
      const extsConfiguredInDevMode = process.env.JSREPORT_CURRENT_EXTENSION != null ? [process.env.JSREPORT_CURRENT_EXTENSION] : []

      if (definition.options.extensionsInDevMode != null) {
        let extensionsDefined = []

        if (Array.isArray(definition.options.extensionsInDevMode)) {
          extensionsDefined = [...definition.options.extensionsInDevMode]
        } else if (typeof definition.options.extensionsInDevMode === 'string') {
          extensionsDefined = [definition.options.extensionsInDevMode]
        }

        extensionsDefined.forEach((ext) => {
          if (ext !== '' && !extsConfiguredInDevMode.includes(ext)) {
            extsConfiguredInDevMode.push(ext)
          }
        })
      }

      if (extsConfiguredInDevMode.length > 0) {
        reporter.logger.debug(`studio extensions configured in dev mode: ${extsConfiguredInDevMode.join(', ')}`)
      } else {
        reporter.logger.debug('all studio extensions are configured in dev mode')
      }

      fs.writeFileSync(path.join(__dirname, '../src/extensions_dev.js'), reporter.extensionsManager.extensions.map((e) => {
        const shouldUseMainEntry = extsConfiguredInDevMode.length > 0 && !extsConfiguredInDevMode.includes(e.name)

        try {
          fs.statSync(path.join(e.directory, '/studio/main_dev.js'))

          const extensionPath = shouldUseMainEntry ? (
            path.join(e.directory, '/studio/main.js')
          ) : path.join(e.directory, '/studio/main_dev.js')

          if (shouldUseMainEntry) {
            extsInNormalMode.push(e)
          }

          return `import '${path.relative(path.join(__dirname, '../src'), extensionPath).replace(/\\/g, '/')}'`
        } catch (e) {
          return ''
        }
      }).join('\n'))

      fs.writeFileSync(path.join(__dirname, '../src/extensions_dev.css'), reporter.extensionsManager.extensions.map((e) => {
        const shouldUseMainEntry = extsConfiguredInDevMode.length > 0 && !extsConfiguredInDevMode.includes(e.name)

        try {
          if (!shouldUseMainEntry) {
            return ''
          }

          const extensionPath = path.join(e.directory, '/studio/main.css')

          fs.statSync(extensionPath)

          return `@import '${path.relative(path.join(__dirname, '../src'), extensionPath).replace(/\\/g, '/')}'`
        } catch (e) {
          return ''
        }
      }).join('\n'))
    }

    const app = reporter.express.app

    app.use(compression())
    app.use(favicon(path.join(reporter.execution ? distPath : path.join(__dirname, '../static'), 'favicon.ico')))

    // we put the route before webpack dev middleware to get the chance to do our own handling
    app.get('/studio/assets/main.css', async (req, res, next) => {
      try {
        const themeCss = await compileTheme(definition.options.theme.name)
        res.type('css').send(themeCss)
      } catch (e) {
        next(e)
      }
    })

    if (reporter.options.mode === 'jsreport-development') {
      const webpack = require('jsreport-studio-dev').deps.webpack

      const webpackConfig = require('../webpack/dev.config')(
        reporter.extensionsManager.extensions,
        extsInNormalMode
      )

      compiler = webpack(webpackConfig)

      let statsOpts = definition.options.webpackStatsInDevMode || {}

      if (statsOpts.colors == null) {
        statsOpts.colors = true
      }

      if (statsOpts.chunks == null) {
        statsOpts.chunks = false
      }

      if (statsOpts.modules == null) {
        statsOpts.modules = false
      }

      reporter.express.app.use(require('webpack-dev-middleware')(compiler, {
        publicPath: '/studio/assets/',
        lazy: false,
        stats: statsOpts
      }))

      reporter.express.app.use(require('webpack-hot-middleware')(compiler))
    }

    app.get(`/studio/assets/${extensionsJsChunkName}`, (req, res) => {
      res.set('Content-Type', 'application/javascript')
      res.send(clientStudioExtensionsJsContent)
    })

    app.get('/studio/assets/alternativeTheme.css', async (req, res, next) => {
      const themeName = req.query.name

      if (!themeName) {
        return res.status(400).end('Theme name was not specified in query string')
      }

      if (THEMES[themeName] == null) {
        return res.status(404).end(`Theme "${themeName}" does not exists`)
      }

      try {
        const themeCss = await compileTheme(themeName)
        res.type('css').send(themeCss)
      } catch (e) {
        next(e)
      }
    })

    app.get('/studio/assets/customCssFiles.css', async (req, res, next) => {
      if (customCssFiles.length === 0) {
        return res.status(404).end('Custom css file were not configured, use "extensions.studio.theme.cssFiles" if you want to include some css files')
      }

      try {
        const customCssFilesContent = await getCustomCss()

        res.type('css').send(customCssFilesContent)
      } catch (e) {
        next(e)
      }
    })

    app.get('/studio/assets/custom-logo', (req, res, next) => {
      if (!customLogoPath) {
        return res.status(404).end('Custom logo for studio was not configured, use "extensions.studio.theme.logo" option if you want to customize it')
      }

      res.sendFile(customLogoPath, (err) => {
        if (err) {
          next(err)
        }
      })
    })

    app.use('/studio/assets', serveStatic(reporter.execution ? reporter.execution.tempDirectory : path.join(__dirname, '../static', 'dist')))

    app.use('/studio/hierarchyMove', async (req, res) => {
      const source = req.body.source
      const target = req.body.target
      const shouldCopy = req.body.copy === true
      const shouldReplace = req.body.replace === true

      try {
        if (!source || !target) {
          const missing = !source ? 'source' : 'target'
          throw new Error(`No "${missing}" specified in payload`)
        }

        const updatedItems = await reporter.folders.move({
          source,
          target,
          shouldCopy,
          shouldReplace
        }, req)

        for (const e of updatedItems) {
          Object.assign(e, reporter.documentStore.collection(e.__entitySet).convertBufferToBase64InEntity([e])[0])
        }

        res.status(200).json({
          items: updatedItems
        })
      } catch (e) {
        const errorRes = { message: e.message }

        if (e.code === 'DUPLICATED_ENTITY') {
          const publicKeyOfDuplicate = reporter.documentStore.model.entitySets[e.existingEntityEntitySet].entityTypePublicKey

          errorRes.code = e.code

          errorRes.existingEntity = {
            _id: e.existingEntity._id,
            name: e.existingEntity[publicKeyOfDuplicate]
          }

          errorRes.existingEntityEntitySet = e.existingEntityEntitySet

          if (e.existingEntityEntitySet === 'folders') {
            errorRes.message = `${errorRes.message} The existing entity is a folder and replacing a folder is not allowed, to be able to move the entity you need to rename one of the two conflicting entities first.`
          }
        }

        res.status(400).json(errorRes)
      }
    })

    app.post('/studio/validate-entity-name', async (req, res) => {
      const entitySet = req.body.entitySet
      const entityId = req.body._id
      const entityName = req.body.name
      const folderShortid = req.body.folderShortid

      try {
        if (!entitySet) {
          throw new Error('entitySet was not specified in request body')
        }

        reporter.validateEntityName(entityName)

        const publicKey = reporter.documentStore.model.entitySets[entitySet].entityTypePublicKey

        if (publicKey) {
          await reporter.validateDuplicatedName(entitySet, {
            _id: entityId,
            [publicKey]: entityName,
            folder: folderShortid != null ? {
              shortid: folderShortid
            } : null
          }, req)
        }

        res.status(200).end()
      } catch (e) {
        res.status(400).end(e.message)
      }
    })

    app.get('/studio/*', sendIndex)
  })

  reporter.documentStore.on('after-init', () => {
    const documentStore = reporter.documentStore

    for (let key in documentStore.collections) {
      const col = reporter.documentStore.collections[key]
      const entitySet = documentStore.model.entitySets[col.entitySet]

      const entityTypeName = entitySet.entityType.replace(documentStore.model.namespace + '.', '')
      const entityType = documentStore.model.entityTypes[entityTypeName]

      if (
        entityType.modificationDate != null &&
        entityType.modificationDate.type === 'Edm.DateTimeOffset'
      ) {
        col.beforeUpdateListeners.insert(0, 'studio-concurrent-save-check', async (q, u, o, req) => {
          if (!u.$set || !u.$set.modificationDate || !req) {
            return
          }

          if (
            !req.context ||
            !req.context.http ||
            !req.context.http.headers ||
            (
              req.context.http.headers['x-validate-concurrent-update'] !== 'true' &&
              req.context.http.headers['x-validate-concurrent-update'] !== true
            )
          ) {
            return
          }

          let lastModificationDate = u.$set.modificationDate

          if (typeof lastModificationDate === 'string') {
            lastModificationDate = new Date(lastModificationDate)

            if (lastModificationDate.toString() === 'Invalid Date') {
              return
            }
          }

          if (typeof lastModificationDate.getTime !== 'function') {
            return
          }

          if (q._id == null) {
            return
          }

          const entity = await col.findOne(q, req)

          if (entity) {
            const currentModificationDate = entity.modificationDate

            if (currentModificationDate.getTime() !== lastModificationDate.getTime()) {
              throw reporter.createError(`Entity (_id: ${entity._id}) was modified previously by another source`, {
                status: 400,
                code: 'CONCURRENT_UPDATE_INVALID',
                weak: true
              })
            }
          }
        })
      }
    }
  })

  reporter.initializeListeners.add('studio', async () => {
    if (reporter.express) {
      reporter.express.exposeOptionsToApi(definition.name, {
        customLogo: customLogoPath != null,
        theme: definition.options.theme.name,
        editorTheme: definition.options.theme.editorThemeName,
        availableThemes: Object.entries(THEMES).reduce((acu, [themeName, themeValue]) => {
          acu[themeName] = {
            previewColor: themeValue.previewColor,
            editorTheme: themeValue.editorTheme
          }
          return acu
        }, {}),
        availableEditorThemes: Object.entries(EDITOR_THEMES).reduce((acu, [editorThemeName, editorThemeValue]) => {
          acu[editorThemeName] = editorThemeValue
          return acu
        }, {}),
        startupPage: definition.options.startupPage,
        requestLogEnabled: definition.options.requestLogEnabled,
        entityTreeOrder: definition.options.entityTreeOrder
      })
    }
  })

  if (reporter.compilation) {
    reporter.compilation.exclude('webpack-dev-middleware', 'webpack-hot-middleware', 'webpack', 'babel-polyfill', 'html-webpack-plugin', 'monaco-editor-webpack-plugin', 'jsreport-studio-dev')
    reporter.compilation.resourceInTemp('favicon.ico', path.join(__dirname, '../static', 'favicon.ico'))

    reporter.initializeListeners.add('studio-compilation', async () => {
      const mains = await Promise.all(reporter.extensionsManager.extensions.map(async (e) => {
        try {
          await fs.statAsync(path.join(e.directory, 'studio', 'main.js'))
          return e
        } catch (e) {
          return null
        }
      }))

      mains.forEach((e) => {
        if (e) {
          reporter.compilation.resource(e.name, path.join(e.directory, 'studio', 'main.js'))
        }
      })

      const files = await fs.readdirAsync(distPath)

      files.forEach(function (f) {
        if (f.indexOf('.map') === -1) {
          reporter.compilation.resourceInTemp(f, path.join(distPath, f))
        }
      })
    })
  }
}
