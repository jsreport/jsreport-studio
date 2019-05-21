import { connect } from 'react-redux'
import * as configuration from './lib/configuration.js'
import TemplateProperties from './components/Properties/TemplateProperties.js'
import EntityTree from './components/EntityTree/EntityTree.js'
import EntityTreeNewButton from './components/EntityTree/EntityTreeNewButton'
import EntityTreeInputSearch from './components/EntityTree/EntityTreeInputSearch.js'
import EntityTreeNavigateButton from './components/EntityTree/EntityTreeNavigateButton.js'
import Startup from './containers/Startup/Startup.js'
import AboutModal from './components/Modals/AboutModal'
import ApiModal from './components/Modals/ApiModal.js'
import NewFolderModal from './components/Modals/NewFolderModal'
import ConcurrentUpdateErrorModal from './components/Modals/ConcurrentUpdateErrorModal'
import { openTab } from './redux/editor/actions'

export default () => {
  configuration.propertiesComponents.push({
    title: TemplateProperties.title,
    shouldDisplay: (entity) => entity.__entitySet === 'templates',
    component: TemplateProperties
  })

  configuration.editorComponents.templates = require('./components/Editor/TemplateEditor.js')

  configuration.editorComponents.templates.reformat = (reformatter, entity) => {
    const content = reformatter(entity.content, 'html')
    const helpers = reformatter(entity.helpers, 'js')

    return {
      content: content,
      helpers: helpers
    }
  }

  configuration.editorComponents.folders = require('./components/Editor/FolderEditor.js')

  configuration.editorComponents.startup = Startup

  configuration.entitySets.templates = {
    name: 'templates',
    visibleName: 'template',
    nameAttribute: 'name',
    referenceAttributes: ['name', 'recipe', 'shortid'],
    entityTreePosition: 1000
  }

  configuration.entitySets.folders = {
    name: 'folders',
    faIcon: 'fa-folder',
    visibleName: 'folder',
    visibleInTree: false,
    nameAttribute: 'name',
    referenceAttributes: ['name', 'shortid'],
    onNew: (options) => configuration.modalHandler.open(NewFolderModal, options)
  }

  configuration.sharedComponents.EntityTree = EntityTree

  configuration.apiSpecs = {
    template: {
      content: '...',
      helpers: '...',
      engine: '...',
      recipe: '...'
    },
    data: {
      aProperty: '...'
    },
    options: {}
  }

  // default filter by name strategy
  configuration.entityTreeFilterItemResolvers.push((entity, entitySets, filterInfo) => {
    const { name } = filterInfo

    if (name == null || name === '') {
      return true
    }

    const entityName = entitySets[entity.__entitySet].nameAttribute ? entity[entitySets[entity.__entitySet].nameAttribute] : entity.name

    return entityName.indexOf(name) !== -1
  })

  configuration.entityTreeContextMenuItemsResolvers.push(({
    entity,
    entitySets,
    isRoot,
    isGroupEntity,
    getVisibleEntitySetsInTree,
    onNewClick
  }) => {
    const items = []

    if (isRoot || isGroupEntity) {
      items.push({
        key: 'New Entity',
        title: 'New Entity',
        icon: 'fa-file',
        onClick: () => false,
        items: getVisibleEntitySetsInTree(entitySets).map((entitySet) => ({
          key: entitySet.name,
          title: entitySet.visibleName,
          icon: entitySet.faIcon != null ? entitySet.faIcon : 'fa-file',
          onClick: () => {
            onNewClick(
              isRoot ? undefined : entity._id,
              entitySet.name,
              { defaults: { folder: isRoot ? null : { shortid: entity.shortid } } }
            )
          }
        }))
      })

      items.push({
        key: 'New Folder',
        title: 'New Folder',
        icon: 'fa-folder',
        onClick: () => {
          onNewClick(
            isRoot ? null : entity._id,
            'folders',
            { defaults: { folder: isRoot ? null : { shortid: entity.shortid } } }
          )
        }
      })
    }

    return {
      grouped: true,
      items
    }
  })

  configuration.entityTreeContextMenuItemsResolvers.push(({
    node,
    clipboard,
    entity,
    isRoot,
    isGroupEntity,
    disabledClassName,
    getAllEntitiesInHierarchy,
    setClipboard,
    releaseClipboardTo,
    onNodeClick,
    onRename,
    onClone,
    onRemove
  }) => {
    const items = []

    if (isGroupEntity) {
      items.push({
        key: 'Edit',
        title: 'Edit',
        icon: 'fa-edit',
        onClick: () => {
          onNodeClick(entity)
        }
      })
    }

    if (!isRoot) {
      items.push({
        key: 'Rename',
        title: 'Rename',
        icon: 'fa-pencil',
        onClick: () => {
          onRename(entity._id)
        }
      })
    }

    if (!isRoot && isGroupEntity == null) {
      items.push({
        key: 'Clone',
        title: 'Clone',
        icon: 'fa-clone',
        onClick: () => {
          onClone(entity)
        }
      })
    }

    if (!isRoot && (isGroupEntity || isGroupEntity == null)) {
      items.push({
        key: 'Cut',
        title: 'Cut',
        icon: 'fa-cut',
        className: entity.__isNew === true ? disabledClassName : '',
        onClick: () => {
          if (entity.__isNew === true) {
            // prevents menu to be hidden
            return false
          }

          setClipboard({ action: 'move', entityId: entity._id, entitySet: entity.__entitySet })
        }
      })
    }

    if (!isRoot && (isGroupEntity == null)) {
      items.push({
        key: 'Copy',
        title: 'Copy',
        icon: 'fa-copy',
        className: entity.__isNew === true ? disabledClassName : '',
        onClick: () => {
          if (entity.__isNew === true) {
            // prevents menu to be hidden
            return false
          }

          setClipboard({ action: 'copy', entityId: entity._id, entitySet: entity.__entitySet })
        }
      })
    }

    if ((isRoot || (isGroupEntity || isGroupEntity == null))) {
      items.push({
        key: 'Paste',
        title: 'Paste',
        icon: 'fa-paste',
        className: clipboard == null ? disabledClassName : '',
        onClick: () => {
          if (clipboard == null) {
            // prevents menu to be hidden
            return false
          }

          releaseClipboardTo({
            shortid: isRoot ? null : (isGroupEntity ? entity.shortid : (entity.folder != null ? entity.folder.shortid : null)),
            children: isRoot ? [] : (isGroupEntity ? getAllEntitiesInHierarchy(node) : [])
          })
        }
      })
    }

    if (!isRoot) {
      items.push({
        key: 'Delete',
        title: 'Delete',
        icon: 'fa-trash',
        onClick: () => {
          const children = getAllEntitiesInHierarchy(node)
          onRemove(entity._id, children.length > 0 ? children : undefined)
        }
      })
    }

    return {
      items
    }
  })

  configuration.entityTreeToolbarComponents.single.push((props) => (
    <EntityTreeNewButton {...props} />
  ))

  configuration.entityTreeToolbarComponents.single.push((props) => (
    <EntityTreeInputSearch {...props} />
  ))

  configuration.entityTreeToolbarComponents.single.push((props) => (
    <EntityTreeNavigateButton {...props} />
  ))

  configuration.toolbarComponents.settings.push(connect(
    undefined,
    { openTab }
  )((props) => {
    if (!configuration.extensions.studio.options.startupPage) {
      return null
    }

    return (
      <div
        onClick={() => props.openTab({ key: 'StartupPage', editorComponentKey: 'startup', title: 'Startup' })}>
        <i className='fa fa-home' /> Startup page
      </div>
    )
  }))

  configuration.aboutModal = AboutModal

  configuration.toolbarComponents.settings.push(() => (
    <div
      onClick={() => configuration.modalHandler.open(configuration.aboutModal, {
        version: configuration.version,
        engines: configuration.engines,
        recipes: configuration.recipes,
        extensions: configuration.extensions
      })}>
      <i className='fa fa-info-circle' /> About
    </div>
  ))

  configuration.toolbarComponents.settings.push(() => (
    <div
      onClick={() => configuration.modalHandler.open(ApiModal, { apiSpecs: configuration.apiSpecs })}>
      <i className='fa fa-plug' /> API
    </div>
  ))

  configuration.concurrentUpdateModal = ConcurrentUpdateErrorModal

  configuration.initializeListeners.push(() => {
    configuration.entityTreeIconResolvers.push((entity) => {
      if (entity.__entitySet !== 'templates') {
        return
      }

      if (entity.recipe === 'html') {
        return 'fa-html5'
      }

      if (entity.recipe.indexOf('xlsx') !== -1) {
        return 'fa-table'
      }

      if (entity.recipe.indexOf('pdf') !== -1) {
        return 'fa-file-pdf-o'
      }

      if (entity.recipe.indexOf('html') !== -1) {
        return 'fa-html5'
      }
    })

    configuration.entityTreeIconResolvers.push((entity, info = {}) => {
      if (entity.__entitySet === 'folders') {
        if (info.isCollapsed) {
          return 'fa-folder'
        } else {
          return 'fa-folder-open'
        }
      }
    })
  })
}
