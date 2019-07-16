module.exports = {
  name: 'studio',
  main: 'lib/studio.js',
  optionsSchema: {
    extensions: {
      studio: {
        type: 'object',
        properties: {
          logoPath: {
            type: 'string',
            description: 'specifies the path to a custom logo to use in the studio UI'
          },
          themeVars: {
            type: 'object',
            description: 'specifies the value of some variables to customize the studio UI theme'
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
