import React, { Component, PropTypes } from 'react'
import { getCurrentTheme, setCurrentTheme } from '../../helpers/theme'
import style from './ThemeModal.scss'

class ThemeModal extends Component {
  static propTypes = {
    options: PropTypes.object.isRequired
  }

  constructor (props) {
    super(props)

    this.state = {
      selectedTheme: getCurrentTheme()
    }
  }

  changeTheme (newTheme) {
    setCurrentTheme(newTheme)

    this.setState({
      selectedTheme: newTheme
    })
  }

  render () {
    const { selectedTheme } = this.state
    const { availableThemes } = this.props.options

    return (
      <div>
        <h2>Theme</h2>
        <div>
          {Object.keys(availableThemes).map((themeName) => (
            <div key={themeName} className={style.item}>
              <label className={style.itemLabel}>
                <input
                  type='radio'
                  value={themeName}
                  onChange={() => this.changeTheme(themeName)}
                  checked={selectedTheme === themeName}
                />
                {themeName}
              </label>
              <div className={style.itemPreview} style={{ backgroundColor: availableThemes[themeName].previewColor }} />
            </div>
          ))}
        </div>
      </div>
    )
  }
}

export default ThemeModal
