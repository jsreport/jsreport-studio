import React, { Component } from 'react'
import shortid from 'shortid'
import {
  subscribeToThemeChange,
  registerPreviewFrameChangeHandler,
  registerPreviewConfigurationHandler,
  previewFrameChangeHandler,
  previewConfigurationHandler
} from '../../lib/configuration.js'
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
      src: this.props.initialSrc,
      disableTheming: false
    }

    this.lastURLBlobCreated = null
    this.handleOnLoad = this.handleOnLoad.bind(this)
    this.applyStylesToIframe = this.applyStylesToIframe.bind(this)
  }

  componentWillMount () {
    this.unsubscribeThemeChange = subscribeToThemeChange(this.applyStylesToIframe)
  }

  componentWillUpdate (nextProps, nextState) {
    if (this.state.src !== nextState.src && this.lastURLBlobCreated != null) {
      window.URL.revokeObjectURL(this.lastURLBlobCreated)
      this.lastURLBlobCreated = null
    }
  }

  componentDidMount () {
    this.instanceId = shortid.generate()
    Preview.instances[this.instanceId] = this

    if (this.props.main) {
      this.disposePreviewChangeHandler = registerPreviewFrameChangeHandler((src, opts = {}) => {
        let srcToUse = src
        const dataURLMatch = /^data:([^,;]+)?(;[^,]+)?(,.+)/.exec(src)

        if (dataURLMatch != null) {
          const blob = new Blob([decodeURI(dataURLMatch[3].slice(1))], { type: dataURLMatch[1] })
          srcToUse = window.URL.createObjectURL(blob)
        }

        previewConfigurationHandler({ ...opts, src: srcToUse }).then(() => {
          if (dataURLMatch != null) {
            this.lastURLBlobCreated = srcToUse
          }
        })
      })

      this.disposePreviewConfigurationHandler = registerPreviewConfigurationHandler(async (opts = {}) => {
        // removing lastURLBlob on each execution
        if (this.lastURLBlobCreated != null) {
          window.URL.revokeObjectURL(this.lastURLBlobCreated)
          this.lastURLBlobCreated = null
        }

        const newState = {}

        if (opts.src == null) {
          newState.src = null
        } else {
          newState.src = opts.src
        }

        if (opts.disableTheming === true) {
          newState.disableTheming = true
        } else {
          newState.disableTheming = false
        }

        return new Promise((resolve) => {
          this.setState(newState, () => {
            resolve()
          })
        })
      })
    }
  }

  componentWillUnmount () {
    if (this.disposePreviewChangeHandler) {
      this.disposePreviewChangeHandler()
    }

    if (this.disposePreviewConfigurationHandler) {
      this.disposePreviewConfigurationHandler()
    }

    if (this.unsubscribeThemeChange) {
      this.unsubscribeThemeChange()
    }

    if (this.lastURLBlobCreated != null) {
      window.URL.revokeObjectURL(this.lastURLBlobCreated)
      this.lastURLBlobCreated = null
    }

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
      const { disableTheming } = this.state

      if (this.refs.container.classList.contains(styles.containerDefaultBackground)) {
        this.refs.container.classList.remove(styles.containerDefaultBackground)
      }

      const previousStyle = this.refs.preview.contentDocument.head.querySelector('style[data-jsreport-theme-styles]')

      if (previousStyle) {
        previousStyle.remove()
      }

      if (disableTheming) {
        this.refs.container.classList.add(styles.containerDefaultBackground)
        return
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

  changeSrc (newSrc, opts = {}) {
    previewFrameChangeHandler(newSrc, opts)
  }

  clear () {
    this.setState({
      nodeKey: shortid.generate(),
      src: null,
      disableTheming: false
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
