import React, { Component } from 'react'
import Tab from './Tab'
import TabPane from './TabPane.js'
import { editorComponents } from '../../lib/configuration.js'

export default class EditorTabs extends Component {
  static propTypes = {
    onUpdate: React.PropTypes.func.isRequired,
    activeTabKey: React.PropTypes.string,
    tabs: React.PropTypes.array.isRequired
  }

  componentDidMount () {
    this.checkActiveTabAndFireHook(this.props.activeTabKey)
  }

  componentDidUpdate (prevProps) {
    if (prevProps.activeTabKey !== this.props.activeTabKey) {
      this.checkActiveTabAndFireHook(this.props.activeTabKey)
    }
  }

  checkActiveTabAndFireHook (activeTabKey) {
    if (activeTabKey == null) {
      return
    }

    const componentTabRef = this.refs[activeTabKey]

    if (!componentTabRef) {
      return
    }

    if (typeof componentTabRef.onTabActive === 'function') {
      componentTabRef.onTabActive()
    } else if (
      typeof componentTabRef.getWrappedInstance === 'function' &&
      typeof componentTabRef.getWrappedInstance().onTabActive === 'function'
    ) {
      componentTabRef.getWrappedInstance().onTabActive()
    }
  }

  renderEntityTab (t, onUpdate) {
    return <Tab key={t.tab.key} >
      {React.createElement(editorComponents[ t.tab.editorComponentKey || t.entity.__entitySet ], {
        entity: t.entity,
        tab: t.tab,
        ref: t.tab.key,
        onUpdate: (o) => onUpdate(o)
      })}
    </Tab>
  }

  render () {
    const { activeTabKey, onUpdate, tabs } = this.props

    return (
      <TabPane
        activeTabKey={activeTabKey}
      >
        {tabs.map((t) =>
          this.renderEntityTab(t, onUpdate)
        )}
      </TabPane>
    )
  }
}
