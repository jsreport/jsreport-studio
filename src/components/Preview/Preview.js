import React, { Component } from 'react'
import { registerPreviewFrameChangeHandler } from '../../lib/configuration.js'

export default class Preview extends Component {
  static propTypes = {
    onLoad: React.PropTypes.func.isRequired
  }

  constructor () {
    super()
    this.state = { src: null }
  }

  componentDidMount () {
    registerPreviewFrameChangeHandler((src) => this.setState({ src: src }))
  }

  resizeStarted () {
    document.getElementById('overlay').style.display = 'block'
    document.getElementById('preview').style.display = 'none'
  }

  resizeEnded () {
    document.getElementById('overlay').style.display = 'none'
    document.getElementById('preview').style.display = 'block'
  }

  render () {
    const { src } = this.state

    return (
      <div className='block'>
        <div id='overlay' style={{ display: 'none' }} />
        <iframe
          id='preview'
          frameBorder='0'
          onLoad={this.props.onLoad}
          name='previewFrame'
          allowTransparency='true'
          allowFullScreen='true'
          ref='frame'
          width='100%'
          height='100%'
          src={src}
          className='block-item'
        />
      </div>
    )
  }
}
