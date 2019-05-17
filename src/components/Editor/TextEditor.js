import React, { Component } from 'react'
import ChromeTheme from 'monaco-themes/themes/Chrome DevTools.json'
import MonacoEditor from 'react-monaco-editor'
import debounce from 'lodash/debounce'
import LinterWorker from './workers/linter.worker'
import { textEditorInitializeListeners, textEditorCreatedListeners, subscribeToSplitResize } from '../../lib/configuration.js'

export default class TextEditor extends Component {
  static propTypes = {
    value: React.PropTypes.string,
    onUpdate: React.PropTypes.func.isRequired,
    mode: React.PropTypes.string.isRequired,
    name: React.PropTypes.string.isRequired
  }

  constructor (props) {
    super(props)

    this.lintWorker = null
    this.oldCode = null

    this.setUpLintWorker = this.setUpLintWorker.bind(this)
    this.lint = this.lint.bind(this)
    this.lint = debounce(this.lint, 400)
    this.editorWillMount = this.editorWillMount.bind(this)
    this.editorDidMount = this.editorDidMount.bind(this)
  }

  componentDidMount () {
    this.refs.monaco.editor.focus()

    this.unsubscribe = subscribeToSplitResize(() => {
      this.refs.monaco.editor.layout()
    })
  }

  componentWillUnmount () {
    this.oldCode = null

    this.unsubscribe()

    if (this.lintWorker) {
      this.lintWorker.terminate()
    }
  }

  editorWillMount (monaco) {
    ChromeTheme.colors['editor.lineHighlightBackground'] = '#EDEDED'

    // js updates
    this.updateThemeRule(ChromeTheme, 'string', '1f19a6')
    this.updateThemeRule(ChromeTheme, 'number', '1f19a6')
    this.updateThemeRule(ChromeTheme, 'regexp', '1f19a6')
    this.updateThemeRule(ChromeTheme, 'regexp.escape', '687587')
    this.updateThemeRule(ChromeTheme, 'regexp.escape.control', '585CF6')
    this.updateThemeRule(ChromeTheme, 'string.escape', '585CF6')
    // html updates
    this.updateThemeRule(ChromeTheme, 'tag.html', 'aa0d91')
    this.updateThemeRule(ChromeTheme, 'delimiter.handlebars', 'aa0d91')
    this.updateThemeRule(ChromeTheme, 'variable.parameter.handlebars', 'F6971F')
    this.updateThemeRule(ChromeTheme, 'keyword.helper.handlebars', 'F6971F')
    this.updateThemeRule(ChromeTheme, 'attribute.name', '994407')
    this.updateThemeRule(ChromeTheme, 'attribute.value', '1f19a6')
    // css updates
    this.updateThemeRule(ChromeTheme, 'tag.css', '318495')
    this.updateThemeRule(ChromeTheme, 'attribute.name.css', '6D78DE')
    this.updateThemeRule(ChromeTheme, 'attribute.value.css', '27950C')
    this.updateThemeRule(ChromeTheme, 'attribute.value.number.css', '2900CD')
    this.updateThemeRule(ChromeTheme, 'attribute.value.unit.css', '920F80')
    // json updates
    this.updateThemeRule(ChromeTheme, 'string.key.json', '1f19a6')
    this.updateThemeRule(ChromeTheme, 'string.value.json', '1f19a6')

    textEditorInitializeListeners.forEach((fn) => {
      fn({ monaco, theme: ChromeTheme })
    })

    monaco.editor.defineTheme('chrome', ChromeTheme)
  }

  editorDidMount (editor, monaco) {
    monaco.languages.typescript.typescriptDefaults.setMaximumWorkerIdleTime(-1)
    monaco.languages.typescript.javascriptDefaults.setMaximumWorkerIdleTime(-1)

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true
    })

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true
    })

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

    // auto-size it
    editor.layout()

    window.requestAnimationFrame(() => {
      this.setUpLintWorker(editor, monaco)

      let autoCloseTimeout

      // auto-close tag handling
      editor.onDidChangeModelContent((e) => {
        if (this.props.mode !== 'html' && this.props.mode !== 'handlebars') {
          return
        }

        if (typeof autoCloseTimeout !== 'undefined') {
          clearTimeout(autoCloseTimeout)
        }

        const changes = e.changes
        const lastChange = changes[changes.length - 1]
        const lastCharacter = lastChange.text[lastChange.text.length - 1]

        if (lastChange.rangeLength > 0 || lastCharacter !== '>') {
          return
        }

        autoCloseTimeout = setTimeout(() => {
          const pos = editor.getPosition()
          const textInLineAtCursor = editor.getModel().getLineContent(pos.lineNumber).slice(0, lastChange.range.endColumn)
          let foundValidOpenTag = false
          let extractIndex = 0
          let tagName
          let openTag

          while (textInLineAtCursor.length !== Math.abs(extractIndex) && !foundValidOpenTag) {
            extractIndex--
            openTag = textInLineAtCursor.slice(extractIndex)

            if (Math.abs(extractIndex) <= 2) {
              continue
            }

            if (
              openTag[0] === '/' ||
              openTag[0] === '>' ||
              openTag[0] === ' '
            ) {
              break
            }

            if (openTag[0] === '<' && openTag[openTag.length - 1] === '>') {
              tagName = openTag.slice(1, -1)
              foundValidOpenTag = true
            }
          }

          if (!foundValidOpenTag) {
            return
          }

          const targetRange = new monaco.Range(
            pos.lineNumber,
            pos.column - openTag.length,
            pos.lineNumber,
            pos.column
          )

          const op = {
            identifier: { major: 1, minor: 1 },
            range: targetRange,
            text: `${openTag}</${tagName}>`,
            forceMoveMarkers: true
          }

          editor.executeEdits('auto-close-tag', [op])

          editor.setPosition(pos)

          autoCloseTimeout = undefined
        }, 100)
      })

      editor.onDidChangeModelContent((e) => {
        const newCode = editor.getModel().getValue()
        const filename = typeof this.props.getFilename === 'function' ? this.props.getFilename() : ''

        if (newCode !== this.oldCode) {
          this.lint(newCode, filename, editor.getModel().getVersionId())
        }

        this.oldCode = newCode
      })
    })

    this.oldCode = editor.getModel().getValue()

    textEditorCreatedListeners.forEach((fn) => {
      fn({ monaco, editor })
    })
  }

  get mainEditor () {
    return this.refs.monaco
  }

  updateThemeRule (theme, tokenName, foregroundColor) {
    let r

    r = theme.rules.find((i) => i.token === tokenName)

    if (r) {
      r.foreground = foregroundColor
    } else {
      theme.rules.push({
        foreground: foregroundColor,
        token: tokenName
      })
    }
  }

  setUpLintWorker (editor, monaco) {
    if (this.lintWorker) {
      return
    }

    this.lintWorker = new LinterWorker()

    this.lintWorker.addEventListener('message', (event) => {
      const { markers } = event.data

      window.requestAnimationFrame(() => {
        if (!editor.getModel()) {
          return
        }

        const model = editor.getModel()

        monaco.editor.setModelMarkers(model, 'eslint', markers)
      })
    })

    // first lint
    window.requestAnimationFrame(() => {
      if (!editor.getModel()) {
        return
      }

      const filename = typeof this.props.getFilename === 'function' ? this.props.getFilename() : ''

      this.lint(
        this.props.value,
        filename,
        editor.getModel().getVersionId()
      )
    })
  }

  lint (code, filename, version) {
    if (!this.lintWorker || this.props.mode !== 'javascript') {
      return
    }

    this.lintWorker.postMessage({
      filename,
      code,
      version
    })
  }

  render () {
    const { value, onUpdate, name, mode } = this.props

    const editorOptions = {
      roundedSelection: false,
      automaticLayout: false,
      dragAndDrop: false,
      lineNumbersMinChars: 4,
      fontSize: 11.8,
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
        theme='chrome'
        value={value || ''}
        editorWillMount={this.editorWillMount}
        editorDidMount={this.editorDidMount}
        options={editorOptions}
        onChange={(v) => onUpdate(v)}
      />
    )
  }
}
