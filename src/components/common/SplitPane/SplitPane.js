import Promise from 'bluebird'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import assign from 'lodash/assign'
import Pane from './Pane'
import Resizer from './Resizer'

export default class SplitPane extends Component {
  constructor () {
    super()

    this.windows = {}

    this.state = {
      active: false,
      resized: false
    }

    this.collapse = this.collapse.bind(this)
    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)
  }

  static propTypes = {
    primary: React.PropTypes.oneOf(['first', 'second']),
    minSize: React.PropTypes.number,
    defaultSize: React.PropTypes.string,
    size: React.PropTypes.number,
    allowResize: React.PropTypes.bool,
    resizerClassName: React.PropTypes.string,
    split: React.PropTypes.oneOf(['vertical', 'horizontal']),
    onDragStarted: React.PropTypes.func,
    onDragFinished: React.PropTypes.func,
    onCollapsing: React.PropTypes.func,
    onDocking: React.PropTypes.func,
    onUndocking: React.PropTypes.func,
    onUndocked: React.PropTypes.func
  }

  static defaultProps = {
    split: 'vertical',
    minSize: 50,
    allowResize: true,
    rimary: 'first',
    collapsable: 'second',
    undockeable: false,
    defaultSize: '50%'
  }

  componentDidMount () {
    this.setSize(this.props, this.state, (newSize) => {
      if (typeof this.props.onChange === 'function') {
        this.props.onChange(newSize)
      }

      if (typeof this.props.onDragFinished === 'function') {
        this.props.onDragFinished()
      }
    })

    document.addEventListener('mouseup', this.onMouseUp)

    this.windows = {}
  }

  setSize (props, state, cb) {
    const ref = this.props.primary === 'first' ? this.refs.pane1 : this.refs.pane2
    let newSize

    if (ref) {
      newSize = props.size || (state && state.draggedSize) || props.defaultSize || props.minSize

      ref.setState({
        size: newSize
      }, () => cb(newSize))
    }
  }

  componentWillUnmount () {
    document.removeEventListener('mouseup', this.onMouseUp)
    this.windows = {}
  }

  onMouseDown (event) {
    if (this.props.allowResize && !this.props.size) {
      this.unFocus()
      let position = this.props.split === 'vertical' ? event.clientX : event.clientY
      if (typeof this.props.onDragStarted === 'function') {
        this.props.onDragStarted()
      }
      this.setState({
        active: true,
        position: position
      })

      document.addEventListener('mousemove', this.onMouseMove)
    }
  }

  onMouseMove (event, force) {
    if (this.props.allowResize && !this.props.size && !this.state.collapsed) {
      if (this.state.active || force) {
        this.unFocus()
        const ref = this.props.primary === 'first' ? this.refs.pane1 : this.refs.pane2
        if (ref) {
          const node = ReactDOM.findDOMNode(ref)

          if (node.getBoundingClientRect) {
            const width = node.getBoundingClientRect().width
            const height = node.getBoundingClientRect().height
            const current = this.props.split === 'vertical' ? event.clientX : event.clientY
            const size = this.props.split === 'vertical' ? width : height
            const position = this.state.position
            const newPosition = this.props.primary === 'first' ? (position - current) : (current - position)

            let newSize = size - newPosition

            if (newSize < this.props.minSize) {
              newSize = this.props.minSize
            } else {
              this.setState({
                position: current,
                resized: true
              })
            }

            if (this.props.onChange) {
              this.props.onChange(newSize)
            }

            this.setState({
              draggedSize: newSize
            })

            ref.setState({
              size: newSize
            })
          }
        }
      }
    }
  }

  onMouseUp () {
    document.removeEventListener('mousemove', this.onMouseMove)

    if (this.props.allowResize && !this.props.size) {
      if (this.state.active) {
        if (typeof this.props.onDragFinished === 'function') {
          this.props.onDragFinished()
        }
        this.setState({
          active: false
        })
      }
    }
  }

  unFocus () {
    if (document.selection) {
      document.selection.empty()
    } else {
      window.getSelection().removeAllRanges()
    }
  }

  merge (into, obj) {
    for (let attr in obj) {
      into[attr] = obj[attr]
    }
  }

  openWindow (opts) {
    let defaultWindowOpts = {
      directories: false,
      toolbar: false,
      titlebar: false,
      location: false,
      copyhistory: false,
      status: false,
      menubar: false,
      scrollbars: true,
      resizable: true
    }

    let windowOptsStr

    if (this.windows[opts.id] != null) {
      if (this.windows[opts.id].closed === true) {
        delete this.windows[opts.id]
      } else {
        return this.windows[opts.id]
      }
    }

    if (!opts.tab) {
      let windowOpts = assign({}, defaultWindowOpts, opts.windowOpts)

      let dualScreenLeft = window.screenLeft != null ? window.screenLeft : window.screen.left
      let dualScreenTop = window.screenTop != null ? window.screenTop : window.screen.top

      let width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : window.screen.width
      let height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : window.screen.height
      let windowWidth = width / 2
      let windowHeight = height / 1.3

      let left = ((width / 2) - (windowWidth / 2)) + dualScreenLeft
      let top = ((height / 2) - (windowHeight / 2)) + dualScreenTop

      windowOpts.top = top
      windowOpts.left = left
      windowOpts.width = windowWidth
      windowOpts.height = windowHeight

      windowOptsStr = (
        Object.keys(windowOpts)
          .map((opt) => `${opt}=${typeof windowOpts[opt] === 'boolean' ? (windowOpts[opt] ? 'yes' : 'no') : windowOpts[opt]}`)
          .join(',')
      )
    }

    let nWindow = window.open(
      opts.url || '',
      opts.name || '_blank',
      opts.tab ? undefined : windowOptsStr
    )

    this.windows[opts.id] = nWindow

    if (nWindow.focus) {
      nWindow.focus()
    }

    return nWindow
  }

  collapse (v, undockeable, undocked) {
    let shouldCollapseAsync

    shouldCollapseAsync = (this.props.onCollapsing != null) ? this.props.onCollapsing(v) : true

    Promise.resolve(shouldCollapseAsync).then((shouldCollapse) => {
      let ref1 = this.props.collapsable === 'first' ? this.refs.pane2 : this.refs.pane1
      const ref2 = this.props.collapsable === 'first' ? this.refs.pane1 : this.refs.pane2

      let stateToUpdate

      if (!shouldCollapse) {
        return
      }

      if (!v) {
        if (ref1) {
          ref1.setState({
            size: this.lastSize
          })
        }

        if (ref2) {
          ref2.setState({
            size: this.lastSize2
          })
        }

        stateToUpdate = {
          resized: true,
          collapsed: v,
          draggedSize: this.lastSize,
          position: this.lastSize,
          undocked: undocked
        }

        if (undockeable && undocked === false) {
          this.props.onDocking && this.props.onDocking()
        }

        this.setState(stateToUpdate)
      } else {
        if (ref1) {
          this.lastSize = ref1.state.size
        }

        if (ref2) {
          this.lastSize2 = ref2.state.size
        }

        stateToUpdate = {
          collapsed: v,
          resized: true,
          draggedSize: undefined,
          position: undefined,
          undocked: undocked
        }

        if (undockeable && undocked === true) {
          let windowOpts = (this.props.onUndocking != null) ? this.props.onUndocking() : null

          if (!windowOpts) {
            return
          }

          if (ref1) {
            ref1.setState({
              size: undefined
            })
          }

          if (ref2) {
            ref2.setState({
              size: 0
            })
          }

          this.setState(stateToUpdate, () => {
            // opening the window when setState is done..
            // giving it the chance to clear the previous iframe
            const nWindow = this.openWindow(windowOpts)

            this.props.onUndocked && this.props.onUndocked(windowOpts.id, nWindow)
          })
        } else {
          if (ref1) {
            ref1.setState({
              size: undefined
            })
          }

          if (ref2) {
            ref2.setState({
              size: 0
            })
          }

          this.setState(stateToUpdate)
        }
      }

      if (typeof this.props.onDragFinished === 'function') {
        this.props.onDragFinished()
      }
    })
  }

  renderPane (type, undockeable, pane) {
    const { collapsable } = this.props
    const { undocked } = this.state

    if (collapsable === type) {
      if (!undockeable) {
        return pane
      }

      if (undocked) {
        return null
      }

      return pane
    } else {
      return pane
    }
  }

  render () {
    const {
      split,
      allowResize,
      resizerClassName,
      collapsedText,
      collapsable,
      undockeable
    } = this.props
    const { collapsed, undocked } = this.state
    let disabledClass = allowResize ? '' : 'disabled'

    let style = {
      display: 'flex',
      flex: 1,
      outline: 'none',
      overflow: 'hidden',
      MozUserSelect: 'text',
      WebkitUserSelect: 'text',
      msUserSelect: 'text',
      userSelect: 'text'
    }

    if (split === 'vertical') {
      this.merge(style, {
        flexDirection: 'row'
      })
    } else {
      this.merge(style, {
        flexDirection: 'column',
        width: '100%'
      })
    }

    const children = this.props.children
    const classes = ['SplitPane', this.props.className, split, disabledClass]
    const undockSupported = (typeof undockeable === 'function' ? undockeable() : undockeable)

    return (
      <div className={classes.join(' ')} style={style} ref='splitPane'>
        {this.renderPane(
          'first',
          undockSupported,
          <Pane ref='pane1' key='pane1' className='Pane1' split={split}>{children[0]}</Pane>
        )}
        <Resizer
          ref='resizer'
          key='resizer'
          collapsable={collapsable}
          collapsedText={collapsedText}
          className={disabledClass + ' ' + resizerClassName}
          onMouseDown={this.onMouseDown}
          collapsed={collapsed}
          split={split}
          collapse={this.collapse}
          undockeable={undockSupported}
          undocked={undocked}
        />
        {this.renderPane(
          'second',
          undockSupported,
          <Pane ref='pane2' key='pane2' className='Pane2' split={split}>{children[1]}</Pane>
        )}
      </div>
    )
  }
}
