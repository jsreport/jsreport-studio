import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { selectors } from '../../redux/entities'
import { actions } from '../../redux/editor'

class CloseConfirmationModal extends Component {
  constructor (props) {
    super(props)

    this.cancelRef = React.createRef()
  }

  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }

  remove () {
    this.props.close()
    this.props.closeTab(this.props.entity._id)
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
      return <div />
    }

    return (
      <div>
        <div>Are you sure you want to close {entity.name} and lose the changes ? </div>

        <div className='button-bar'>
          <button className='button danger' onClick={() => this.remove()}>Yes</button>
          <button className='button confirmation' ref={this.cancelRef} onClick={() => this.cancel()}>Cancel</button>
        </div>
      </div>
    )
  }
}

export default connect(
  (state, props) => ({ entity: selectors.getById(state, props.options._id, false) }),
  { ...actions }
)(CloseConfirmationModal)
