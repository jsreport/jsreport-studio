import * as entities from '../entities'
import * as progress from '../progress'
import * as ActionTypes from './constants.js'
import uid from '../../helpers/uid.js'
import api from '../../helpers/api.js'
import * as selectors from './selectors.js'
import { push } from 'react-router-redux'
import shortid from 'shortid'
import preview from '../../helpers/preview'
import resolveUrl from '../../helpers/resolveUrl.js'
import beautify from 'js-beautify-jsreport'
import { engines, recipes, entitySets, previewListeners, locationResolver, editorComponents, concurrentUpdateModal, modalHandler } from '../../lib/configuration.js'

export function closeTab (id) {
  return (dispatch, getState) => {
    const activeEntity = selectors.getActiveEntity(getState())

    dispatch({
      type: ActionTypes.CLOSE_TAB,
      key: id
    })

    if (activeEntity && activeEntity._id === id) {
      dispatch(entities.actions.unload(id))
    }
  }
}

export function openTab (tab) {
  return async function (dispatch, getState) {
    if (tab.shortid && !tab._id) {
      try {
        tab._id = entities.selectors.getByShortid(getState(), tab.shortid)._id
      } catch (e) {
        dispatch(push(resolveUrl('/')))
        return
      }
    }

    if (tab._id) {
      await entities.actions.load(tab._id)(dispatch, getState)
      tab.entitySet = entities.selectors.getById(getState(), tab._id).__entitySet
    }

    tab.type = tab._id ? 'entity' : 'custom'
    tab.key = tab.key || tab._id

    dispatch({
      type: ActionTypes.OPEN_TAB,
      tab: tab
    })

    dispatch(activateTab(tab.key))
  }
}

export function openNewTab ({ entitySet, entity, name }) {
  const shouldClone = entity != null && entity._id != null

  return async function (dispatch, getState) {
    let id = uid()
    let newEntity
    let clonedEntity

    if (shouldClone) {
      await entities.actions.load(entity._id)(dispatch, getState)
      clonedEntity = entities.selectors.getById(getState(), entity._id)

      newEntity = {
        ...clonedEntity,
        _id: id,
        __entitySet: entitySet,
        shortid: shortid.generate(),
        [entitySets[entitySet].nameAttribute]: name
      }
    } else {
      if (entity != null) {
        newEntity = Object.assign({}, entity)
      }

      newEntity = Object.assign(newEntity, {
        _id: id,
        __entitySet: entitySet,
        shortid: shortid.generate(),
        [entitySets[entitySet].nameAttribute]: name
      })

      if (entitySet === 'templates') {
        newEntity.recipe = recipes.includes('chrome-pdf') ? 'chrome-pdf' : 'html'
        newEntity.engine = engines.includes('handlebars') ? 'handlebars' : engines[0]
      }
    }

    dispatch(entities.actions.add(newEntity))

    dispatch({
      type: ActionTypes.OPEN_NEW_TAB,
      tab: {
        _id: id,
        key: id,
        entitySet: entitySet,
        type: 'entity'
      }
    })
  }
}

export function activateTab (id) {
  return (dispatch, getState) => {
    dispatch({
      type: ActionTypes.ACTIVATE_TAB,
      key: id
    })
  }
}

export function updateHistory () {
  return (dispatch, getState) => {
    const entity = selectors.getActiveEntity(getState())
    let path

    if (entity && entity.shortid) {
      path = resolveUrl(`/studio/${entity.__entitySet}/${entity.shortid}`)
    } else {
      path = resolveUrl('/')
    }

    if (locationResolver) {
      path = locationResolver(path, entity)
    }

    if (path !== getState().routing.locationBeforeTransitions.pathname) {
      dispatch(push(path))
    }
  }
}

export function update (entity) {
  return async function (dispatch, getState) {
    await entities.actions.update(entity)(dispatch, getState)
  }
}

export function groupedUpdate (entity) {
  return async function (dispatch, getState) {
    await entities.actions.groupedUpdate(entity)(dispatch, getState)
  }
}

export function hierarchyMove (source, target, shouldCopy = false, replace = false, retry = true) {
  return async function (dispatch, getState) {
    let response

    let sourceEntity = entities.selectors.getById(getState(), source.id)

    if (sourceEntity.__isNew || sourceEntity.__isDirty) {
      dispatch(entities.actions.flushUpdates())

      sourceEntity = entities.selectors.getById(getState(), source.id)

      dispatch(entities.actions.update(Object.assign({}, sourceEntity, {
        folder: target.shortid != null ? { shortid: target.shortid } : null
      })))
    } else {
      try {
        dispatch(entities.actions.apiStart())

        response = await api.post('/studio/hierarchyMove', {
          data: {
            source: {
              entitySet: source.entitySet,
              id: source.id
            },
            target: {
              shortid: target.shortid
            },
            copy: shouldCopy === true,
            replace: replace === true
          }
        })

        if (replace === true) {
          if (Array.isArray(target.children)) {
            const sourceEntity = entities.selectors.getById(getState(), source.id, false)
            const sourceEntitySetNameAttr = entitySets[sourceEntity.__entitySet].nameAttribute

            let childTargetId
            let childTargetChildren = []

            const allFoldersInsideTarget = target.children.reduce((acu, childId) => {
              const childEntity = entities.selectors.getById(getState(), childId, false)
              const childEntitySetNameAttr = entitySets[childEntity.__entitySet].nameAttribute

              if (
                ((target.shortid == null && childEntity.folder == null) ||
                (target.shortid != null && childEntity.folder.shortid === target.shortid)) &&
                childEntity[childEntitySetNameAttr] === sourceEntity[sourceEntitySetNameAttr]
              ) {
                childTargetId = childEntity._id
              }

              if (childEntity.__entitySet === 'folders') {
                acu.push(childEntity.shortid)
              }

              return acu
            }, [])

            target.children.forEach((childId) => {
              const childEntity = entities.selectors.getById(getState(), childId, false)

              if (childEntity.folder && allFoldersInsideTarget.indexOf(childEntity.folder.shortid) !== -1) {
                childTargetChildren.push(childEntity._id)
              }
            })

            if (childTargetId) {
              dispatch(entities.actions.removeExisting(childTargetId, childTargetChildren))
            }
          }
        }

        response.items.forEach((item) => {
          dispatch(entities.actions.addExisting(item))
        })

        dispatch(entities.actions.apiDone())

        return response.items
      } catch (e) {
        if (retry && e.code === 'DUPLICATED_ENTITY' && e.existingEntityEntitySet !== 'folders') {
          dispatch(entities.actions.apiDone())

          return {
            duplicatedEntity: true,
            existingEntity: e.existingEntity,
            existingEntityEntitySet: e.existingEntityEntitySet
          }
        }

        dispatch(entities.actions.apiFailed(e))
      }
    }
  }
}

export function save () {
  return async function (dispatch, getState) {
    let entityId

    try {
      entityId = selectors.getActiveTab(getState())._id

      dispatch({
        type: ActionTypes.SAVE_STARTED
      })

      await entities.actions.save(entityId, { ignoreFailed: true })(dispatch, getState)

      dispatch({
        type: ActionTypes.SAVE_SUCCESS
      })
    } catch (e) {
      console.error(e)

      if (e.error && e.error.code === 'CONCURRENT_UPDATE_INVALID') {
        dispatch(progress.actions.stop())

        modalHandler.open(concurrentUpdateModal, {
          entityId: entityId,
          modificationDate: e.error.modificationDate
        })
      } else {
        dispatch(entities.actions.apiFailed(e))
      }
    }
  }
}

export function saveAll () {
  return async function (dispatch, getState) {
    try {
      dispatch({
        type: ActionTypes.SAVE_STARTED
      })

      await Promise.all(getState().editor.tabs.filter((t) => {
        return t.type === 'entity' && t.headerOrFooter == null
      }).map((t) => {
        return entities.actions.save(t._id, { ignoreFailed: true })(dispatch, getState)
      }))

      dispatch({
        type: ActionTypes.SAVE_SUCCESS
      })
    } catch (e) {
      if (e.error && e.error.code === 'CONCURRENT_UPDATE_INVALID') {
        dispatch(progress.actions.stop())

        modalHandler.open(concurrentUpdateModal, {
          entityId: e.entityId
        })
      } else {
        dispatch(entities.actions.apiFailed(e))
      }
    }
  }
}

const reformatter = function (code, mode) {
  return beautify[mode](code || '', {
    unformatted: ['script']
  })
}

export function reformat () {
  return async function (dispatch, getState) {
    try {
      // this flushed the updates
      dispatch(entities.actions.flushUpdates())

      const tab = selectors.getActiveTab(getState())

      const editorReformat = editorComponents[tab.editorComponentKey || tab.entitySet].reformat

      const activeEntity = selectors.getActiveEntity(getState())
      const toUpdate = editorReformat(reformatter, activeEntity, tab)

      dispatch(update(Object.assign({ _id: activeEntity._id }, toUpdate)))
    } catch (e) {
      console.error(e)
    }
  }
}

export function remove () {
  return async function (dispatch, getState) {
    const tab = selectors.getActiveTab(getState())
    await dispatch(entities.actions.remove(tab._id))
  }
}

export function run (target) {
  return async function (dispatch, getState) {
    let template = Object.assign({}, selectors.getLastActiveTemplate(getState()))
    let request = { template: template, options: {} }
    const entities = Object.assign({}, getState().entities)
    await Promise.all([...previewListeners.map((l) => l(request, entities, target))])
    dispatch({ type: ActionTypes.RUN })

    preview(request, target || 'previewFrame')
  }
}

export function activateUndockMode () {
  return {
    type: ActionTypes.ACTIVATE_UNDOCK_MODE
  }
}

export function desactivateUndockMode () {
  return {
    type: ActionTypes.DESACTIVATE_UNDOCK_MODE
  }
}
