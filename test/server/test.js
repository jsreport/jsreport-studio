const should = require('should')
const jsreport = require('jsreport-core')
const studio = require('../../')
const Promise = require('bluebird')
const createRequest = require('jsreport-core/lib/render/request')

describe('studio', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      templatingEngines: {
        strategy: 'in-process'
      }
    }).use(studio({
      flushLogsInterval: 10
    }))
    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('render templates should persist logs to settings based on flushLogsInterval', async () => {
    await reporter.render({
      template: {
        content: 'foo',
        engine: 'none',
        recipe: 'html'
      }
    })

    let requestsLog = await reporter.settings.findValue('requestsLog')
    should(requestsLog).be.null()

    await Promise.delay(20)

    requestsLog = await reporter.settings.findValue('requestsLog')
    requestsLog.should.have.length(1)
    requestsLog[0].logs.length.should.be.greaterThan(0)
  })
})
