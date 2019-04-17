import React, {Component} from 'react'
import { DragSource, DropTarget } from 'react-dnd'
import style from './EntityTree.scss'
import { checkIsGroupNode, checkIsGroupEntityNode, getNodeDOMId, getNodeTitleDOMId, getAllEntitiesInHierarchy } from './utils'
import ENTITY_NODE_DRAG_TYPE from './nodeDragType'
import { entitySets, entityTreeItemComponents, entityTreeIconResolvers } from '../../lib/configuration.js'

const nodeSource = {
  beginDrag (props, monitor, component) {
    const node = props.node

    return {
      entitySet: node.data.__entitySet,
      isGroupEntity: checkIsGroupEntityNode(node),
      isCollapsed: props.isCollapsed,
      node
    }
  }
}

const nodeTarget = {
  hover (props, monitor, component) {
    const { node } = props

    if (monitor.isOver({ shallow: true })) {
      if (props.onDragOver) {
        props.onDragOver({
          entitySet: node.data.__entitySet,
          isGroupEntity: checkIsGroupEntityNode(node),
          isCollapsed: props.isCollapsed,
          targetNode: node
        })
      }
    }
  }
}

function collectForSource (connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
  }
}

function collectForTarget (connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOverShallow: monitor.isOver({ shallow: true })
  }
}

class EntityTreeNode extends Component {
  constructor (props) {
    super(props)

    this.setNodeTitle = this.setNodeTitle.bind(this)
    this.getDOMId = this.getDOMId.bind(this)
    this.getTitleDOMId = this.getTitleDOMId.bind(this)
    this.getCoordinates = this.getCoordinates.bind(this)
    this.collapse = this.collapse.bind(this)

    this.draggingExpandTimeout = null
  }

  componentDidMount () {
    const { registerEntityNode, node } = this.props
    const isEntityNode = checkIsGroupNode(node) ? checkIsGroupEntityNode(node) : true

    if (!isEntityNode) {
      return
    }

    registerEntityNode(node.data._id, Object.assign({}, node, { objectId: this.props.id }))
  }

  componentWillReceiveProps (nextProps) {
    const props = this.props

    if (props.isOverShallow === false && nextProps.isOverShallow === true) {
      clearTimeout(this.draggingExpandTimeout)

      if (
        !checkIsGroupEntityNode(nextProps.node) ||
        !nextProps.isCollapsed
      ) {
        return
      }

      // expand the node is we have been over for a while
      this.draggingExpandTimeout = setTimeout(() => {
        if (
          !checkIsGroupEntityNode(nextProps.node) ||
          !nextProps.isCollapsed
        ) {
          return
        }

        this.collapse(nextProps.id)
      }, 900)
    } else if (props.isOverShallow === true && nextProps.isOverShallow === false) {
      clearTimeout(this.draggingExpandTimeout)
    }
  }

  componentDidUpdate (prevProps) {
    const { registerEntityNode, node } = this.props
    const { node: prevNode } = prevProps
    const wasEntityNode = checkIsGroupNode(prevNode) ? checkIsGroupEntityNode(prevNode) : true
    const isEntityNode = checkIsGroupNode(node) ? checkIsGroupEntityNode(node) : true

    if (prevNode.data == null || node.data == null || node.data._id !== prevNode.data._id) {
      if (wasEntityNode && prevNode.data != null) {
        registerEntityNode(prevNode.data._id, null)
      }

      if (isEntityNode && node.data != null) {
        registerEntityNode(node.data._id, Object.assign({}, node, { objectId: this.props.id }))
      }
    }

    if (node.data != null && prevNode.data != null && node.data._id === prevNode.data._id) {
      registerEntityNode(node.data._id, Object.assign({}, node, { objectId: this.props.id, items: node.items || [] }))
    }
  }

  componentWillUnmount () {
    const { registerEntityNode, node } = this.props
    const isEntityNode = checkIsGroupNode(node) ? checkIsGroupEntityNode(node) : true

    if (!isEntityNode) {
      return
    }

    registerEntityNode(node.data._id, null)
  }

  connectDragging (el) {
    const { node, selectable, draggable, connectDragSource, connectDragPreview } = this.props
    const isEntityNode = checkIsGroupNode(node) ? checkIsGroupEntityNode(node) : true

    if (selectable || !draggable || !isEntityNode) {
      return el
    }

    return connectDragSource(connectDragPreview(el, { captureDraggingState: true }))
  }

  connectDropping (el) {
    const { node, selectable, draggable, connectDropTarget } = this.props
    const isEntityNode = checkIsGroupNode(node) ? checkIsGroupEntityNode(node) : true

    if (selectable || !draggable || !isEntityNode) {
      return el
    }

    return connectDropTarget(el)
  }

  collapse (objectId) {
    const params = {
      objectId,
      ...this.props.node
    }

    this.props.collapseNode(params)
  }

  setNodeTitle (el) {
    this.nodeTitle = el
  }

  getDOMId (node) {
    if (checkIsGroupNode(node) && !checkIsGroupEntityNode(node)) {
      return undefined
    }

    return getNodeDOMId(node.data)
  }

  getTitleDOMId (node) {
    if (checkIsGroupNode(node) && !checkIsGroupEntityNode(node)) {
      return undefined
    }

    return getNodeTitleDOMId(node.data)
  }

  getCoordinates () {
    const dimensions = this.nodeTitle.getBoundingClientRect()

    return {
      x: dimensions.x != null ? dimensions.x : dimensions.left,
      y: (dimensions.y != null ? dimensions.y : dimensions.top) + dimensions.height
    }
  }

  resolveEntityTreeIconStyle (entity, info) {
    for (const k in entityTreeIconResolvers) {
      const mode = entityTreeIconResolvers[k](entity, info)
      if (mode) {
        return mode
      }
    }

    return null
  }

  renderEntityTreeItemComponents (position, propsToItem, originalChildren) {
    if (position === 'container') {
      // if there are no components registered, defaults to original children
      if (!entityTreeItemComponents[position].length) {
        return originalChildren
      }

      // composing components when position is container
      const wrappedItemElement = entityTreeItemComponents[position].reduce((prevElement, b) => {
        if (prevElement == null) {
          return React.createElement(b, propsToItem, originalChildren)
        }

        return React.createElement(b, propsToItem, prevElement)
      }, null)

      if (!wrappedItemElement) {
        return null
      }

      return wrappedItemElement
    }

    return entityTreeItemComponents[position].map((p, i) => (
      React.createElement(p, {
        key: i,
        ...propsToItem
      }))
    )
  }

  renderSelectControl (selectionMode, node) {
    const { selectable, onNodeSelect } = this.props
    const isGroup = checkIsGroupNode(node)

    if (!selectable) {
      return null
    }

    if (selectionMode.isSelectable && !selectionMode.isSelectable(isGroup, node.data)) {
      return null
    }

    if (isGroup) {
      return (
        <input
          key='select-group'
          style={{ marginRight: '5px' }}
          type={selectionMode.mode === 'single' ? 'radio' : 'checkbox'}
          checked={node.data == null || node.data.__selected === true}
          onChange={(v) => {
            const newValue = !!v.target.checked

            if (selectionMode.mode === 'single') {
              onNodeSelect({ _id: node.data._id }, newValue)
            } else {
              onNodeSelect(getAllEntitiesInHierarchy(node, true), newValue)
            }
          }
        }
        />
      )
    }

    return (
      <input
        key='select-entity'
        style={{ marginRight: '5px' }}
        type={selectionMode.mode === 'single' ? 'radio' : 'checkbox'}
        readOnly
        checked={node.data.__selected === true}
      />
    )
  }

  renderGroupNode () {
    const {
      node,
      depth,
      id,
      isActive,
      isCollapsed,
      isDragging,
      contextMenuActive,
      selectable,
      selectionMode,
      draggable,
      showContextMenu,
      paddingByLevel,
      renderTree,
      renderContextMenu,
      onNewClick
    } = this.props

    const name = node.name
    const items = node.items
    const groupStyle = node.data != null ? this.resolveEntityTreeIconStyle(node.data, { isCollapsed }) : null
    let groupIsEntity = checkIsGroupEntityNode(node)
    let currentSelectionMode = selectionMode != null ? selectionMode : 'multiple'

    if (typeof currentSelectionMode === 'string') {
      currentSelectionMode = { mode: currentSelectionMode }
    }

    return (
      <div id={this.getDOMId(node)}>
        <div
          className={`${style.link} ${contextMenuActive ? style.focused : ''} ${(isActive && !isDragging) ? style.active : ''} ${isDragging ? style.dragging : ''}`}
          onContextMenu={(e) => {
            if (!groupIsEntity) {
              e.preventDefault()
              e.stopPropagation()
            } else {
              showContextMenu(e, node.data)
            }
          }}
          onClick={(ev) => { if (!selectable) { ev.preventDefault(); ev.stopPropagation(); this.collapse(id) } }}
          style={{ paddingLeft: `${(depth + 1) * paddingByLevel}rem` }}
        >
          {this.renderSelectControl(currentSelectionMode, node)}
          <span
            ref={this.setNodeTitle}
            id={this.getTitleDOMId(node)}
            className={`${style.nodeTitle} ${isCollapsed ? style.collapsed : ''}`}
            onClick={(ev) => { if (selectable) { ev.preventDefault(); ev.stopPropagation(); this.collapse(id) } }}
          >
            {this.connectDragging(
              <div className={`${style.nodeBoxItemContent} ${isDragging ? style.dragging : ''}`}>
                {groupStyle && (
                  <i key='entity-icon' className={style.entityIcon + ' fa ' + (groupStyle || '')} />
                )}
                {name + (groupIsEntity && node.data.__isDirty ? '*' : '')}
              </div>
            )}
          </span>
          {this.renderEntityTreeItemComponents('groupRight', node.data, undefined)}
          {node.isEntitySet ? (
            !selectable ? (
              <a
                key={id + 'new'}
                onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onNewClick(name) }}
                className={style.add}
              />
            ) : null
          ) : null}
          {groupIsEntity ? renderContextMenu(
            node.data, { isGroupEntity: groupIsEntity, node, getCoordinates: this.getCoordinates }
          ) : null}
        </div>
        <div className={`${style.nodeContainer} ${isDragging ? style.dragging : ''} ${isCollapsed ? style.collapsed : ''}`}>
          {renderTree(items, depth + 1, id, draggable)}
        </div>
      </div>
    )
  }

  renderEntityNode () {
    const {
      node,
      depth,
      selectionMode,
      isActive,
      isDragging,
      contextMenuActive,
      originalEntities,
      paddingByLevel,
      renderContextMenu,
      getEntityTypeNameAttr,
      showContextMenu,
      onClick
    } = this.props

    const entity = node.data
    const entityStyle = this.resolveEntityTreeIconStyle(entity, {})
    let currentSelectionMode = selectionMode != null ? selectionMode : 'multiple'

    if (typeof currentSelectionMode === 'string') {
      currentSelectionMode = { mode: currentSelectionMode }
    }

    return (
      <div
        id={this.getDOMId(node)}
        onContextMenu={(e) => showContextMenu(e, entity)}
        onClick={() => onClick(entity)}
        key={entity._id}
        className={`${style.link} ${contextMenuActive ? style.focused : ''} ${(isActive && !isDragging) ? style.active : ''} ${isDragging ? style.dragging : ''}`}
        style={{ paddingLeft: `${(depth + 1) * paddingByLevel + 0.6}rem` }}
      >
        {this.renderEntityTreeItemComponents('container', { entity, entities: originalEntities }, [
          this.connectDragging(
            <div
              id={this.getTitleDOMId(node)}
              ref={this.setNodeTitle}
              key='container-entity'
              className={`${style.nodeBoxItemContent} ${isDragging ? style.dragging : ''}`}
            >
              {this.renderSelectControl(currentSelectionMode, node)}
              <i key='entity-icon' className={style.entityIcon + ' fa ' + (entityStyle || (entitySets[entity.__entitySet].faIcon || style.entityDefaultIcon))}></i>
              <a key='entity-name'>{getEntityTypeNameAttr(entity.__entitySet, entity) + (entity.__isDirty ? '*' : '')}</a>
              {this.renderEntityTreeItemComponents('right', { entity, entities: originalEntities })}
            </div>
          ),
          renderContextMenu(entity, {
            node,
            getCoordinates: this.getCoordinates
          })
        ])}
      </div>
    )
  }

  render () {
    const { node } = this.props
    const isGroupNode = checkIsGroupNode(node)

    return this.connectDropping(
      <div
        className={`${style.nodeBox} ${!isGroupNode ? style.nodeBoxItem : ''}`}
      >
        {isGroupNode ? (
          this.renderGroupNode()
        ) : (
          this.renderEntityNode()
        )}
      </div>
    )
  }
}

export default DragSource(
  ENTITY_NODE_DRAG_TYPE,
  nodeSource,
  collectForSource
)(DropTarget(
  ENTITY_NODE_DRAG_TYPE,
  nodeTarget,
  collectForTarget
)(EntityTreeNode))
