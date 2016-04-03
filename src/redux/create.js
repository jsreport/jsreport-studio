import { createStore as _createStore, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'
import createLogger from 'redux-logger'
import { syncHistory } from 'react-router-redux'

const logger = createLogger()

export default function createStore (history, data) {
  // Sync dispatched route actions to the history
  const reduxRouterMiddleware = syncHistory(history)

  const middleware = [ thunk, reduxRouterMiddleware, logger ]

  let finalCreateStore
  if (__DEVELOPMENT__ && __DEVTOOLS__) {
    const { persistState } = require('redux-devtools')
    const DevTools = require('../containers/DevTools/DevTools')
    finalCreateStore = compose(
      applyMiddleware(...middleware),
      window.devToolsExtension ? window.devToolsExtension() : DevTools.instrument(),
      persistState(window.location.href.match(/[?&]debug_session=([^&]+)\b/))
    )(_createStore)
  } else {
    finalCreateStore = applyMiddleware(...middleware)(_createStore)
  }

  const reducer = require('./modules/reducer')
  const store = finalCreateStore(reducer, data)

  reduxRouterMiddleware.listenForReplays(store)

  if (__DEVELOPMENT__ && module.hot) {
    module.hot.accept('./modules/reducer', () => {
      store.replaceReducer(require('./modules/reducer'))
    })
  }

  return store
}
