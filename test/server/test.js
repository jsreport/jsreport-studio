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

describe('studio with requestLogDiscriminatorPath', () => {
  let reporter

  beforeEach(async () => {
    reporter = jsreport({
      templatingEngines: {
        strategy: 'in-process'
      }
    }).use(studio({
      flushLogsInterval: 10,
      requestLogDiscriminatorPath: 'context.tenant'
    }))

    await reporter.init()

    reporter.documentStore.collection('settings').beforeInsertListeners.add('test', (doc, req) => {
      if (req) {
        doc.tenant = req.context.tenant
      }
    })

    reporter.documentStore.collection('settings').beforeUpdateListeners.add('test', (q, u, o, req) => {
      if (req) {
        q.tenant = req.context.tenant
        u.$set.tenant = req.context.tenant
      }
    })

    reporter.documentStore.collection('settings').beforeFindListeners.add('test', (q, p, req) => {
      if (req) {
        q.tenant = req.context.tenant
      }
    })
  })

  afterEach(() => reporter.close())

  it('render templates should persist logs to settings based on requestLogDiscriminatorPath', async () => {
    await reporter.render({
      template: {
        content: 'foo',
        engine: 'none',
        recipe: 'html'
      },
      context: {
        tenant: 'foo'
      }
    })

    await Promise.delay(20)

    const requestsLog = await reporter.settings.findValue('requestsLog', createRequest({
      context: {
        tenant: 'foo'
      }
    }))
    requestsLog.should.have.length(1)
    requestsLog[0].logs.length.should.be.greaterThan(0)
  })

  it('render templates should persist logs to settings based on requestLogDiscriminatorPath (negative)', async () => {
    await reporter.render({
      template: {
        content: 'foo',
        engine: 'none',
        recipe: 'html'
      },
      context: {
        tenant: 'foo'
      }
    })

    await Promise.delay(20)

    const requestsLog = await reporter.settings.findValue('requestsLog', createRequest({
      context: {
        tenant: 'foo2'
      }
    }))
    should(requestsLog).be.null()
  })
})
