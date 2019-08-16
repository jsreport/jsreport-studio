import React, { Component } from 'react'
import shortid from 'shortid'
import { registerPreviewFrameChangeHandler } from '../../lib/configuration.js'
import styles from './Preview.scss'

export default class Preview extends Component {
  static instances = {}

  static propTypes = {
    onLoad: React.PropTypes.func.isRequired
  }

  constructor (props) {
    super(props)

    this.state = {
      nodeKey: shortid.generate(),
      src: this.props.initialSrc
    }
  }

  componentDidMount () {
    this.instanceId = shortid.generate()
    Preview.instances[this.instanceId] = this

    if (this.props.main) {
      registerPreviewFrameChangeHandler((src) => this.setState({ src: src }))
    }
  }

  componentWillUnmount () {
    delete Preview.instances[this.instanceId]
  }

  changeSrc (newSrc) {
    this.setState({
      src: newSrc
    })
  }

  clear () {
    this.setState({
      nodeKey: shortid.generate(),
      src: null
    })
  }

  resizeStarted () {
    if (this.refs.overlay) {
      this.refs.overlay.style.display = 'block'
    }

    if (this.refs.preview) {
      this.refs.preview.style.display = 'none'
    }
  }

  resizeEnded () {
    if (this.refs.overlay) {
      this.refs.overlay.style.display = 'none'
    }

    if (this.refs.preview) {
      this.refs.preview.style.display = 'block'
    }
  }

  render () {
    const { nodeKey, src } = this.state
    let mainProps = {}

    if (this.props.main) {
      mainProps.id = 'preview'
      mainProps.name = 'previewFrame'
    }

    return (
      <div className={`block ${styles.container}`}>
        <div ref='overlay' style={{ display: 'none' }} />
        <iframe
          key={nodeKey}
          ref='preview'
          frameBorder='0'
          onLoad={this.props.onLoad}
          allowTransparency='true'
          allowFullScreen='true'
          width='100%'
          height='100%'
          src={src == null ? 'about:blank' : src}
          className='block-item'
          {...mainProps}
        />
      </div>
    )
  }
}
