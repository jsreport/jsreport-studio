import { createStore as _createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'
import { routerMiddleware } from 'connected-react-router'
import { enableBatching } from 'redux-batched-actions'
import groupUpdate from './middlewares/groupUpdate.js'

const logger = createLogger()

export default function createStore (history) {
  const reduxRouterMiddleware = routerMiddleware(history)
  const middleware = [ thunk, reduxRouterMiddleware, groupUpdate ]

  let finalCreateStore
  if (__DEVELOPMENT__) {
    const invariant = require('redux-immutable-state-invariant').default()
    finalCreateStore = applyMiddleware(invariant, ...middleware, logger)(_createStore)
  } else {
    finalCreateStore = applyMiddleware(...middleware)(_createStore)
  }

  const reducer = require('./reducer')(history)
  const store = finalCreateStore(enableBatching(reducer))

  if (__DEVELOPMENT__ && module.hot) {
    module.hot.accept('./reducer', () => {
      store.replaceReducer(require('./reducer')(history))
    })
  }

  return store
}
