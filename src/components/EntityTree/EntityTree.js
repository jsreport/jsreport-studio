import React, {Component} from 'react'
import ReactDOM from 'react-dom'
import ReactList from 'react-list'
import { connect } from 'react-redux'
import { DropTarget } from 'react-dnd'
import throttle from 'lodash/throttle'
import HighlightedArea from './HighlightedArea'
import EntityTreeNode from './EntityTreeNode'
import EntityTreeToolbarGroup from './EntityTreeToolbarGroup'
import HierarchyReplaceEntityModal from '../Modals/HierarchyReplaceEntityModal'
import style from './EntityTree.scss'
import ENTITY_NODE_DRAG_TYPE from './nodeDragType'
import {
  checkIsGroupNode,
  checkIsGroupEntityNode,
  getNodeDOMId,
  getNodeTitleDOMId,
  getAllEntitiesInHierarchy
} from './utils'
import getVisibleEntitySetsInTree from '../../helpers/getVisibleEntitySetsInTree'
import groupEntitiesByHierarchyHelper from '../../helpers/groupEntitiesByHierarchy'
import { actions as entitiesActions, selectors as entitiesSelectors } from '../../redux/entities'
import { actions as editorActions } from '../../redux/editor'
import {
  entitySets,
  entityTreeOrder,
  entityTreeToolbarComponents,
  entityTreeFilterItemResolvers,
  entityTreeContextMenuItemsResolvers,
  registerCollapseEntityHandler,
  modalHandler
} from '../../lib/configuration.js'

const paddingByLevelInTree = 0.8

function pointIsInsideContainer (containerDimensions, point) {
  const insideX = point.x >= containerDimensions.left && point.x <= (containerDimensions.left + containerDimensions.width)
  const insideY = point.y >= containerDimensions.top && point.y <= (containerDimensions.top + containerDimensions.height)

  return insideX && insideY
}

const entityTreeTarget = {
  hover (props, monitor, component) {
    if (!monitor.isOver()) {
      return
    }

    component.handleDragOver({
      clientOffset: monitor.getClientOffset(),
      sourceNode: monitor.getItem().node,
      isOverShallow: monitor.isOver({ shallow: true })
    })
  },
  drop (props, monitor, component) {
    const dragOverContext = component.dragOverContext
    const sourceEntitySet = monitor.getItem().entitySet
    const sourceNode = monitor.getItem().node
    const targetNode = dragOverContext ? dragOverContext.targetNode : undefined
    let sourceInfo
    let targetInfo

    if (sourceNode && dragOverContext && !dragOverContext.containerTargetEntity) {
      if (!dragOverContext.overRoot) {
        if (!component.isValidHierarchyTarget(sourceNode, targetNode)) {
          return
        }
      }

      // drop will be at the same root level, so we stop it
      if (sourceNode.data.folder == null) {
        return
      }

      sourceInfo = {
        id: sourceNode.data._id,
        entitySet: sourceEntitySet
      }

      targetInfo = {
        shortid: null
      }
    } else if (
      sourceNode &&
      dragOverContext &&
      dragOverContext.containerTargetEntity
    ) {
      if (!component.isValidHierarchyTarget(sourceNode, targetNode)) {
        return
      }

      // skip drop over same hierarchy
      if (
        (sourceNode.data.__entitySet === 'folders' &&
        sourceNode.data.shortid === dragOverContext.containerTargetEntity.shortid) ||
        (sourceNode.data.folder && sourceNode.data.folder.shortid === dragOverContext.containerTargetEntity.shortid)
      ) {
        return
      }

      component.dragOverContext = null
      component.clearHighlightedArea()

      sourceInfo = {
        id: sourceNode.data._id,
        entitySet: sourceEntitySet
      }

      targetInfo = {
        shortid: dragOverContext.containerTargetEntity.shortid,
        children: getAllEntitiesInHierarchy(component.entityNodesById[dragOverContext.containerTargetEntity._id])
      }
    }

    if (sourceInfo && targetInfo) {
      component.dragOverContext = null
      component.clearHighlightedArea()

      component.copyOrMoveEntity(sourceInfo, targetInfo)
    }
  }
}

function collect (connect, monitor) {
  return {
    dragType: monitor.getItemType(),
    draggedNode: monitor.getItem(),
    connectDropTarget: connect.dropTarget(),
    isDraggingOver: monitor.isOver(),
    canDrop: monitor.canDrop()
  }
}

class ContextMenuContainer extends Component {
  // NOTE: since we are on React 15 we use the unstable_renderSubtreeIntoContainer,
  // when we migrate to React 16 we need to update to createPortal api
  componentDidMount () {
    this.node = document.createElement('div')
    this.node.dataset.contextMenuNode = true

    document.body.appendChild(this.node)

    this.renderPortal()
  }

  componentDidUpdate () {
    this.renderPortal()
  }

  componentWillUnmount () {
    ReactDOM.unmountComponentAtNode(this.node)
    document.body.removeChild(this.node)
  }

  renderPortal () {
    ReactDOM.unstable_renderSubtreeIntoContainer(
      this,
      this.props.children,
      this.node
    )
  }

  render () {
    return null
  }
}

class EntityTree extends Component {
  static propTypes = {
    entities: React.PropTypes.object.isRequired,
    activeEntity: React.PropTypes.object,
    // specifies if the tree should render a toolbar in his header
    toolbar: React.PropTypes.bool,
    // specifies that the tree is in selectable mode,
    // in this mode, filtering is disabled, all items (incluiding in subtrees)
    // have a checkbox for single or multiple selection and contextmenu actions are disabled
    selectable: React.PropTypes.bool,
    // tree accepts a render callback (function as child) to allow extensions to
    // control how entity items are rendered
    children: React.PropTypes.func
    // onClick: React.PropTypes.func.isRequired,
    // onRemove: React.PropTypes.func.isRequired,
    // onRename: React.PropTypes.func.isRequired,
    // onNewClick: React.PropTypes.func.isRequired
  }

  constructor (props) {
    super(props)

    this.state = {
      filter: {},
      contextMenuId: null,
      pointCoordinates: null,
      clipboard: null,
      highlightedArea: null
    }

    this.dragOverContext = null
    this.entityNodesById = {}

    this.setListContainerNode = this.setListContainerNode.bind(this)
    this.setListNode = this.setListNode.bind(this)
    this.setContextMenuNode = this.setContextMenuNode.bind(this)
    this.setFilter = this.setFilter.bind(this)
    this.setClipboard = this.setClipboard.bind(this)
    this.isNodeCollapsed = this.isNodeCollapsed.bind(this)
    this.isValidHierarchyTarget = this.isValidHierarchyTarget.bind(this)
    this.showHighlightedArea = this.showHighlightedArea.bind(this)
    this.clearHighlightedArea = this.clearHighlightedArea.bind(this)
    this.copyOrMoveEntity = this.copyOrMoveEntity.bind(this)
    this.releaseClipboardTo = this.releaseClipboardTo.bind(this)
    this.getNodeId = this.getNodeId.bind(this)
    this.getSetsToRender = this.getSetsToRender.bind(this)
    this.getEntityTypeNameAttr = this.getEntityTypeNameAttr.bind(this)
    this.tryHide = this.tryHide.bind(this)
    this.registerEntityNode = this.registerEntityNode.bind(this)
    this.contextMenu = this.contextMenu.bind(this)
    this.collapseHandler = this.collapseHandler.bind(this)
    this.toogleCollapse = this.toogleCollapse.bind(this)
    this.getEntityTreeListContainerDimensions = this.getEntityTreeListContainerDimensions.bind(this)
    this.groupEntitiesByType = this.groupEntitiesByType.bind(this)
    this.handleGlobalClick = this.handleGlobalClick.bind(this)
    this.handleNewClick = this.handleNewClick.bind(this)
    this.handleNodeClick = this.handleNodeClick.bind(this)

    // it is important to throttle the launching of the event to avoid having a
    // bad experience while dragging
    this.handleDragOver = throttle(
      this.handleDragOver.bind(this),
      100,
      { leading: true, trailing: false }
    )

    this.handleNodeDragOver = this.handleNodeDragOver.bind(this)
    this.renderRootContextMenu = this.renderRootContextMenu.bind(this)
    this.renderNodeContextMenu = this.renderNodeContextMenu.bind(this)
    this.renderContextMenu = this.renderContextMenu.bind(this)
    this.renderTree = this.renderTree.bind(this)
  }

  componentDidMount () {
    window.addEventListener('click', this.handleGlobalClick, true)

    if (this.props.main === true) {
      registerCollapseEntityHandler(this.collapseHandler)
    }
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.draggedNode && !nextProps.draggedNode) {
      this.dragOverContext = null
      this.clearHighlightedArea()
    } else if (
      this.props.isDraggingOver &&
      !nextProps.isDraggingOver &&
      // ensure that we don't process this part when dropping
      // (when dropping, canDrop changes to false)
      this.props.canDrop === true && nextProps.canDrop === true
    ) {
      this.dragOverContext = null
      this.clearHighlightedArea()
    }
  }

  componentWillUnmount () {
    window.removeEventListener('click', this.handleGlobalClick, true)
    this.entityNodesById = {}
  }

  connectDropping (el) {
    const { selectable, connectDropTarget } = this.props

    if (selectable) {
      return el
    }

    return connectDropTarget(el)
  }

  createListItemRenderer (items, depth, parentId, treeIsDraggable) {
    return (index, key) => this.renderItemNode(items[index], depth, parentId, treeIsDraggable)
  }

  tryHide () {
    if (this.state.contextMenuId) {
      this.setState({ contextMenuId: null, pointCoordinates: null })
    }
  }

  contextMenu (e, entity) {
    e.preventDefault()
    e.stopPropagation()

    // prevents handling context menu clicks when the menu is shown
    if (this.contextMenuNode && this.contextMenuNode.contains(e.target)) {
      return
    }

    if (entity) {
      this.setState({ contextMenuId: entity._id, pointCoordinates: null })
    } else {
      this.setState({ contextMenuId: '__ROOT__', pointCoordinates: { x: e.clientX, y: e.clientY } })
    }
  }

  collapseHandler (idOrShortid, state, options = {}) {
    const { parents, self = true } = options
    const toCollapse = []
    let entity

    if (idOrShortid._id) {
      entity = this.props.getEntityById(idOrShortid._id, false)
    } else if (idOrShortid.shortid) {
      entity = this.props.getEntityByShortid(idOrShortid.shortid, false)
    }

    if (!entity) {
      return
    }

    if (entity.__entitySet === 'folders' && self === true) {
      toCollapse.push(entity)
    }

    if (parents === true) {
      let currentEntity = entity

      while (currentEntity != null) {
        if (currentEntity.folder != null) {
          currentEntity = this.props.getEntityByShortid(currentEntity.folder.shortid, false)

          if (currentEntity != null) {
            toCollapse.unshift(currentEntity)
          }
        } else {
          currentEntity = null
        }
      }
    }

    const ids = []

    toCollapse.forEach((folder, idx) => {
      ids.push(this.getNodeId(folder.name, folder, idx === 0 ? null : ids[idx - 1], idx))
    })

    this.toogleCollapse(ids.map((id) => ({ objectId: id })), state)
  }

  toogleCollapse (node, forceState) {
    const nodesToProcess = Array.isArray(node) ? node : [node]
    let newState

    if (nodesToProcess.length === 0) {
      return
    }

    newState = nodesToProcess.reduce((acu, nodeObj) => {
      let newCollapseState

      if (forceState != null) {
        newCollapseState = forceState === true
      } else {
        newCollapseState = !this.isNodeCollapsed(nodeObj)
      }

      acu[nodeObj.objectId] = newCollapseState

      return acu
    }, {})

    this.setState(newState)
  }

  filterEntities (entities) {
    const filterInfo = this.state.filter
    let result = {}

    const allFiltersAreEmpty = Object.keys(filterInfo).every((filterKey) => {
      const filterValue = filterInfo[filterKey]

      if (Array.isArray(filterValue)) {
        return filterValue.length === 0
      }

      return (filterValue === '' || filterValue == null)
    })

    if (allFiltersAreEmpty) {
      return entities
    }

    Object.keys(entities).forEach((k) => {
      result[k] = entities[k].filter((entity) => {
        return entityTreeFilterItemResolvers.every((filterResolver) => {
          const filterResult = filterResolver(entity, entitySets, filterInfo)

          if (typeof filterResult !== 'boolean') {
            throw new Error('filterItemResolver must return boolean values, invalid return found in resolvers')
          }

          return filterResult
        })
      })
    })

    return result
  }

  setListContainerNode (el) {
    this.listContainerNode = el
  }

  setListNode (el) {
    this.listNode = el
  }

  setContextMenuNode (el) {
    this.contextMenuNode = el
  }

  registerEntityNode (id, node) {
    if (id == null || node === undefined) {
      return
    }

    if (node === null) {
      delete this.entityNodesById[id]
    } else {
      this.entityNodesById[id] = node
    }
  }

  setFilter (newFilterState) {
    this.setState((prevState) => {
      return {
        filter: {
          ...prevState.filter,
          ...newFilterState
        }
      }
    })
  }

  setClipboard ({ action, entityId, entitySet }) {
    this.setState({
      clipboard: {
        action,
        entityId,
        entitySet
      }
    })
  }

  isNodeCollapsed (nodeObject) {
    if (checkIsGroupNode(nodeObject) && !checkIsGroupEntityNode(nodeObject)) {
      return this.state[nodeObject.objectId] == null ? false : this.state[nodeObject.objectId] === true
    }

    return this.state[nodeObject.objectId] == null ? true : this.state[nodeObject.objectId] === true
  }

  isValidHierarchyTarget (sourceNode, targetNode) {
    const { getEntityByShortid } = this.props
    const containersInHierarchyForTarget = []
    let containerSourceEntity
    let containerTargetEntity

    if (sourceNode.data.__entitySet === 'folders') {
      containerSourceEntity = getEntityByShortid(sourceNode.data.shortid)
    } else {
      return true
    }

    if (targetNode.data.__entitySet === 'folders') {
      containerTargetEntity = getEntityByShortid(targetNode.data.shortid)
    } else {
      if (targetNode.data.folder == null) {
        return true
      }

      containerTargetEntity = getEntityByShortid(targetNode.data.folder.shortid)
    }

    let currentContainer = containerTargetEntity

    if (containerSourceEntity.shortid === containerTargetEntity.shortid) {
      return false
    }

    containersInHierarchyForTarget.push(containerTargetEntity.shortid)

    while (
      currentContainer.shortid !== containerSourceEntity.shortid &&
      currentContainer.folder != null
    ) {
      const parentContainer = getEntityByShortid(currentContainer.folder.shortid)
      containersInHierarchyForTarget.push(parentContainer.shortid)
      currentContainer = parentContainer
    }

    if (
      containersInHierarchyForTarget.indexOf(containerSourceEntity.shortid) !== -1
    ) {
      return false
    }

    return true
  }

  showHighlightedArea (sourceEntityNode, targetEntityNode) {
    const { getEntityByShortid } = this.props
    const highlightedArea = {}
    let containerTargetInContext

    if (
      !targetEntityNode ||
      // support highlight root hierarchy when over entities at root
      (targetEntityNode.data.__entitySet !== 'folders' &&
      targetEntityNode.data.folder == null)
    ) {
      const hierarchyEntityDimensions = this.listNode.getBoundingClientRect()

      highlightedArea.hierarchy = {
        top: hierarchyEntityDimensions.top - 2,
        left: hierarchyEntityDimensions.left + 6,
        width: `${paddingByLevelInTree}rem`,
        height: hierarchyEntityDimensions.height + 4
      }

      if (this.dragOverContext) {
        this.dragOverContext.overRoot = true
      }
    } else if (targetEntityNode.data.folder != null || targetEntityNode.data.__entitySet === 'folders') {
      let hierarchyEntity

      if (this.dragOverContext) {
        this.dragOverContext.overRoot = false
      }

      if (targetEntityNode.data.__entitySet === 'folders') {
        hierarchyEntity = getEntityByShortid(targetEntityNode.data.shortid)
        containerTargetInContext = hierarchyEntity
      } else {
        hierarchyEntity = getEntityByShortid(targetEntityNode.data.folder.shortid)
        containerTargetInContext = hierarchyEntity
      }

      if (sourceEntityNode.data.__entitySet === 'folders') {
        if (!this.isValidHierarchyTarget(sourceEntityNode, targetEntityNode)) {
          return this.clearHighlightedArea()
        }
      }

      const hierarchyEntityNodeId = getNodeDOMId(hierarchyEntity)
      const hierarchyEntityTitleNodeId = getNodeTitleDOMId(hierarchyEntity)

      if (!hierarchyEntityNodeId || !hierarchyEntityTitleNodeId) {
        return
      }

      const hierarchyEntityDOMNode = document.getElementById(hierarchyEntityNodeId)
      const hierarchyEntityTitleDOMNode = document.getElementById(hierarchyEntityTitleNodeId)

      if (!hierarchyEntityDOMNode || !hierarchyEntityTitleDOMNode) {
        return
      }

      const hierachyEntityTitleDimensions = hierarchyEntityTitleDOMNode.getBoundingClientRect()

      highlightedArea.label = {
        top: hierachyEntityTitleDimensions.top,
        left: hierachyEntityTitleDimensions.left,
        width: hierachyEntityTitleDimensions.width,
        height: hierachyEntityTitleDimensions.height
      }

      let containerTargetIsCollapsed = false
      let containerTargetHasEntities = false

      if (containerTargetInContext && this.entityNodesById[containerTargetInContext._id]) {
        const nodeObj = this.entityNodesById[containerTargetInContext._id]

        if (getAllEntitiesInHierarchy(nodeObj, false, true).length > 0) {
          containerTargetHasEntities = true
        }

        if (this.isNodeCollapsed(nodeObj)) {
          containerTargetIsCollapsed = true
        }
      }

      if (containerTargetInContext && (containerTargetIsCollapsed || !containerTargetHasEntities)) {
        highlightedArea.hierarchy = null
      } else {
        const hierarchyEntityDimensions = hierarchyEntityDOMNode.getBoundingClientRect()

        highlightedArea.hierarchy = {
          top: hierachyEntityTitleDimensions.top + (hierachyEntityTitleDimensions.height + 4),
          left: hierachyEntityTitleDimensions.left,
          width: `${paddingByLevelInTree}rem`,
          height: hierarchyEntityDimensions.height - (hierachyEntityTitleDimensions.height + 4)
        }
      }
    }

    if (Object.keys(highlightedArea).length > 0) {
      if (this.dragOverContext) {
        this.dragOverContext.containerTargetEntity = containerTargetInContext
      }

      this.setState({
        highlightedArea
      })
    }
  }

  clearHighlightedArea () {
    this.setState({
      highlightedArea: null
    })
  }

  copyOrMoveEntity (sourceInfo, targetInfo, shouldCopy = false) {
    const { hierarchyMove } = this.props

    hierarchyMove(sourceInfo, targetInfo, shouldCopy, false, true).then((result) => {
      if (targetInfo.shortid != null) {
        const targetEntity = this.props.getEntityByShortid(targetInfo.shortid)

        this.toogleCollapse(this.entityNodesById[targetEntity._id], false)
      }

      if (!result || result.duplicatedEntity !== true) {
        return
      }

      modalHandler.open(HierarchyReplaceEntityModal, {
        sourceId: sourceInfo.id,
        targetShortId: targetInfo.shortid,
        targetChildren: targetInfo.children,
        existingEntity: result.existingEntity,
        existingEntityEntitySet: result.existingEntityEntitySet,
        shouldCopy
      })
    })
  }

  releaseClipboardTo (destination) {
    const clipboard = this.state.clipboard

    if (clipboard == null) {
      return
    }

    this.copyOrMoveEntity({
      id: clipboard.entityId,
      entitySet: clipboard.entitySet
    }, {
      shortid: destination.shortid,
      children: destination.children
    }, clipboard.action === 'copy')

    this.setState({
      clipboard: null
    })
  }

  getNodeId (name, entity, parentId, depth) {
    let id

    if (parentId != null) {
      id = `${parentId}--${name}`
    } else {
      id = name
    }

    if (entity) {
      id = `${id}-${entity.shortid}`
    }

    if (depth <= 0) {
      depth = 0
    }

    if (!entity) {
      id += '--group'
    } else {
      id += `--${entity.__entitySet}`
    }

    id += `--${depth}`

    return id
  }

  getEntityTreeListContainerDimensions () {
    const dimensions = this.listContainerNode.getBoundingClientRect()
    const relativeTop = dimensions.top - this.listContainerNode.scrollTop
    const relativeBottom = dimensions.bottom + this.listContainerNode.scrollTop
    const relativeLeft = dimensions.left - this.listContainerNode.scrollLeft
    const relativeRight = dimensions.right + this.listContainerNode.scrollLeft

    return {
      ...dimensions,
      top: relativeTop,
      left: relativeLeft,
      y: relativeTop,
      x: relativeLeft,
      bottom: relativeBottom,
      right: relativeRight
    }
  }

  getSetsToRender (sets) {
    const setsNames = getVisibleEntitySetsInTree(sets).map((s) => s.name)

    let setsInOrderSpecification = []

    const setsNotInOrderSpecification = setsNames.filter((setName) => {
      const indexInOrder = entityTreeOrder.indexOf(setName)
      const found = indexInOrder !== -1

      if (found) {
        // make sure to only add set names present in sets
        setsInOrderSpecification.push({
          idx: indexInOrder,
          name: setName
        })
      }

      return !found
    })

    setsInOrderSpecification = setsInOrderSpecification.sort((a, b) => {
      if (a.idx > b.idx) {
        return 1
      }

      if (a.idx < b.idx) {
        return -1
      }

      return 0
    }).map((setInfo) => setInfo.name)

    return [...setsInOrderSpecification, ...setsNotInOrderSpecification]
  }

  getEntityTypeNameAttr (setName, entity, returnNameAttr = false) {
    if (returnNameAttr) {
      return entitySets[setName].nameAttribute
    }

    return entity[entitySets[setName].nameAttribute]
  }

  groupEntitiesByType (sets, entitiesByType) {
    const setsToRender = this.getSetsToRender(sets)

    return setsToRender.map((entitiesType) => ({
      name: entitiesType,
      isEntitySet: true,
      items: entitiesByType[entitiesType].map((entity) => ({
        name: this.getEntityTypeNameAttr(entity.__entitySet, entity),
        data: entity
      }))
    }))
  }

  groupEntitiesByHierarchy (sets, entitiesByType) {
    return groupEntitiesByHierarchyHelper(Object.keys(sets), entitiesByType, this.getEntityTypeNameAttr)
  }

  handleGlobalClick (ev) {
    const LEFT_CLICK = 1
    const button = ev.which || ev.button

    if (!this.state.contextMenuId || !this.contextMenuNode) {
      return
    }

    if (ev.target.type === 'file') {
      return
    }

    ev.preventDefault()

    if (!this.contextMenuNode.contains(ev.target)) {
      ev.stopPropagation()

      // handle quirk in firefox that fires and additional click event during
      // contextmenu event, this code prevents the context menu to
      // inmediatly be closed after being shown in firefox
      if (button === LEFT_CLICK) {
        this.tryHide()
      }
    }
  }

  handleNewClick (nodeId, ...params) {
    const objectNode = this.entityNodesById[nodeId]

    if (objectNode && objectNode.isEntitySet !== true) {
      // always expand the node on new entity creation
      this.toogleCollapse(objectNode, false)
    }

    this.props.onNewClick(...params)
  }

  handleNodeClick (entity) {
    const { selectable, onSelect, onClick } = this.props

    if (selectable) {
      onSelect(entity)
    } else {
      onClick(entity._id)
    }

    this.tryHide()
  }

  handleDragOver ({ clientOffset, sourceNode, isOverShallow }) {
    const listNodeDimensions = this.listNode.getBoundingClientRect()
    const isInsideContainer = pointIsInsideContainer(listNodeDimensions, clientOffset)

    if (
      isOverShallow &&
      !isInsideContainer
    ) {
      if (clientOffset.y < listNodeDimensions.top) {
        this.dragOverContext = null
        return this.clearHighlightedArea()
      } else {
        return this.showHighlightedArea(sourceNode)
      }
    }

    const { targetNode } = this.dragOverContext || {}

    if (!targetNode) {
      return
    }

    this.showHighlightedArea(sourceNode, targetNode)
  }

  handleNodeDragOver (dragOverContext) {
    if (!this.props.isDraggingOver || !dragOverContext) {
      return
    }

    if (
      this.dragOverContext != null &&
      this.dragOverContext.targetNode.data._id === dragOverContext.targetNode.data._id
    ) {
      this.dragOverContext = Object.assign(this.dragOverContext, dragOverContext)
    } else {
      this.dragOverContext = dragOverContext
    }
  }

  renderRootContextMenu () {
    const { contextMenuId, pointCoordinates } = this.state
    const { selectable, getContextMenuItems } = this.props

    if ((selectable && getContextMenuItems == null) || contextMenuId !== '__ROOT__') {
      return null
    }

    return this.renderContextMenu(undefined, { getCoordinates: () => pointCoordinates })
  }

  renderNodeContextMenu (entity, info = {}) {
    const { contextMenuId } = this.state
    const { selectable, getContextMenuItems } = this.props

    if ((selectable && getContextMenuItems == null) || contextMenuId !== entity._id) {
      return null
    }

    return this.renderContextMenu(entity, info)
  }

  renderContextMenu (childEntity, { isGroupEntity, node, getCoordinates } = {}) {
    const { clipboard } = this.state
    const { getContextMenuItems, onRemove, onClone, onRename } = this.props
    const tryHide = this.tryHide
    const isRoot = childEntity == null
    const isGroup = isRoot ? false : checkIsGroupNode(node) && !checkIsGroupEntityNode(node)
    const containerStyle = {}

    let menuItems = []

    const resolverParam = {
      node,
      clipboard,
      entity: childEntity,
      entitySets,
      isRoot,
      isGroup,
      isGroupEntity,
      disabledClassName: style.disabled,
      getVisibleEntitySetsInTree,
      getAllEntitiesInHierarchy,
      setClipboard: this.setClipboard,
      releaseClipboardTo: this.releaseClipboardTo,
      onNewClick: this.handleNewClick,
      onNodeClick: this.handleNodeClick,
      onRename,
      onClone,
      onRemove
    }

    if (getContextMenuItems != null) {
      menuItems = getContextMenuItems(Object.assign({}, resolverParam, {
        isGroupEntity: isGroupEntity != null ? isGroupEntity : false
      }))
    } else {
      const contextMenuResults = entityTreeContextMenuItemsResolvers.map((resolver) => {
        return resolver(resolverParam)
      })

      const groupItems = []
      const singleItems = []

      contextMenuResults.forEach((r) => {
        if (r == null) {
          return
        }

        if (r.items == null || !Array.isArray(r.items)) {
          return
        }

        if (r.grouped === true && r.items.length > 0) {
          groupItems.push(r)
        } else if (r.items.length > 0) {
          singleItems.push(r)
        }
      })

      groupItems.forEach((group, idx) => {
        if (menuItems.length > 0) {
          menuItems.push({
            key: `separator-group${idx}`,
            separator: true
          })
        }

        group.items.forEach((item) => menuItems.push(item))
      })

      if (menuItems.length > 0 && singleItems.length > 0) {
        menuItems.push({
          key: 'separator-last-group',
          separator: true
        })
      }

      singleItems.forEach((info) => {
        info.items.forEach((item) => menuItems.push(item))
      })
    }

    if (menuItems == null || menuItems.length === 0) {
      return null
    }

    const pointCoordinates = getCoordinates()

    containerStyle.top = pointCoordinates.y + 2
    containerStyle.left = pointCoordinates.x

    return (
      <ContextMenuContainer key={isRoot ? '--ROOT--' : ` item-${node.name}`}>
        <div key='entity-contextmenu' ref={this.setContextMenuNode} className={style.contextMenuContainer} style={containerStyle}>
          <div className={style.contextMenu}>
            {menuItems.map(function processItem (item) {
              if (item.separator) {
                return (
                  <hr key={item.key} />
                )
              }

              return (
                <div
                  key={item.key}
                  className={`${style.contextButton} ${item.className != null ? item.className : ''} ${item.items != null && item.items.length > 0 ? style.hasNestedLevels : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()

                    if (item.onClick != null) {
                      const result = item.onClick()

                      if (result === false) {
                        return
                      }
                    }

                    tryHide()
                  }}
                >
                  <i className={`fa ${item.icon}`} />{item.title}
                  {item.items != null && item.items.length > 0 && (
                    <div key='entity-contextmenu' className={`${style.contextMenuContainer} ${style.nestedLevel}`}>
                      <div className={style.contextMenu}>
                        {item.items.map(processItem)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </ContextMenuContainer>
    )
  }

  renderEntityTreeToolbarComponents (singleComponents, groupComponents) {
    const commonProps = {
      setFilter: this.setFilter,
      onNewEntity: this.props.onNewClick
    }

    const toolbarElements = singleComponents.map((p, i) => {
      return React.createElement(p, {
        key: `EntityToolbar${i}`,
        ...commonProps
      })
    })

    if (groupComponents.length > 0) {
      toolbarElements.push(
        <EntityTreeToolbarGroup
          key={`EntityToolbar${toolbarElements.length}`}
          {...commonProps}
        />
      )
    }

    return toolbarElements
  }

  renderItemNode (node = {}, depth, parentId, treeIsDraggable) {
    const { entities, selectable, selectionMode, activeEntity, onNewClick, onNodeSelect } = this.props
    const name = node.name
    let treeDepth = depth || 0
    const isOnlyGroupNode = checkIsGroupNode(node) && !checkIsGroupEntityNode(node)
    const objectId = this.getNodeId(name, isOnlyGroupNode ? null : node.data, parentId, treeDepth)
    let isDraggable

    if (treeIsDraggable != null) {
      isDraggable = treeIsDraggable
    } else {
      if (checkIsGroupNode(node)) {
        isDraggable = false

        if (checkIsGroupEntityNode(node)) {
          isDraggable = true
        }
      } else {
        isDraggable = true
      }
    }

    let isActiveNode = false

    if (
      activeEntity != null &&
      (checkIsGroupEntityNode(node) || !checkIsGroupNode(node)) &&
      node.data != null && node.data._id === activeEntity._id
    ) {
      isActiveNode = true
    }

    return (
      <EntityTreeNode
        key={objectId}
        id={objectId}
        node={node}
        depth={treeDepth}
        isCollapsed={this.isNodeCollapsed(Object.assign({}, node, { objectId }))}
        isActive={isActiveNode}
        selectable={selectable}
        selectionMode={selectionMode}
        draggable={isDraggable}
        originalEntities={entities}
        paddingByLevel={paddingByLevelInTree}
        getEntityTypeNameAttr={this.getEntityTypeNameAttr}
        registerEntityNode={this.registerEntityNode}
        showContextMenu={this.contextMenu}
        contextMenuActive={node.data != null && this.state.contextMenuId === node.data._id}
        collapseNode={this.toogleCollapse}
        renderTree={this.renderTree}
        renderContextMenu={this.renderNodeContextMenu}
        onClick={this.handleNodeClick}
        onNewClick={onNewClick}
        onNodeSelect={onNodeSelect}
        onDragOver={this.handleNodeDragOver}
      />
    )
  }

  renderTree (items, depth, parentId, treeIsDraggable) {
    return (
      <ReactList
        itemRenderer={this.createListItemRenderer(items, depth, parentId, treeIsDraggable)}
        length={items.length}
      />
    )
  }

  render () {
    const { highlightedArea } = this.state
    const entities = this.filterEntities(this.props.entities)
    const children = this.props.children

    const renderDefaultTree = () => (
      <div ref={this.setListNode}>
        {this.renderTree(this.groupEntitiesByHierarchy(entitySets, entities))}
      </div>
    )

    return this.connectDropping(
      <div className={style.treeListContainer} onContextMenu={(e) => this.contextMenu(e, null)}>
        {
          this.props.toolbar &&
          (entityTreeToolbarComponents.single.length > 0 || entityTreeToolbarComponents.group.length > 0) &&
          (
            <div className={style.toolbar}>
              {this.renderEntityTreeToolbarComponents(entityTreeToolbarComponents.single, entityTreeToolbarComponents.group)}
            </div>
          )
        }
        <div ref={this.setListContainerNode} className={style.nodesBox}>
          {/*
            When a render callback (function as child) is passed it means that an extension
            wants to control how entity tree is rendered and we should pass all useful
            information to the callback
          */}
          {
            typeof children === 'function' ? children({
              // we render the root tree with a wraper div to be able to
              // calculate some things for the drag and drop interactions
              renderDefaultTree,
              renderTree: (...args) => <div ref={this.setListNode}>{this.renderTree(...args)}</div>,
              getSetsToRender: this.getSetsToRender,
              getEntityTypeNameAttr: this.getEntityTypeNameAttr,
              groupEntitiesByType: this.groupEntitiesByType,
              groupEntitiesByHierarchy: this.groupEntitiesByHierarchy,
              entitySets,
              entities
            }) : (
              renderDefaultTree()
            )
          }
          <HighlightedArea
            highlightedArea={highlightedArea}
            getContainerDimensions={this.getEntityTreeListContainerDimensions}
          />
        </div>
        {this.renderRootContextMenu()}
      </div>
    )
  }
}

export default connect(
  (state) => ({
    getEntityById: (id, ...params) => entitiesSelectors.getById(state, id, ...params),
    getEntityByShortid: (shortid, ...params) => entitiesSelectors.getByShortid(state, shortid, ...params)
  }),
  { ...editorActions, ...entitiesActions }
)(DropTarget(ENTITY_NODE_DRAG_TYPE, entityTreeTarget, collect)(EntityTree))
