import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { entitySets } from '../../lib/configuration.js'
import { actions, selectors } from '../../redux/entities'

class DeleteConfirmationModal extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }

  constructor (props) {
    super(props)

    this.cancelRef = React.createRef()
  }

  remove () {
    this.props.close()
    this.props.remove(this.props.entity._id, this.props.childrenIds)
  }

  cancel () {
    this.props.close()
  }

  componentDidMount () {
    setTimeout(() => this.cancelRef.current.focus(), 0)
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
          <button
            className='button danger'
            onClick={() => this.remove()}
          >
            Yes
          </button>
          <button
            ref={this.cancelRef}
            className='button confirmation'
            onClick={() => this.cancel()}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }
}

export default connect((state, props) => ({
  entity: selectors.getById(state, props.options._id, false),
  childrenIds: props.options.childrenIds
}), { ...actions })(DeleteConfirmationModal)
