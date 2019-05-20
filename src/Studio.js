import React from 'react'
import ReactDom from 'react-dom'
import ReactList from 'react-list'
import superagent from 'superagent'
import shortid from 'shortid'
import fileSaver from 'filesaver.js-npm'
import _merge from 'lodash/merge'
import api, { methods } from './helpers/api.js'
import SplitPane from './components/common/SplitPane/SplitPane.js'
import Popover from './components/common/Popover/index.js'
import MultiSelect from './components/common/MultiSelect/index.js'
import EntityRefSelect from './components/common/EntityRefSelect/index.js'
import TextEditor from './components/Editor/TextEditor.js'
import EntityTree from './components/EntityTree/EntityTree.js'
import EntityTreeButton from './components/EntityTree/EntityTreeButton.js'
import NewEntityModal from './components/Modals/NewEntityModal.js'
import * as editor from './redux/editor'
import * as entities from './redux/entities'
import * as progress from './redux/progress'
import * as settings from './redux/settings'
import * as configuration from './lib/configuration.js'
import resolveUrl from './helpers/resolveUrl.js'
import babelRuntime from './lib/babelRuntime.js'
import customPreview from './helpers/customPreview.js'
import bluebird from 'bluebird'
import io from 'socket.io-client'

/**
 * Main facade and API for extensions. Exposed as global variable Studio. It can be also imported from jsreport-studio
 * when using extensions default webpack configuration
 * @class
 * @public
 */
class Studio {
  /** event listeners **/

  /**
   * Array of async functions invoked in sequence during initialization
   * @returns {Function[]}
   */
  get initializeListeners () {
    return configuration.initializeListeners
  }

  /**
   * Array of async functions invoked in sequence after the app has been rendered
   * @returns {Function[]}
   */
  get readyListeners () {
    return configuration.readyListeners
  }

  /**
   * Array of async functions invoked in sequence when preview process starts.
   * @returns {Function[]}
   */
  get previewListeners () {
    return configuration.previewListeners
  }

  get textEditorInitializeListeners () {
    return configuration.textEditorInitializeListeners
  }

  get textEditorCreatedListeners () {
    return configuration.textEditorCreatedListeners
  }

  /** /event listeners **/

  /** initial configuration **/

  /**
   * Add new entity set, which will be automatically loaded through OData and displayed in the entity tree
   * @example Studio.addEntitySet({ name: 'data', visibleName: 'sample data' })
   * @param {Object} entitySet
   */
  addEntitySet (entitySet) {
    entitySet.nameAttribute = entitySet.nameAttribute || 'name'
    entitySet.referenceAttributes = [...new Set([...(entitySet.referenceAttributes || []), entitySet.nameAttribute, 'shortid'])]
    configuration.entitySets[entitySet.name] = entitySet
  }

  /**
   * Add React component which will be displayed in toolbar
   *
   * @param {ReactComponent|Function} toolbarComponent
   * @param {String} position left, right, settings or settingsBottom
   */
  addToolbarComponent (toolbarComponent, position = 'left') {
    configuration.toolbarComponents[position].push(toolbarComponent)
  }

  /**
   * Add React component which will be displayed as a wrapper/container for entity tree
   *
   * @param {ReactComponent|Function} entityTreeWrapperComponent
   */
  addEntityTreeWrapperComponent (entityTreeWrapperComponent) {
    configuration.entityTreeWrapperComponents.push(entityTreeWrapperComponent)
  }

  /**
   * Add React component which will be displayed in toolbar of entity tree
   *
   * @param {ReactComponent|Function} entityTreeToolbarComponent
   */
  addEntityTreeToolbarComponent (entityTreeToolbarComponent, position = 'single') {
    configuration.entityTreeToolbarComponents[position].push(entityTreeToolbarComponent)
  }

  /**
   * Add React component which will be displayed when rendering an item of entity tree
   *
   * @param {ReactComponent|Function} entityTreeItemComponent
   * @param {String} position right, groupRight or container
   */
  addEntityTreeItemComponent (entityTreeItemComponent, position = 'right') {
    configuration.entityTreeItemComponents[position].push(entityTreeItemComponent)
  }

  /**
   *  Add a fn to resolve items for the conext menu at Entity Tree
   *  @param {Function} fn
   */
  addEntityTreeContextMenuItemsResolver (fn) {
    configuration.entityTreeContextMenuItemsResolvers.push(fn)
  }

  /**
   * Add React component which will be used as tab title
   *
   * @param {String} key used in openTab
   * @param {ReactComponent|Function} component
   */
  addTabTitleComponent (key, component) {
    configuration.tabTitleComponents[key] = component
  }

  /**
   * Add component used in tab as content editor
   *
   * @param {String} key - key used in openTab({ editorComponentKey: ... , use entity set name if the editor should represent the main entity editor
   * @param {ReactComponent|Function} component
   * @param {Function} reformat - function handling reformatting code
   */
  addEditorComponent (key, component, reformat) {
    configuration.editorComponents[key] = component
    configuration.editorComponents[key].reformat = reformat
  }

  /**
   * Add component used in the left Properties secion
   *
   * @param {Function|String} string or title function used to render the section title
   * @param {ReactComponent|Function} component
   * @param {Function} shouldDisplay
   */
  addPropertiesComponent (title, component, shouldDisplay) {
    configuration.propertiesComponents.push({
      title: title,
      component: component,
      shouldDisplay: shouldDisplay
    })
  }

  /**
   * Array of functions used to resolve ace editor mode for template content. This is used by custom templating engines
   * to add highlighting support for jade,ejs...
   *
   * @returns {Function[]}
   */
  get templateEditorModeResolvers () {
    return configuration.templateEditorModeResolvers
  }

  /**
   * Array of functions used to resolve entity icon in entity tree, function accepts entity and returns string like fa-cog
   *
   * @returns {Function[]}
   */
  get entityTreeIconResolvers () {
    return configuration.entityTreeIconResolvers
  }

  /**
   * Array of functions used to resolve filtering in entity tree,
   * function accepts entity, entitySets and filter info, should return boolean to determine if
   * item should be skipped or not
   *
   * @returns {Function[]}
   */
  get entityTreeFilterItemResolvers () {
    return configuration.entityTreeFilterItemResolvers
  }

  /**
   * Sets the function returning the browser url path
   * (defaultCalculatedPath, currentEntity) => String
   * @param {Function} fn
   */
  set locationResolver (fn) {
    configuration.locationResolver = fn
  }

  /**
   * Set the function retunring the visibility flag for particular toolbar button
   * ('Save All') => return true
   * @param {Function} fn
   */
  set toolbarVisibilityResolver (fn) {
    configuration.toolbarVisibilityResolver = fn
  }

  /**
   * Override the default entities references loading with custom function
   * (entitySet) => Promise([array])
   * @param {Function} fn
   */
  set referencesLoader (fn) {
    configuration.referencesLoader = fn
  }

  /**
   * Optionally you can avoid displaying default startup page
   * @param {Boolean} trueOrFalse
   */
  set shouldOpenStartupPage (trueOrFalse) {
    configuration.shouldOpenStartupPage = trueOrFalse
  }

  /**
   * Override the default entity remove behavior
   * (id) => {})
   * @param {Function} fn
   */
  set removeHandler (fn) {
    configuration.removeHandler = fn
  }

  /**
   * Set additional custom header to all api calls
   * @param {String} key
   * @param {String} value
   */
  setRequestHeader (key, value) {
    configuration.apiHeaders[key] = value
  }

  /**
   * Merges in the object defining the api which is used in api fialog
   * @param {Object} obj
   */
  addApiSpec (obj) {
    _merge(configuration.apiSpecs, obj)
  }

  /** /initial configuration **/

  /** runtime helpers **/

  /**
   * Override the right preview pane with additional content
   * setPreviewFrameSrc('data:text/html;charset=utf-8,foooooooo')
   * @param {String} frameSrc
   */
  setPreviewFrameSrc (frameSrc) {
    configuration.previewFrameChangeHandler(frameSrc)
  }

  /**
   * Display custom content in the preview pane using http post to the url
   * This is usefull when Studio.setPreviewFrameSrc isn't working because the content to set is too big
   * and hits the iframe src chars limit.
   * @param {String} frameSrc
   */
  customPreview (url, request) {
    return customPreview(url, request)
  }

  /**
   * Provides methods get,patch,post,del for accessing jsreport server
   *
   * @example
   * await Studio.api.patch('/odata/tasks', { data: { foo: '1' } })
   *
   * @returns {*}
   */
  get api () {
    return this.API
  }

  /**
   * Get registered entity sets, each one is object { visibleName: 'foo', nameAttribute: 'name' }
   * @returns {Object[]}
   */
  get entitySets () {
    return configuration.entitySets
  }

  /**
   * Object[name] with registered extensions and its options
   * @returns {Object}
   */
  get extensions () {
    return configuration.extensions
  }

  /**
   * Opens modal dialog.
   *
   * @param {ReacrComponent|String}componentOrText
   * @param {Object} options passed as props to the react component
   */
  openModal (componentOrText, options) {
    configuration.modalHandler.open(componentOrText, options || {})
  }

  openNewModal (entitySet) {
    configuration.modalHandler.open(NewEntityModal, { entitySet: entitySet })
  }

  isModalOpen () {
    return configuration.modalHandler.isModalOpen()
  }

  /**
   * Invoke preview process for last active template
   */
  preview () {
    configuration.previewHandler()
  }

  /**
   * Collapse entity in EntityTree
   */
  collapseEntity (entityIdOrShortid, state = true, options = {}) {
    configuration.collapseEntityHandler(entityIdOrShortid, state, options)
  }

  /**
   * Collapse left pane
   */
  collapseLeftPane (type = true) {
    configuration.collapseLeftHandler(type)
  }

  /**
   * Collapse preview pane
   */
  collapsePreviewPane (type = true) {
    configuration.collapsePreviewHandler(type)
  }

  /**
   * Open and activate new editor tab
   *
   * @example
   * //open entity editor
   * Studio.openTab({ _id: 'myentityid' })
   * //open custom page
   * Studio.openTab({ key: 'StartupPage', editorComponentKey: 'startup', title: 'Statup' })
   *
   * @param {Object} tab
   */
  openTab (tab) {
    return this.store.dispatch(editor.actions.openTab(tab))
  }

  /**
   * Loads entity, which reference is already present in the ui state, from the remote API
   *
   * @param {String} id
   * @param {Boolean} force
   * @return {Promise}
   */
  loadEntity (id, force = false) {
    return this.store.dispatch(entities.actions.load(id, force))
  }

  /**
   * Remove the additional entity properties from the state, keep just meta and id
   * @param {String} id
   */
  unloadEntity (id) {
    return this.store.dispatch(entities.actions.unload(id))
  }

  /**
   * Add entity to the state
   * @param {Object} entity
   */
  addEntity (entity) {
    this.store.dispatch(entities.actions.add(entity))
  }

  /**
   * Update entity in the state
   * @param {Object} entity
   */
  updateEntity (entity) {
    this.store.dispatch(entities.actions.update(entity))
  }

  /**
   * Call remote API and persist (insert or update) entity
   * @param {String} id
   * @return {Promise}
   */
  saveEntity (id) {
    return this.store.dispatch(entities.actions.save(id))
  }

  /**
   * Adds already existing (persisted) entity into the UI state
   * @param entity
   */
  addExistingEntity (entity) {
    this.store.dispatch(entities.actions.addExisting(entity))
  }

  /**
   * Replace the existing entity in the state
   * @param {String} oldId
   * @param {Object} entity
   */
  replaceEntity (oldId, entity) {
    this.store.dispatch(entities.actions.replace(oldId, entity))
  }

  /**
   * Remove entity from the state
   * @param {String} id
   */
  removeEntity (id) {
    this.store.dispatch({
      type: entities.ActionTypes.REMOVE,
      _id: id
    })
  }

  /**
   * Show ui signalization for running background operation
   */
  startProgress () {
    this.store.dispatch(progress.actions.start())
  }

  /**
   * Hide ui signalization for running background operation
   */
  stopProgress () {
    this.store.dispatch(progress.actions.stop())
  }

  /**
   * Synchronize the location with history
   */
  updateHistory () {
    this.store.dispatch(editor.actions.updateHistory())
  }

  /**
   * Clear the current state and reload internally studio
   */
  async reset () {
    await this.store.dispatch({ type: 'RESET' })
    await this.store.dispatch(editor.actions.updateHistory())
    await this.store.dispatch(settings.actions.load())
    await bluebird.all(Object.keys(this.entitySets).map((t) => this.store.dispatch(entities.actions.loadReferences(t))))
  }

  /**
   * Get all settings from state
   * @returns {Object[]}
   */
  getSettings () {
    return settings.selectors.getAll(this.store.getState())
  }

  /**
   * Save one setting in state and persist it on the server
   * @param {String} key
   * @param {Object} value
   */
  setSetting (key, value) {
    return this.store.dispatch(settings.actions.update(key, value))
  }

  /**
   * Get one setting value from the state
   * @param {String} key
   * @param {Boolean} shouldThrow
   */
  getSettingValueByKey (key, shouldThrow = true) {
    return settings.selectors.getValueByKey(this.store.getState(), key, shouldThrow)
  }

  /**
   * Searches for the entity in the UI state based on specified _id
   * @param {String} _id
   * @param {Boolean} shouldThrow
   * @returns {Object|null}
   */
  getEntityById (_id, shouldThrow = true) {
    return entities.selectors.getById(this.store.getState(), _id, shouldThrow)
  }

  /**
   * Searches for the entity in the UI state based on specified shortid
   * @param {String} shortid
   * @param {Boolean} shouldThrow
   * @returns {Object|null}
   */
  getEntityByShortid (shortid, shouldThrow = true) {
    return entities.selectors.getByShortid(this.store.getState(), shortid, shouldThrow)
  }

  /**
   * Returns the currently selected entity or null
   * @returns {Object}
   */
  getActiveEntity () {
    return editor.selectors.getActiveEntity(this.store.getState())
  }

  /**
   * Returns last active entity
   * @returns {Object|null}
   */
  getLastActiveTemplate () {
    return editor.selectors.getLastActiveTemplate(this.store.getState())
  }

  /**
   * Get all entities including meta attributes in array
   * @returns {Object[]}
   */
  getAllEntities () {
    return entities.selectors.getAll(this.store.getState())
  }

  /**
   * Get references to entities
   * @returns {Object[]}
   */
  getReferences () {
    return entities.selectors.getReferences(this.store.getState())
  }

  /**
   * Get the path in absolute form like /api/images and make it working also for jsreport running on subpath like myserver.com/reporting/api/images
   * @param {String} path
   * @returns {String}
   */
  resolveUrl (path) {
    return resolveUrl(path)
  }

  /**
   * Assemble entity absolute path
   * @param {*} entity
   * @returns {String}
   */
  resolveEntityPath (entity) {
    return entities.selectors.resolveEntityPath(this.store.getState(), entity)
  }

  relativizeUrl (path) {
    console.trace('relativizeUrl is deprecated, use resolveUrl')
    return resolveUrl(path)
  }

  /**
   * absolute root url to the server, like http://localhost/reporting
   * @returns {string}
   */
  get rootUrl () {
    return window.location.href.substring(0, window.location.href.indexOf('/studio'))
  }

  /** /runtime helpers **/

  /** react components **/

  /**
   * Ace editor React wrapper
   *
   * @example
   * export default class DataEditor extends TextEditor { ... }
   *
   * @returns {TextEditor}
   */
  get TextEditor () {
    return TextEditor
  }

  /**
   * Component used to split content with sliders
   *
   * @returns {SplitPane}
   */
  get SplitPane () {
    return SplitPane
  }

  /**
   * Component used to show content in a popover
   *
   * @returns {Popover}
   */
  get Popover () {
    return Popover
  }

  /**
   * Component used to visualise entities
   *
   * @returns {EntityTree}
   */
  get EntityTree () {
    return EntityTree
  }

  /**
   * Component used to add actions in EntityTree toolbar
   * @returns {EntityTreeButton}
   */
  get EntityTreeButton () {
    return EntityTreeButton
  }

  /**
   * Component used for multi-select options
   * @returns {MultiSelect}
   */
  get MultiSelect () {
    return MultiSelect
  }

  /**
   * Component used to select entity refs
   * @returns {EntityRefSelect}
   */
  get EntityRefSelect () {
    return EntityRefSelect
  }

  constructor (store) {
    this.editor = editor
    this.store = store
    this.entities = entities
    this.settings = settings
    this.references = {}
    // extensions can add routes, not yet prototyped
    this.routes = []

    this.API = {}
    methods.forEach((m) => {
      this.API[m] = (...args) => {
        this.startProgress()
        return api[m](...args).then((v) => {
          this.stopProgress()
          return v
        }).catch((e) => {
          this.stopProgress()

          this.store.dispatch(this.entities.actions.apiFailed(e, args[2] === true))

          throw e
        })
      }
    })

    // webpack replaces all the babel runtime references in extensions with externals taking runtime from this field
    // this basically removes the duplicated babel runtime code from extensions and decrease its sizes
    this.runtime = babelRuntime

    // the same case as for babel runtime, we expose the following libraries and replace their references in extensions
    // using webpack externals
    this.libraries = {
      react: React,
      'react-dom': ReactDom,
      'react-list': ReactList,
      superagent: superagent,
      shortid: shortid,
      bluebird: bluebird,
      'filesaver.js-npm': fileSaver,
      'socket.io-client': io
    }
  }
}

let studio
export const createStudio = (store) => (studio = new Studio(store))

export default studio
