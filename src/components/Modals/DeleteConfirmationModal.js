import React, {Component, PropTypes} from 'react'
import {connect} from 'react-redux'
import { entitySets } from '../../lib/configuration.js'
import { actions, selectors } from '../../redux/entities'

@connect((state, props) => ({
  entity: selectors.getById(state, props.options._id, false),
  childrenIds: props.options.childrenIds
}), { ...actions })
export default class DeleteConfirmationModal extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }

  remove () {
    this.props.close()
    this.props.remove(this.props.entity._id, this.props.childrenIds)
  }

  cancel () {
    this.props.close()
  }

  componentDidMount () {
    setTimeout(() => this.refs.cancel.focus(), 0)
  }

  render () {
    const { entity } = this.props

    if (!entity) {
      return null
    }

    let entityDisplay

    if (entity[entitySets[entity.__entitySet].nameAttribute] != null) {
      entityDisplay = entity[entitySets[entity.__entitySet].nameAttribute]
    } else {
      entityDisplay = `entity with _id: ${entity._id}`
    }

    return (
      <div>
        <div>
          Are you sure you want to delete&nbsp;<b>{entityDisplay}</b>&nbsp;({entitySets[entity.__entitySet].visibleName || entity.__entitySet})?
        </div>
        <div className='button-bar'>
          <button className='button danger' onClick={() => this.remove()}>Yes</button>
          <button className='button confirmation' ref='cancel' onClick={() => this.cancel()}>Cancel</button>
        </div>
      </div>
    )
  }
}
