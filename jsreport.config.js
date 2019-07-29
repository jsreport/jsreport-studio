module.exports = {
  name: 'studio',
  main: 'lib/studio.js',
  optionsSchema: {
    extensions: {
      studio: {
        type: 'object',
        properties: {
          theme: {
            type: 'object',
            default: {},
            properties: {
              name: {
                type: 'string',
                enum: ['light', 'dark'],
                description: 'specifies the theme name that is going to be used in studio',
                default: 'light'
              },
              logo: {
                type: 'string',
                description: 'specifies the path to a custom logo to use in the studio UI'
              },
              editorThemeName: {
                type: 'string',
                enum: ['chrome', 'vs', 'vs-dark', 'hc-black'],
                description: 'specifies the theme name to use for the editor'
              },
              variables: {
                type: 'object',
                description: 'specifies the value of some variables to customize the studio UI theme'
              },
              cssFiles: {
                description: 'specifies the css files that will be loaded with studio styles',
                anyOf: [
                  {
                    type: 'string',
                    '$jsreport-constantOrArray': []
                  },
                  {
                    type: 'array',
                    items: { type: 'string' }
                  }
                ]
              }
            }
          },
          startupPage: {
            type: 'boolean',
            default: true
          },
          requestLogEnabled: {
            type: 'boolean',
            default: true
          },
          flushLogsInterval: {
            type: 'number',
            default: 2000
          },
          entityTreeOrder: {
            type: 'array',
            items: { type: 'string' }
          },
          webpackStatsInDevMode: {
            type: 'object'
          },
          extensionsInDevMode: {
            anyOf: [
              {
                type: 'string',
                '$jsreport-constantOrArray': []
              },
              {
                type: 'array',
                items: { type: 'string' }
              }
            ]
          }
        }
      }
    }
  },
  dependencies: ['express']
}
