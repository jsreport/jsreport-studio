import React, { Component } from 'react'
import TextEditor from './TextEditor.js'
import _debounce from 'lodash/debounce'
import SplitPane from '../../components/common/SplitPane/SplitPane.js'
import { triggerSplitResize, templateEditorModeResolvers } from '../../lib/configuration.js'

export default class TemplateEditor extends Component {
  static propTypes = {
    entity: React.PropTypes.object.isRequired,
    onUpdate: React.PropTypes.func.isRequired
  }

  constructor () {
    super()
    this.handleSplitChanged = _debounce(this.handleSplitChanged, 150, { leading: true })
  }

  handleSplitChanged () {
    triggerSplitResize()
  }

  resolveTemplateEditorMode (template) {
    for (const k in templateEditorModeResolvers) {
      const mode = templateEditorModeResolvers[k](template)
      if (mode) {
        return mode
      }
    }

    return null
  }

  componentDidMount () {
    setTimeout(() => {
      this.refs.contentEditor.mainEditor.editor.focus()
    }, 150)
  }

  render () {
    const { entity, onUpdate } = this.props

    return (
      <SplitPane
        split='horizontal' resizerClassName='resizer-horizontal' onChange={() => this.handleSplitChanged()}
        defaultSize={(window.innerHeight * 0.2) + 'px'}>
        <TextEditor
          key={entity._id}
          ref='contentEditor'
          name={entity._id}
          getFilename={() => entity.name}
          mode={this.resolveTemplateEditorMode(entity) || 'handlebars'}
          onUpdate={(v) => onUpdate(Object.assign({ _id: entity._id }, { content: v }))}
          value={entity.content || ''}
        />
        <TextEditor
          key={entity._id + '_helpers'}
          name={entity._id + '_helpers'}
          getFilename={() => `${entity.name} (helpers)`}
          mode='javascript'
          onUpdate={(v) => onUpdate(Object.assign({ _id: entity._id }, { helpers: v }))}
          value={entity.helpers || ''}
        />
      </SplitPane>
    )
  }
}
