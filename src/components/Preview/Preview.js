import React, { Component } from 'react'
import shortid from 'shortid'
import { subscribeToThemeChange, registerPreviewFrameChangeHandler } from '../../lib/configuration.js'
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

    this.handleOnLoad = this.handleOnLoad.bind(this)
    this.applyStylesToIframe = this.applyStylesToIframe.bind(this)
  }

  componentWillMount () {
    subscribeToThemeChange(this.applyStylesToIframe)
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

  handleOnLoad () {
    this.applyStylesToIframe()

    if (this.props.onLoad) {
      this.props.onLoad()
    }
  }

  applyStylesToIframe () {
    if (!this.refs.container || !this.refs.preview) {
      return
    }

    try {
      const previousStyle = this.refs.preview.contentDocument.head.querySelector('style[data-jsreport-theme-styles]')

      if (previousStyle) {
        previousStyle.remove()
      }

      const containerStyles = window.getComputedStyle(this.refs.container, null)
      const style = document.createElement('style')

      style.dataset.jsreportThemeStyles = true
      style.type = 'text/css'

      style.appendChild(document.createTextNode(`
        html, body {
          background-color: ${containerStyles.getPropertyValue('background-color')};
          color: ${containerStyles.getPropertyValue('color')};
        }
      `))

      this.refs.preview.contentDocument.head.insertBefore(
        style,
        this.refs.preview.contentDocument.head.firstChild
      )
    } catch (e) {
      // ignore error, because it was just cross-origin issues
    }
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
      <div ref='container' className={`block ${styles.container}`}>
        <div ref='overlay' style={{ display: 'none' }} />
        <iframe
          key={nodeKey}
          ref='preview'
          frameBorder='0'
          onLoad={this.handleOnLoad}
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
