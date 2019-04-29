import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { selectors } from '../../redux/editor'
import style from './ApiModal.scss'

@connect((state, props) => ({ entity: selectors.getActiveEntity(state) }))
export default class ApiModal extends Component {
  static propTypes = {
    options: PropTypes.object.isRequired
  }

  getRootUrl () {
    const location = window.location.href.split('?')[0].split('#')[0]

    if (location.indexOf('/studio') === -1) {
      return location.replace(/\/$/, '')
    }

    return location.split('/studio')[0].replace(/\/$/, '')
  }

  syntaxHighlight (json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // eslint-disable-next-line no-useless-escape
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      var cls = style.number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = style.key
        } else {
          cls = style.string
        }
      } else if (/true|false/.test(match)) {
        cls = style.boolean
      } else if (/null/.test(match)) {
        cls = style.null
      }
      return '<span class="' + cls + '">' + match + '</span>'
    })
  }

  render () {
    const { entity } = this.props
    const { apiSpecs } = this.props.options

    const shortid = (entity && entity.__entitySet === 'templates') ? entity.shortid : 'shortid'
    const body = { 'template': { 'shortid': shortid }, 'data': { 'aProperty': 'value' } }

    return <div>
      <h3>Render and stream back report </h3>

      <div className={style.row}>
        <span className={style.label}>POST: </span><a className={style.url}>{this.getRootUrl() + '/api/report'}</a>
      </div>
      <div className={style.row}>
        <span className={style.label + ' ' + style.minor}>HEADERS:</span>
        <code>Content-Type: application/json</code>
      </div>
      <div className={style.row}>
        <span className={style.label + ' ' + style.minor}>BODY:</span>
        <code dangerouslySetInnerHTML={{ __html: this.syntaxHighlight(JSON.stringify(body)) }} />
      </div>
      <br />
      <small>You can also identify template with name instead of shortid.</small>
      <br />
      <br />
      <div>
        <a className={style.link} href='http://jsreport.net/learn/api' target='_blank'>
          <i className='fa fa-lightbulb-o' /> open documentation</a>
      </div>

      <div>
        <a className={style.link} href={this.getRootUrl() + '/odata/$metadata'} target='_blank'>
          <i className='fa fa-lightbulb-o' /> open odata metadata</a>
      </div>

      <h3>all possible overrides</h3>

      <div className={style.overridesBox}>
        <pre dangerouslySetInnerHTML={{ __html: this.syntaxHighlight(JSON.stringify(apiSpecs, null, 2)) }} />
      </div>
    </div>
  }
}
