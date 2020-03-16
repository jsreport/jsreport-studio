export let version = null
export let engines = []
export let recipes = []
export const initializeListeners = []
export const readyListeners = []
export const previewListeners = []
export const textEditorInitializeListeners = []
export const textEditorCreatedListeners = []
export let _themeChangedListeners = []
export const entitySets = {}
export const templateEditorModeResolvers = []
export const entityTreeOrder = []
export const entityTreeWrapperComponents = []
export const entityTreeIconResolvers = []
export const entityTreeFilterItemResolvers = []
export const entityTreeDropResolvers = []
export const entityEditorComponentKeyResolvers = []
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

export const registerPreviewFrameChangeHandler = (fn) => {
  previewFrameChangeHandler = fn

  // dispose
  return () => {
    // only delete the handler when the current one is still the same fn
    if (previewFrameChangeHandler === fn) {
      previewFrameChangeHandler = () => {}
    }
  }
}

export let previewFrameChangeHandler = () => {}

export const registerPreviewHandler = (fn) => {
  previewHandler = fn

  // dispose
  return () => {
    // only delete the handler when the current one is still the same fn
    if (previewHandler === fn) {
      previewHandler = () => {}
    }
  }
}

export let previewHandler = () => {}

export const registerGetPreviewTargetHandler = (fn) => {
  getPreviewTargetHandler = fn

  return () => {
    if (getPreviewTargetHandler === fn) {
      getPreviewTargetHandler = () => {}
    }
  }
}

export let getPreviewTargetHandler = () => {}

export const registerPreviewConfigurationHandler = (fn) => {
  previewConfigurationHandler = fn

  return () => {
    if (previewConfigurationHandler === fn) {
      previewConfigurationHandler = () => {}
    }
  }
}

export let previewConfigurationHandler = () => {}

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

export const subscribeToThemeChange = (fn) => {
  _themeChangedListeners.push(fn)
  return () => { _themeChangedListeners = _themeChangedListeners.filter((s) => s !== fn) }
}

export const triggerThemeChange = (data) => { _themeChangedListeners.forEach((fn) => fn(data)) }

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
