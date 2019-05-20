export let version = null
export let engines = []
export let recipes = []
export const initializeListeners = []
export const readyListeners = []
export const previewListeners = []
export const textEditorInitializeListeners = []
export const textEditorCreatedListeners = []
export const entitySets = {}
export const templateEditorModeResolvers = []
export const entityTreeOrder = []
export const entityTreeWrapperComponents = []
export const entityTreeIconResolvers = []
export const entityTreeFilterItemResolvers = []
export const entityTreeContextMenuItemsResolvers = []
export const entityTreeToolbarComponents = {
  single: [],
  group: []
}
export const entityTreeItemComponents = {
  container: [],
  right: [],
  groupRight: []
}
export const propertiesComponents = []
export const editorComponents = []
export const toolbarComponents = {
  left: [],
  right: [],
  settings: [],
  settingsBottom: []
}
export const tabTitleComponents = []

export let toolbarVisibilityResolver = () => true

export const registerPreviewFrameChangeHandler = (fn) => { previewFrameChangeHandler = fn }
export let previewFrameChangeHandler = () => {}

export const registerPreviewHandler = (fn) => { previewHandler = fn }
export let previewHandler = () => {}

export const registerModalHandler = (fn) => { modalHandler = fn }
export let modalHandler = () => {}

export let concurrentUpdateModal = () => { return null }

export let aboutModal = () => { return null }

export const registerCollapseEntityHandler = (fn) => { collapseEntityHandler = fn }
export let collapseEntityHandler = () => {}

export const registerCollapseLeftHandler = (fn) => { collapseLeftHandler = fn }
export let collapseLeftHandler = () => {}

export const registerCollapsePreviewHandler = (fn) => { collapsePreviewHandler = fn }
export let collapsePreviewHandler = () => {}

export let shouldOpenStartupPage = true

export let apiHeaders = {}

export let _splitResizeHandlers = []
export const subscribeToSplitResize = (fn) => {
  _splitResizeHandlers.push(fn)
  return () => { _splitResizeHandlers = _splitResizeHandlers.filter((s) => s !== fn) }
}
export const triggerSplitResize = () => { _splitResizeHandlers.forEach((fn) => fn()) }

export let referencesLoader = null

export let removeHandler = null

export let locationResolver = null

export let extensions = []

export let apiSpecs = {}

export function rootPath () {
  let _rootPath = window.location.pathname.indexOf('/studio') === -1 ? window.location.pathname : window.location.pathname.substring(0, window.location.pathname.indexOf('/studio'))
  return _rootPath[_rootPath.length - 1] === '/' ? _rootPath.substring(0, _rootPath.length - 1) : _rootPath
}

export const sharedComponents = {

}
