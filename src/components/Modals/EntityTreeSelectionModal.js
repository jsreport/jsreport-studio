import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { actions as entitiesActions, selectors as entitiesSelectors } from '../../redux/entities'
import EntityTreeButton from '../EntityTree/EntityTreeButton'
import EntityTree from '../EntityTree/EntityTree.js'
import api from '../../helpers/api.js'

class NewFolderInline extends Component {
  constructor (props) {
    super(props)
    this.setInputNameNode = this.setInputNameNode.bind(this)
  }

  componentDidUpdate (prevProps) {
    if (
      ((prevProps.editMode == null && this.props.editMode != null) ||
      (prevProps.editMode && this.props.editMode && prevProps.editMode.parentShortid !== this.props.editMode.parentShortid)) &&
      this.inputNameNode
    ) {
      setTimeout(() => this.inputNameNode.focus(), 0)
    }

    if (
      prevProps.editMode &&
      this.props.editMode &&
      prevProps.editMode.parentShortid !== this.props.editMode.parentShortid &&
      this.inputNameNode
    ) {
      this.inputNameNode.value = ''
    }
  }

  setInputNameNode (el) {
    this.inputNameNode = el
  }

  renderEditMode () {
    const { editMode, onSave, onCancel, getEntityByShortid, resolveEntityPath } = this.props
    let parentName

    if (editMode.parentShortid != null) {
      parentName = resolveEntityPath(getEntityByShortid(editMode.parentShortid))
    }

    return (
      <div>
        <div style={{ fontSize: '0.8rem', marginBottom: '5px' }}>
          Creating new folder <b>{editMode.parentShortid != null ? `inside folder ${parentName}` : 'in the root level'}</b>
        </div>
        <input
          ref={this.setInputNameNode}
          type='text'
          placeholder='folder name'
          defaultValue=''
          style={{ display: 'inline-block', width: '120px' }}
        />
        <div style={{ display: 'inline-block' }}>
          <button className='button confirmation' onClick={() => onSave(this.inputNameNode.value, editMode.parentShortid)}>
            Save
          </button>
          <button className='button confirmation' onClick={() => onCancel()}>Cancel</button>
        </div>
        {editMode.error != null && (
          <div style={{ color: 'red', marginTop: '3px' }}>
            Error when creating folder: {editMode.error}
          </div>
        )}
      </div>
    )
  }

  render () {
    const { editMode, onAdd } = this.props

    return (
      <div title='Add new folder' style={{ display: 'inline-block' }}>
        {!editMode ? (
          <EntityTreeButton onClick={onAdd}>
            <span style={{ display: 'inline-block' }}>
              <i className='fa fa-folder' />&nbsp;New folder
            </span>
          </EntityTreeButton>
        ) : (
          this.renderEditMode()
        )}
      </div>
    )
  }
}

class EntityTreeSelectionModal extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }

  constructor (props) {
    super(props)

    const initialSelected = props.options.selected != null ? (
      !Array.isArray(props.options.selected) ? [props.options.selected] : props.options.selected
    ) : []

    this.state = {
      newFolderEdit: null,
      selected: initialSelected.reduce((acu, shortid) => {
        const entity = props.getEntityByShortid(shortid, false)

        if (entity) {
          acu[entity._id] = true
        }

        return acu
      }, {})
    }

    this.createNewFolder = this.createNewFolder.bind(this)
    this.handleTreeNodeSelect = this.handleTreeNodeSelect.bind(this)
  }

  componentDidMount () {
    setTimeout(() => this.refs.cancel.focus(), 0)
  }

  handleTreeNodeSelect (references, childrenOrSingle, v) {
    const { multiple } = this.props.options
    let updates = {}

    if (multiple) {
      Object.assign(updates, this.state.selected)
    }

    if (Array.isArray(childrenOrSingle)) {
      const children = multiple ? childrenOrSingle : childrenOrSingle[0]

      children.forEach((_id) => {
        if (v === true) {
          updates[_id] = v
        } else {
          delete updates[_id]
        }
      })
    } else {
      if (v === true) {
        updates[childrenOrSingle._id] = v
      } else {
        delete updates[childrenOrSingle._id]
      }
    }

    this.setState({
      selected: updates
    })
  }

  filterEntities (references) {
    const { filter } = this.props.options

    if (!filter) {
      return references
    }

    let result = filter(references)

    result = result == null ? {} : result

    result = Object.keys(references).reduce((acu, k) => {
      if (acu[k] == null) {
        acu[k] = []
      }

      return acu
    }, result)

    return result
  }

  unselect () {
    this.setState({
      selected: {}
    })
  }

  async createNewFolder (folderName, parentShortid) {
    const entity = {
      name: folderName
    }

    if (parentShortid != null) {
      entity.folder = {
        shortid: parentShortid
      }
    }

    try {
      await api.post('/studio/validate-entity-name', {
        data: {
          name: entity.name,
          entitySet: 'folders',
          folderShortid: entity.folder != null ? entity.folder.shortid : null
        }
      })

      const response = await api.post('/odata/folders', {
        data: entity
      })

      response.__entitySet = 'folders'

      this.props.addExistingEntity(response)

      this.setState({
        newFolderEdit: null
      })
    } catch (e) {
      this.setState({
        newFolderEdit: {
          ...this.state.newFolderEdit,
          error: e.message
        }
      })
    }
  }

  save () {
    const selected = this.state.selected
    const values = []

    Object.keys(selected).forEach((_id) => {
      const entity = this.props.getEntityById(_id, false)

      if (!entity) {
        return
      }

      values.push(entity)
    })

    this.props.options.onSave(values)

    this.props.close()
  }

  cancel () {
    this.props.close()
  }

  render () {
    const {
      multiple,
      headingLabel,
      selectableFilter,
      allowNewFolder = false,
      treeStyle = {}
    } = this.props.options

    const { getEntityByShortid, resolveEntityPath } = this.props

    const { newFolderEdit } = this.state

    const entities = this.filterEntities(this.props.references)

    Object.keys(entities).forEach((k) => {
      Object.keys(entities[k]).forEach((e) => (entities[k][e] = Object.assign({}, entities[k][e], { __selected: this.state.selected[entities[k][e]._id] })))
    })

    return (
      <div>
        <div>
          <h1>
            <i className='fa fa-check-square-o' /> {headingLabel != null ? headingLabel : 'Select entity'}
          </h1>
        </div>
        {allowNewFolder && (
          <div>
            <NewFolderInline
              onAdd={() => this.setState({
                newFolderEdit: {}
              })}
              onSave={this.createNewFolder}
              onCancel={() => this.setState({ newFolderEdit: null })}
              editMode={newFolderEdit}
              getEntityByShortid={getEntityByShortid}
              resolveEntityPath={resolveEntityPath}
            />
          </div>
        )}
        {allowNewFolder && (
          <br />
        )}
        <div style={Object.assign({ height: '30rem', overflow: 'auto' }, treeStyle)}>
          <EntityTree
            entities={entities}
            selectable
            selectionMode={{
              mode: multiple ? 'multiple' : 'single',
              isSelectable: (isGroup, entity) => {
                if (selectableFilter) {
                  return Boolean(selectableFilter(isGroup, entity))
                }

                if (isGroup) {
                  return false
                }

                return true
              }
            }}
            getContextMenuItems={allowNewFolder ? ({ entity, isRoot }) => {
              if (isRoot) {
                return
              }

              return [{
                key: 'New Folder',
                title: 'New Folder',
                icon: 'fa-folder',
                onClick: () => this.setState({
                  newFolderEdit: { parentShortid: entity.shortid }
                })
              }]
            } : undefined}
            onNodeSelect={(es, v) => this.handleTreeNodeSelect(entities, es, v)}
            onSelect={(e) => this.handleTreeNodeSelect(entities, e, !e.__selected === true)}
          />
        </div>
        <div className='button-bar'>
          <button className='button confirmation' ref='cancel' onClick={() => this.cancel()}>Cancel</button>
          <button className='button confirmation' onClick={() => this.unselect()}>Unselect</button>
          <button className='button danger' onClick={() => this.save()}>Ok</button>
        </div>
      </div>
    )
  }
}

export default connect((state) => ({
  references: entitiesSelectors.getReferences(state),
  getEntityById: (_id, ...params) => entitiesSelectors.getById(state, _id, ...params),
  getEntityByShortid: (shortid, ...params) => entitiesSelectors.getByShortid(state, shortid, ...params),
  resolveEntityPath: (entity, ...params) => entitiesSelectors.resolveEntityPath(state, entity, ...params)
}), { addExistingEntity: entitiesActions.addExisting })(EntityTreeSelectionModal)
