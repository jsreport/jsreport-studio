import { selectors } from '../entities'
import parse from '../../helpers/parseJSON.js'

const getLogs = (logs, state) => (logs || []).map((l) => {
  let template = selectors.getByShortid(state, l.template.shortid, false)

  if (!template) {
    template = { name: 'anonymous', path: 'anonymous' }
  } else {
    template = { ...template, path: selectors.resolveEntityPath(state, template) }
  }

  return {
    ...l,
    template: template
  }
})

export const getByKey = (state, key, shouldThrow = true) => {
  const entities = Object.keys(state.settings).map((k) => state.settings[k]).filter((s) => s.key === key)

  if (!entities.length && shouldThrow) {
    throw new Error(`settings with key ${key} was not found`)
  }

  if (!entities.length) {
    return null
  }

  return typeof entities[0].value === 'string' ? {
    _id: entities[0]._id,
    key: key,
    value: parse(entities[0].value)
  } : entities[0]
}

export const getValueByKey = (state, key, shouldThrow = true) => {
  const entry = getByKey(state, key, shouldThrow)

  if (!entry) {
    return
  }

  return typeof entry.value === 'string' ? parse(entry.value) : entry.value
}

export const getAll = (state) => state
export const getFailedLogsWithTemplates = (state) => getLogs(getValueByKey(state, 'failedRequestsLog', false), state)
export const getLogsWithTemplates = (state) => getLogs(getValueByKey(state, 'requestsLog', false), state)
