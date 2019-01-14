import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { selectors as entitiesSelectors } from '../../redux/entities'
import EntityTree from '../EntityTree/EntityTree.js'

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
      selected: initialSelected.reduce((acu, shortid) => {
        const entity = props.getEntityByShortid(shortid, false)

        if (entity) {
          acu[entity._id] = true
        }

        return acu
      }, {})
    }

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
    const { multiple, headingLabel, selectableFilter } = this.props.options
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
        <div style={{ height: '30rem', overflow: 'auto' }}>
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
  getEntityByShortid: (shortid, ...params) => entitiesSelectors.getByShortid(state, shortid, ...params)
}))(EntityTreeSelectionModal)
