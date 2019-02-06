import React, {Component} from 'react'
import { connect } from 'react-redux'
import TabTitle from './TabTitle'
import { getNodeTitleDOMId } from '../EntityTree/utils'
import { selectors as entitiesSelectors } from '../../redux/entities'
import { entitySets, collapseEntityHandler } from '../../lib/configuration'
import style from './Tabs.scss'

const getEntityName = (e) => entitySets[e.__entitySet].nameAttribute ? e[entitySets[e.__entitySet].nameAttribute] : e.name

class TabTitles extends Component {
  static propTypes = {
    activeTabKey: React.PropTypes.string,
    activateTab: React.PropTypes.func.isRequired,
    closeTab: React.PropTypes.func.isRequired,
    tabs: React.PropTypes.array.isRequired
  }

  constructor (props) {
    super(props)
    this.state = {}
    this.handleTabClick = this.handleTabClick.bind(this)
    this.handleTabContextMenu = this.handleTabContextMenu.bind(this)
  }

  componentDidMount () {
    window.addEventListener('click', () => this.tryHide())
  }

  componentWillUnmount () {
    window.removeEventListener('click', () => this.tryHide())
  }

  tryHide () {
    if (this.state.contextMenuKey) {
      this.setState({ contextMenuKey: null })
    }
  }

  closeTab (tabKey) {
    this.props.closeTab(tabKey)
  }

  closeOtherTabs (tabKey) {
    const { tabs } = this.props

    tabs.forEach((t) => {
      if (t.tab.key === tabKey) {
        return
      }

      this.props.closeTab(t.tab.key)
    })
  }

  closeTabsToTheRight (tabKey) {
    const { tabs } = this.props
    let currentTabIndex

    tabs.some((t, idx) => {
      if (t.tab.key === tabKey) {
        currentTabIndex = idx
        return true
      }
    })

    if (currentTabIndex != null) {
      for (let i = currentTabIndex + 1; i < tabs.length; i++) {
        this.props.closeTab(tabs[i].tab.key)
      }
    }
  }

  closeTabsToTheLeft (tabKey) {
    const { tabs } = this.props
    let currentTabIndex

    tabs.some((t, idx) => {
      if (t.tab.key === tabKey) {
        currentTabIndex = idx
        return true
      }
    })

    if (currentTabIndex != null) {
      for (let i = 0; i < currentTabIndex; i++) {
        this.props.closeTab(tabs[i].tab.key)
      }
    }
  }

  closeSavedTabs () {
    const { tabs } = this.props

    tabs.forEach((t) => {
      if (t.entity && t.entity.__isDirty === true) {
        return
      }

      this.props.closeTab(t.tab.key)
    })
  }

  closeAllTabs () {
    const { tabs } = this.props

    tabs.forEach((t) => {
      this.props.closeTab(t.tab.key)
    })
  }

  revealInTree (entity) {
    collapseEntityHandler({ _id: entity._id }, false, { parents: true, self: false })

    const entityNodeId = getNodeTitleDOMId(entity)

    if (!entityNodeId) {
      return
    }

    const entityNode = document.getElementById(entityNodeId)

    if (!entityNode) {
      return
    }

    entityNode.scrollIntoView({ block: 'center', inline: 'center' })
  }

  handleTabClick (e, t) {
    if (
      (e.nativeEvent &&
      e.nativeEvent.which === 2) ||
      (!e.nativeEvent && e.which === 2)
    ) {
      e.stopPropagation()
      return this.closeTab(t.tab.key)
    }

    this.props.activateTab(t.tab.key)
  }

  handleTabContextMenu (e, t) {
    e.preventDefault()
    this.setState({ contextMenuKey: t.tab.key })
  }

  renderContextMenu (t) {
    return (
      <div key='entity-contextmenu' className={style.contextMenuContainer}>
        <div className={style.contextMenu}>
          <div
            className={style.contextButton}
            onClick={(e) => { e.stopPropagation(); this.closeTab(t.tab.key); this.tryHide() }}
          >
            Close Tab
          </div>
          <div
            className={style.contextButton}
            onClick={(e) => { e.stopPropagation(); this.closeOtherTabs(t.tab.key); this.tryHide() }}
          >
            Close Other Tabs
          </div>
          <div
            className={style.contextButton}
            onClick={(e) => { e.stopPropagation(); this.closeTabsToTheRight(t.tab.key); this.tryHide() }}
          >
            Close Tabs to the Right
          </div>
          <div
            className={style.contextButton}
            onClick={(e) => { e.stopPropagation(); this.closeTabsToTheLeft(t.tab.key); this.tryHide() }}
          >
            Close Tabs to the Left
          </div>
          <div
            className={style.contextButton}
            onClick={(e) => { e.stopPropagation(); this.closeSavedTabs(); this.tryHide() }}
          >
            Close Saved Tabs
          </div>
          <div
            className={style.contextButton}
            onClick={(e) => { e.stopPropagation(); this.closeAllTabs(); this.tryHide() }}
          >
            Close All Tabs
          </div>
          {t.entity && (
            <hr />
          )}
          {t.entity && (
            <div
              className={style.contextButton}
              onClick={(e) => { e.stopPropagation(); this.revealInTree(t.entity); this.tryHide() }}
            >
              Reveal in Tree
            </div>
          )}
        </div>
      </div>
    )
  }

  renderTitle (t) {
    const { tabs, activeTabKey, closeTab, resolveEntityPath } = this.props
    const { contextMenuKey } = this.state
    let complementTitle

    if (t.entity) {
      const currentName = getEntityName(t.entity)
      const duplicated = tabs.some((targetT) => {
        if (targetT.entity != null && targetT.entity._id !== t.entity._id) {
          const targetName = getEntityName(targetT.entity)
          return currentName != null && targetName != null && currentName === targetName
        }

        return false
      })

      if (duplicated) {
        const currentPath = resolveEntityPath(t.entity)
        complementTitle = `${currentPath.split('/').slice(1, -1).join('/')}`

        if (complementTitle === '') {
          complementTitle = null
        }
      }
    }

    return (
      <TabTitle
        key={t.tab.key}
        active={t.tab.key === activeTabKey}
        contextMenu={contextMenuKey != null && contextMenuKey === t.tab.key ? this.renderContextMenu(t) : undefined}
        tab={t}
        complementTitle={complementTitle}
        resolveEntityPath={resolveEntityPath}
        onClick={this.handleTabClick}
        onContextMenu={this.handleTabContextMenu}
        onClose={closeTab}
      />
    )
  }

  render () {
    return (
      <div className={style.tabTitles}>
        {this.props.tabs.map((t) => this.renderTitle(t))}
      </div>
    )
  }
}

export default connect((state) => ({
  resolveEntityPath: (entity) => entitiesSelectors.resolveEntityPath(state, entity)
}))(TabTitles)
