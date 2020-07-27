import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { actions } from '../../redux/editor'

@connect(undefined, { ...actions }, (stateProps, dispatchProps, ownProps) => ({
  ...ownProps,
  ...stateProps,
  ...dispatchProps,
  close: (ok) => {
    ownProps.options.onResponse(ok)
    ownProps.close && ownProps.close()
  }
}))
export default class RestoreDockConfirmationModal extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }

  dock () {
    this.props.close(true)
    this.props.desactivateUndockMode()
  }

  cancel () {
    this.props.close(false)
  }

  onResponse (ok) {
    if (ok) {
      this.dock()
      return
    }

    this.cancel()
  }

  componentDidMount () {
    setTimeout(() => this.refs.cancel.focus(), 0)
  }

  render () {
    return <div>
      <div>
        This action will close all preview tabs and will redirect rendering output back to pane.
        Do you want to continue?
      </div>

      <div className='button-bar'>
        <button className='button danger' onClick={() => this.onResponse(true)}>Yes</button>
        <button className='button confirmation' ref='cancel' onClick={() => this.onResponse(false)}>Cancel</button>
      </div>
    </div>
  }
}
