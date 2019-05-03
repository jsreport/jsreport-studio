import React, { Component } from 'react'
import MonacoEditor from 'react-monaco-editor'
import { subscribeToSplitResize } from '../../lib/configuration.js'

export default class TextEditor extends Component {
  static propTypes = {
    value: React.PropTypes.string,
    onUpdate: React.PropTypes.func.isRequired,
    mode: React.PropTypes.string.isRequired,
    name: React.PropTypes.string.isRequired
  }

  constructor (props) {
    super(props)

    this.editorDidMount = this.editorDidMount.bind(this)
  }

  componentDidMount () {
    this.refs.monaco.editor.focus()

    this.unsubscribe = subscribeToSplitResize(() => {
      this.refs.monaco.editor.layout()
    })
  }

  componentWillUnmount () {
    this.unsubscribe()
  }

  editorDidMount (editor, monaco) {
    // adding universal ctrl + y, cmd + y handler
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Y, () => {
      editor.trigger('jsreport-studio', 'redo')
    })

    // disables the default "Format Document" action, we do this to prevent having two
    // different ways to format the code, we want to use our own formatter for now
    editor.addAction({
      id: 'editor.action.formatDocument',
      label: '',
      keybindings: [],
      precondition: null,
      keybindingContext: null,
      run: () => {}
    })

    // monkey path setValue option to make it preserve undo stack
    // when editing text editor with "Reformat" (or by prop change)
    editor.setValue = (newValue) => {
      const model = editor.getModel()

      if (newValue !== model.getValue()) {
        model.pushEditOperations(
          [],
          [
            {
              range: model.getFullModelRange(),
              text: newValue
            }
          ]
        )
      }
    }

    editor.layout()
  }

  get mainEditor () {
    return this.refs.monaco
  }

  render () {
    const { value, onUpdate, name, mode } = this.props

    const editorOptions = {
      roundedSelection: false,
      automaticLayout: false,
      dragAndDrop: false,
      minimap: {
        enabled: false
      }
    }

    return (
      <MonacoEditor
        name={name}
        ref='monaco'
        width='100%'
        height='100%'
        language={mode}
        theme='vs'
        value={value || ''}
        editorDidMount={this.editorDidMount}
        options={editorOptions}
        onChange={(v) => onUpdate(v)}
      />
    )
  }
}
