import React, { Component } from 'react'
import { triggerSplitResize } from '../../lib/configuration.js'

export default class TabContent extends Component {
  componentDidUpdate (prevProps) {
    if (this.props.active && !prevProps.active) {
      triggerSplitResize()
    }
  }

  shouldComponentUpdate (nextProps) {
    return this.props.active || nextProps.active
  }

  render () {
    const { active } = this.props
    return <div className='block' style={{ display: active ? 'flex' : 'none' }}>{this.props.children}</div>
  }
}
