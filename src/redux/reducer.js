import { combineReducers } from 'redux'
import { routerReducer } from 'react-router-redux'

import entities from './entities/reducer'
import editor from './editor/reducer'
import progress from './progress/reducer'
import settings from './settings/reducer'
import modal from './modal/reducer'

const reducer = combineReducers({
  routing: routerReducer,
  entities,
  editor,
  progress,
  settings,
  modal
})

export default (state, action) => {
  let currentUndockMode

  if (action.type === 'RESET') {
    const { routing } = state

    currentUndockMode = state.editor && state.editor.undockMode != null ? state.editor.undockMode : undefined

    state = { routing }
  }

  const newState = reducer(state, action)

  // we preserve the undock state after reset
  if (currentUndockMode != null && newState.editor) {
    newState.editor.undockMode = currentUndockMode
  }

  return newState
}
