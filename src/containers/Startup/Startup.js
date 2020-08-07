import React, { Component } from 'react'
import { connect } from 'react-redux'
import { actions } from '../../redux/editor'
import { actions as settingsActions, selectors as settingsSelectors } from '../../redux/settings'
import { selectors as entitiesSelectors } from '../../redux/entities'
import api from '../../helpers/api.js'
import { previewFrameChangeHandler, extensions } from '../../lib/configuration.js'

class Startup extends Component {
  constructor () {
    super()
    this.state = { templates: [] }
  }

  onTabActive () {
    this.loadLastModifiedTemplates()
  }

  async loadLastModifiedTemplates () {
    if (this.fetchRequested) {
      return
    }

    this.fetchRequested = true
    const response = await api.get('/odata/templates?$top=5&$select=name,recipe,modificationDate&$orderby=modificationDate desc')

    await this.props.load()

    this.setState({
      templates: response.value.map((t) => ({
        ...t,
        path: this.props.resolveEntityPath(t)
      }))
    })

    this.fetchRequested = false
  }

  shouldComponentUpdate (props) {
    return props.activeTabKey === 'StartupPage'
  }

  openLogs (m) {
    const errorMessage = m.error ? (m.error.message + '<br/>' + m.error.stack + '<br/><br/><br/>') : ''

    let logs = ''
    if (m.logs && m.logs.length) {
      const start = new Date(m.logs[0].timestamp).getTime()
      const rows = m.logs.map((m) => {
        const time = (new Date(m.timestamp).getTime() - start)
        return `<tr><td>+${time}</td><td>${m.message}</td></tr>`
      }).join('')
      logs = '<table>' + rows + '</table>'
    }

    return previewFrameChangeHandler('data:text/html;charset=utf-8,' + encodeURI(errorMessage + logs))
  }

  renderRequestLogs (logsWithTemplates, failedLogsWithTemplates) {
    const { openTab } = this.props

    return (
      <div>
        <h2>Last requests</h2>

        <div>
          <table className='table'>
            <thead>
              <tr>
                <th>template</th>
                <th>started</th>
              </tr>
            </thead>
            <tbody>
              {(logsWithTemplates).map((l, k) => (
                <tr key={k} onClick={() => this.openLogs(l)}>
                  <td className='selection'>
                    <a style={{ textDecoration: 'underline' }} onClick={() => l.template._id ? openTab({ _id: l.template._id }) : null}>
                      {l.template.path}
                    </a>
                  </td>
                  <td>{new Date(l.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Last failed requests</h2>
        <div>
          <table className='table'>
            <thead>
              <tr>
                <th>template</th>
                <th>error</th>
                <th>started</th>
              </tr>
            </thead>
            <tbody>
              {(failedLogsWithTemplates).map((l, k) => (
                <tr key={k} onClick={() => this.openLogs(l)}>
                  <td className='selection'>
                    <a style={{ textDecoration: 'underline' }} onClick={() => l.template._id ? openTab({ _id: l.template._id }) : null}>
                      {l.template.path}
                    </a>
                  </td>
                  <td>{!l.error.message || l.error.message.length < 90 ? l.error.message : (l.error.message.substring(0, 80) + '...')}</td>
                  <td>{new Date(l.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  render () {
    const { templates } = this.state
    const { openTab, logsWithTemplates, failedLogsWithTemplates } = this.props

    return (
      <div className='block custom-editor' style={{ overflow: 'auto', minHeight: 0, height: 'auto' }}>
        <h2>Last edited templates</h2>

        <div>
          <table className='table'>
            <thead>
              <tr>
                <th>name</th>
                <th>recipe</th>
                <th>last modified</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t._id} onClick={() => openTab({ _id: t._id })}>
                  <td className='selection'>{t.path}</td>
                  <td>{t.recipe}</td>
                  <td>{t.modificationDate.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {extensions.studio.options.requestLogEnabled === false ? <div /> : this.renderRequestLogs(logsWithTemplates, failedLogsWithTemplates)}
      </div>
    )
  }
}

export default connect((state) => ({
  activeTabKey: state.editor.activeTabKey,
  logsWithTemplates: settingsSelectors.getLogsWithTemplates(state),
  failedLogsWithTemplates: settingsSelectors.getFailedLogsWithTemplates(state),
  resolveEntityPath: (...params) => entitiesSelectors.resolveEntityPath(state, ...params)
}), { ...actions, ...settingsActions }, undefined, { forwardRef: true })(Startup)
