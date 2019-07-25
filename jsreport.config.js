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
            properties: {
              logo: {
                type: 'string',
                description: 'specifies the path to a custom logo to use in the studio UI'
              },
              editorThemeName: {
                type: 'string',
                description: 'specifies the theme name to use for the editor'
              },
              variables: {
                type: 'object',
                description: 'specifies the value of some variables to customize the studio UI theme'
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
