
const MAX_ITEMS = 5

module.exports = (reporter, definition) => {
  const fullState = {
    requestsLog: [],
    failedRequestsLog: []
  }

  reporter.studio.addRequestLog = (request, info) => {
    const maxLogs = info.maxLogs

    saveIntoState(fullState, 'requestsLog', {
      template: { shortid: request.template.shortid },
      timestamp: new Date().getTime(),
      logs: [...reporter.studio.normalizeLogs(request.context.logs || [])]
    }, maxLogs)
  }

  reporter.studio.addFailedRequestLog = (request, info) => {
    const error = info.error
    const maxLogs = info.maxLogs

    saveIntoState(fullState, 'failedRequestsLog', {
      template: { shortid: request.template.shortid },
      timestamp: new Date().getTime(),
      logs: [...reporter.studio.normalizeLogs(request.context.logs || [])],
      error: {
        message: error.message,
        stack: error.stack
      }
    }, maxLogs)
  }

  reporter.studio.flushLogs = async (reporter, info) => {
    await flushLogs(reporter, fullState, info)
  }

  if (reporter.renderErrorListeners) {
    reporter.renderErrorListeners.add('failedRequestsLog', this, async (request, response, err) => {
      if (request.context.isChildRequest) {
        return
      }

      reporter.studio.addFailedRequestLog(request, { error: err, maxLogs: MAX_ITEMS })
    })
  }

  let flushingLogs = false
  let flushLogsTimeoutRef

  reporter.initializeListeners.add('studio-flush-logs', async () => {
    // trying to register the studio request logs as the last listener
    reporter.afterRenderListeners.add('requestsLog', this, async (request) => {
      if (request.context.isChildRequest) {
        return
      }

      reporter.studio.addRequestLog(request, { maxLogs: MAX_ITEMS })
    })

    // initializing the interval on initialization listener because the flush logs reads from store
    // and it needs the store and the settings to be ready, otherwise there can be race conditions
    flushLogsTimeoutRef = setInterval(async () => {
      if (flushingLogs) {
        return
      }

      flushingLogs = true

      try {
        await reporter.studio.flushLogs(reporter, { maxLogs: MAX_ITEMS })
      } catch (e) {
        reporter.logger.error(`Error while trying to flush studio logs: ${e.message} - ${e.stack}`)
      } finally {
        flushingLogs = false
      }
    }, definition.options.flushLogsInterval)

    flushLogsTimeoutRef.unref()
  })

  reporter.closeListeners.add('flushLogsInterval', this, () => {
    if (flushLogsTimeoutRef) {
      clearInterval(flushLogsTimeoutRef)
    }
  })
}

module.exports.normalizeLogs = normalizeLogs

async function flushLogs (reporter, fullState, info) {
  const maxLogs = info.maxLogs
  let requestsLog = (await reporter.settings.findValue('requestsLog')) || []
  let failedRequestsLog = (await reporter.settings.findValue('failedRequestsLog')) || []

  if (fullState.requestsLog.length > 0) {
    requestsLog.unshift(...fullState.requestsLog)
    fullState.requestsLog = []
    requestsLog = requestsLog.slice(0, maxLogs)

    await reporter.settings.addOrSet('requestsLog', requestsLog)
  }

  if (fullState.failedRequestsLog.length > 0) {
    failedRequestsLog.unshift(...fullState.failedRequestsLog)
    fullState.failedRequestsLog = []
    failedRequestsLog = failedRequestsLog.slice(0, maxLogs)

    await reporter.settings.addOrSet('failedRequestsLog', failedRequestsLog)
  }
}

function saveIntoState (state, type, record, maxLogs) {
  state[type] = state[type] || []
  state[type].unshift(record)
  // we only store logs for the last five requests
  state[type] = state[type].slice(0, maxLogs)
}

function normalizeLogs (logs) {
  let logsSize = 0
  const MAX_LOGS_LINES = 200 // maximum of 200 logs lines
  const MAX_LOGS_SIZE = 500000 // (bytes) maximum of 500kb for total size of logs

  // only save a maximum of logs lines (from the last)
  let finalLogs = logs.length > MAX_LOGS_LINES ? logs.slice(MAX_LOGS_LINES * -1) : logs

  const greaterThanMaxSize = finalLogs.some((log) => {
    const size = Buffer.from(log.message || '', 'utf8').length

    logsSize += size

    return logsSize > MAX_LOGS_SIZE
  })

  if (greaterThanMaxSize) {
    // trim log messages if the size is greater than the maximum
    finalLogs = finalLogs.map((log) => {
      // let's pretend that one character is equal to one byte,
      // so the minimum size for each message is MAX_LOGS_SIZE/MAX_LOGS_LINES bytes
      log.message = (log.message || '').substring(0, parseInt(MAX_LOGS_SIZE / MAX_LOGS_LINES, 10)) + '...'
      return log
    })
  }

  return finalLogs
}
