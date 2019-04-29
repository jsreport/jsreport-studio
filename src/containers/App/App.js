import Promise from 'bluebird'
import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import { actions, selectors } from 'redux/editor'
import * as entities from 'redux/entities'
import Preview from '../../components/Preview/Preview.js'
import EntityTreeBox from '../../components/EntityTree/EntityTreeBox.js'
import EntityTree from '../../components/EntityTree/EntityTree.js'
import Properties from '../../components/Properties/Properties.js'
import style from './App.scss'
import Toolbar from '../../components/Toolbar/Toolbar.js'
import Helmet from 'react-helmet'
import SplitPane from '../../components/common/SplitPane/SplitPane.js'
import EditorTabs from '../../components/Tabs/EditorTabs.js'
import TabTitles from '../../components/Tabs/TabTitles.js'
import Modal from '../Modal/Modal.js'
import NewEntityModal from '../../components/Modals/NewEntityModal.js'
import DeleteConfirmationModal from '../../components/Modals/DeleteConfirmationModal.js'
import CloseConfirmationModal from '../../components/Modals/CloseConfirmationModal.js'
import RenameModal from '../../components/Modals/RenameModal.js'
import RestoreDockConfirmationModal from '../../components/Modals/RestoreDockConfirmationModal.js'
import * as progress from '../../redux/progress'
import getCloneName from '../../../shared/getCloneName'
import cookies from 'js-cookie'
import {
  extensions,
  triggerSplitResize,
  removeHandler,
  previewListeners,
  registerPreviewHandler,
  entitySets,
  shouldOpenStartupPage,
  registerCollapseLeftHandler,
  registerCollapsePreviewHandler,
  collapseEntityHandler,
  entityTreeWrapperComponents
} from '../../lib/configuration.js'

const progressActions = progress.actions

@connect((state) => ({
  entities: state.entities,
  references: entities.selectors.getReferences(state),
  activeTabKey: state.editor.activeTabKey,
  activeTabWithEntity: selectors.getActiveTabWithEntity(state),
  isPending: progress.selectors.getIsPending(state),
  canRun: selectors.canRun(state),
  canSave: selectors.canSave(state),
  canSaveAll: selectors.canSaveAll(state),
  canReformat: selectors.canReformat(state),
  tabsWithEntities: selectors.getTabWithEntities(state),
  activeEntity: selectors.getActiveEntity(state),
  lastActiveTemplate: selectors.getLastActiveTemplate(state),
  undockMode: state.editor.undockMode,
  getEntityByShortid: (shortid, ...params) => entities.selectors.getByShortid(state, shortid, ...params)
}), { ...actions, ...progressActions })
class App extends Component {
  static contextTypes = {
    store: PropTypes.object.isRequired
  }

  static propTypes = {
    entities: PropTypes.object,
    references: PropTypes.object,
    tabsWithEntities: PropTypes.array,
    currentDetail: PropTypes.object,
    error: PropTypes.string,
    loading: PropTypes.bool,
    loaded: PropTypes.bool
  };

  constructor (props) {
    super(props)

    this.openModal = this.openModal.bind(this)
    this.undockPreview = this.undockPreview.bind(this)
    this.handlePreviewCollapsing = this.handlePreviewCollapsing.bind(this)
    this.handlePreviewDocking = this.handlePreviewDocking.bind(this)
    this.handlePreviewUndocking = this.handlePreviewUndocking.bind(this)
    this.handlePreviewUndocked = this.handlePreviewUndocked.bind(this)
    this.isPreviewUndockeable = this.isPreviewUndockeable.bind(this)
  }

  componentDidMount () {
    window.onbeforeunload = () => {
      if (this.props.canSaveAll) {
        return 'You may have unsaved changes'
      }
    }

    registerPreviewHandler((src) => {
      if (!src) {
        this.handleRun(undefined, this.props.undockMode)
      }
    })

    registerCollapseLeftHandler((type = true) => {
      this.refs.leftPane.collapse(type)
    })

    registerCollapsePreviewHandler((type = true) => {
      this.refs.previewPane.collapse(type)
    })

    previewListeners.push((request, entities, target) => {
      const { undockMode } = this.props

      // we need to try to open the window again to get a reference to any existing window
      // created with the id, this is necessary because the window can be closed by the user
      // using the native close functionality of the browser tab,
      // if we don't try to open the window again we will have inconsistent references and
      // we can not close all preview tabs when un-collapsing the main pane preview again
      if (undockMode && this.refs.previewPane && target && target.indexOf(request.template.shortid) !== -1) {
        let previewWinOpts = this.getPreviewWindowOptions()
        this.refs.previewPane.openWindow(previewWinOpts)
      }
    })

    if (this.props.params.shortid) {
      collapseEntityHandler({ shortid: this.props.params.shortid }, false, { parents: true, self: false })

      this.props.openTab({ shortid: this.props.params.shortid, entitySet: this.props.params.entitySet })
      return
    }

    this.openStartup()
  }

  componentDidUpdate () {
    this.props.updateHistory()
  }

  async handleRun (target, undockMode) {
    this.props.start()
    cookies.set('render-complete', false)

    const interval = setInterval(() => {
      if (cookies.get('render-complete') === 'true') {
        clearInterval(interval)
        this.props.stop()
      }
    }, 1000)

    if (undockMode) {
      let previewWindowOpts = this.getPreviewWindowOptions()

      this.props.run(previewWindowOpts.name)
      return
    }

    this.props.run(target)
  }

  openModal (componentOrText, options) {
    this.refOpenModal(componentOrText, options)
  }

  getPreviewWindowOptions () {
    const { lastActiveTemplate } = this.props

    if (!lastActiveTemplate) {
      return {}
    }

    return {
      id: lastActiveTemplate.shortid,
      name: 'previewFrame-' + lastActiveTemplate.shortid,
      tab: true
    }
  }

  save () {
    return this.props.save()
  }

  saveAll () {
    return this.props.saveAll()
  }

  handleSplitChanged () {
    triggerSplitResize()

    if (this.refs.preview) {
      this.refs.preview.resizeStarted()
    }
  }

  openStartup () {
    if (!extensions.studio.options.startupPage) {
      return
    }

    if (shouldOpenStartupPage) {
      this.props.openTab({ key: 'StartupPage', editorComponentKey: 'startup', title: 'Startup' })
    }
  }

  closeTab (key) {
    const entity = entities.selectors.getById(this.context.store.getState(), key, false)
    if (!entity || !entity.__isDirty) {
      return this.props.closeTab(key)
    }
    this.openModal(CloseConfirmationModal, { _id: key })
  }

  undockPreview () {
    if (!this.refs.previewPane) {
      return
    }

    const { lastActiveTemplate } = this.props

    if (!lastActiveTemplate) {
      return
    }

    this.refs.previewPane.collapse(true, true, true)
  }

  handleSplitDragFinished () {
    if (this.refs.preview) {
      this.refs.preview.resizeEnded()
    }
  }

  isPreviewUndockeable () {
    const { activeTabWithEntity, undockMode } = this.props

    // if we are in undock mode the pane return true
    if (undockMode) {
      return true
    }

    return (
      activeTabWithEntity &&
      activeTabWithEntity.entity &&
      activeTabWithEntity.entity.__entitySet === 'templates'
    )
  }

  handlePreviewCollapsing (collapsed) {
    if (!this.props.undockMode) {
      return true
    }

    if (!collapsed) {
      return new Promise((resolve) => {
        this.openModal(RestoreDockConfirmationModal, {
          onResponse: (response) => resolve(response)
        })
      })
    }

    return true
  }

  handlePreviewDocking () {
    const previews = this.refs.previewPane.windows

    // close all preview windows when docking
    if (Object.keys(previews).length) {
      Object.keys(previews).forEach((id) => previews[id] && previews[id].close())
    }

    this.refs.previewPane.windows = {}
  }

  handlePreviewUndocking () {
    const { activeTabWithEntity } = this.props

    if (
      activeTabWithEntity &&
      activeTabWithEntity.entity &&
      activeTabWithEntity.entity.__entitySet === 'templates'
    ) {
      this.props.activateUndockMode()

      return this.getPreviewWindowOptions()
    }

    return false
  }

  handlePreviewUndocked (id, previewWindow) {
    const previews = this.refs.previewPane.windows

    previews[id] = previewWindow

    this.handleRun(undefined, this.props.undockMode)
  }

  renderEntityTree () {
    const containerStyles = {
      display: 'flex',
      flex: 1,
      flexDirection: 'column',
      // firefox needs min-height and min-width explicitly declared to allow descendants flex items to be scrollable (overflow)
      minWidth: 0,
      minHeight: 0
    }

    const { activeEntity, references, openTab } = this.props

    const entityTreeProps = {
      main: true,
      toolbar: true,
      onRename: (id) => this.openModal(RenameModal, { _id: id }),
      onClone: (entity) => {
        this.openModal(NewEntityModal, {
          cloning: true,
          entity: entity,
          entitySet: entity.__entitySet,
          initialName: getCloneName(entity[entitySets[entity.__entitySet].nameAttribute])
        })
      },
      onRemove: (id, children) => removeHandler ? removeHandler(id, children) : this.openModal(DeleteConfirmationModal, { _id: id, childrenIds: children }),
      activeEntity,
      entities: references,
      onClick: (_id) => openTab({ _id: _id }),
      onNewClick: (es, options) => entitySets[es].onNew ? entitySets[es].onNew(options || {}) : this.openModal(NewEntityModal, { ...options, entitySet: es })
    }

    // if there are no components registered, defaults to rendering the EntityTree alone
    if (!entityTreeWrapperComponents.length) {
      return React.createElement(EntityTree, entityTreeProps)
    }

    // composing components
    const wrappedEntityTree = entityTreeWrapperComponents.reduce((prevElement, component) => {
      const propsToWrapper = {
        entities: references,
        entitySets: entitySets,
        containerStyles
      }

      if (prevElement == null) {
        return React.createElement(
          component,
          propsToWrapper,
          React.createElement(EntityTree, entityTreeProps)
        )
      }

      return React.createElement(
        component,
        propsToWrapper,
        prevElement
      )
    }, null)

    if (!wrappedEntityTree) {
      return null
    }

    return wrappedEntityTree
  }

  render () {
    const {
      tabsWithEntities,
      isPending,
      canRun,
      canSave,
      canSaveAll,
      canReformat,
      activeTabWithEntity,
      entities,
      stop,
      activateTab,
      activeTabKey,
      activeEntity,
      update,
      groupedUpdate,
      reformat,
      undockMode
    } = this.props

    return (
      <div className='container'>
        <Helmet />
        <Modal ref='modal' openCallback={(open) => { this.refOpenModal = open }} />

        <div className={style.appContent + ' container'}>
          <div className='block'>
            <Toolbar
              canRun={canRun}
              canSave={canSave}
              canSaveAll={canSaveAll}
              onSave={() => this.save()}
              onSaveAll={() => this.saveAll()}
              isPending={isPending}
              activeTab={activeTabWithEntity}
              onUpdate={update}
              canReformat={canReformat}
              onReformat={reformat}
              onRun={(target, ignoreUndockMode) => this.handleRun(target, ignoreUndockMode ? false : undockMode)}
              undockPreview={this.undockPreview}
              openStartup={() => this.openStartup()}
            />

            <div className='block'>
              <SplitPane
                ref='leftPane'
                collapsedText='Objects / Properties' collapsable='first'
                resizerClassName='resizer' defaultSize='85%' onChange={() => this.handleSplitChanged()}
                onDragFinished={() => this.handleSplitDragFinished()}>
                <SplitPane
                  resizerClassName='resizer-horizontal' split='horizontal'
                  defaultSize={(window.innerHeight * 0.5) + 'px'}>
                  <EntityTreeBox>
                    {this.renderEntityTree()}
                  </EntityTreeBox>
                  <Properties entity={activeEntity} entities={entities} onChange={update} />
                </SplitPane>

                <div className='block'>
                  <TabTitles
                    activeTabKey={activeTabKey} activateTab={activateTab} tabs={tabsWithEntities}
                    closeTab={(k) => this.closeTab(k)} />
                  <SplitPane
                    ref='previewPane'
                    collapsedText='preview'
                    collapsable='second'
                    undockeable={this.isPreviewUndockeable}
                    onChange={() => this.handleSplitChanged()}
                    onCollapsing={this.handlePreviewCollapsing}
                    onDocking={this.handlePreviewDocking}
                    onUndocking={this.handlePreviewUndocking}
                    onUndocked={this.handlePreviewUndocked}
                    onDragFinished={() => this.handleSplitDragFinished()}
                    resizerClassName='resizer'>
                    <EditorTabs
                      activeTabKey={activeTabKey} onUpdate={(v) => groupedUpdate(v)} tabs={tabsWithEntities} />
                    <Preview ref='preview' onLoad={stop} />
                  </SplitPane>
                </div>
              </SplitPane>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default DragDropContext(HTML5Backend)(App)
