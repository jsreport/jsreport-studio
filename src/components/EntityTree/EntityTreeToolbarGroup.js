import React, { Component } from 'react'
import EntityTreeButton from './EntityTreeButton'
import { entityTreeToolbarComponents } from '../../lib/configuration.js'
import style from './EntityTree.scss'

class EntityTreeToolbarGroup extends Component {
  constructor (props) {
    super(props)

    this.state = {
      isMenuActive: false
    }

    this.setMenuNode = this.setMenuNode.bind(this)
    this.tryHide = this.tryHide.bind(this)
    this.handleGlobalClick = this.handleGlobalClick.bind(this)
  }

  componentDidMount () {
    window.addEventListener('click', this.handleGlobalClick, true)
  }

  componentWillUnmount () {
    window.removeEventListener('click', this.handleGlobalClick, true)
  }

  setMenuNode (el) {
    this.menuNode = el
  }

  tryHide () {
    this.setState({
      isMenuActive: false
    })
  }

  handleGlobalClick (ev) {
    const LEFT_CLICK = 1
    const button = ev.which || ev.button

    if (!this.state.isMenuActive || !this.menuNode) {
      return
    }

    if (ev.target.type === 'file') {
      return
    }

    ev.preventDefault()

    if (!this.menuNode.contains(ev.target)) {
      ev.stopPropagation()

      // handle quirk in firefox that fires and additional click event during
      // contextmenu event, this code prevents the context menu to
      // inmediatly be closed after being shown in firefox
      if (button === LEFT_CLICK) {
        this.tryHide()
      }
    }
  }

  renderMenu () {
    const { isMenuActive } = this.state

    if (!isMenuActive) {
      return null
    }

    const menuItems = entityTreeToolbarComponents.group.map((p, i) => (
      <div
        key={`EntityToolbarGroupItem${i}`}
        className={`${style.contextButton}`}
      >
        {React.createElement(p, {
          ...this.props,
          closeMenu: this.tryHide
        })}
      </div>
    ))

    return (
      <div key='entity-contextmenu' ref={this.setMenuNode} className={style.contextMenuContainer}>
        <div className={style.contextMenu}>
          {menuItems}
        </div>
      </div>
    )
  }

  render () {
    return (
      <div title={'more options...'} style={{ display: 'inline-block', marginLeft: '0.2rem', marginRight: '0.2rem' }}>
        <EntityTreeButton onClick={() => this.setState((state) => ({ isMenuActive: !state.isMenuActive }))}>
          <span style={{ display: 'inline-block' }}>
            <i className='fa fa-bars' />
          </span>
        </EntityTreeButton>
        {this.renderMenu()}
      </div>
    )
  }
}

export default EntityTreeToolbarGroup
