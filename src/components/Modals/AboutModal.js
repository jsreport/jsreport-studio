import React, { Component, PropTypes } from 'react'

class AboutModal extends Component {
  static propTypes = {
    options: PropTypes.object.isRequired
  }

  render () {
    const { version, engines, recipes, extensions } = this.props.options

    return (
      <div>
        <h2>About</h2>
        <div>
          version: <b>{version}</b>
        </div>
        <br />
        <div>
          <a
            className='button confirmation'
            href={`https://github.com/jsreport/jsreport/releases/tag/${version}`}
            target='_blank'
            style={{ marginLeft: 0 }}
          >
            Release notes
          </a>
        </div>
        <br />
        <div>
          <div>
            engines:
          </div>
          <div>
            <b>{engines.sort().join(', ')}</b>
          </div>
        </div>
        <br />
        <div>
          <div>
            recipes:
          </div>
          <div>
            <b>{recipes.sort().join(', ')}</b>
          </div>
        </div>
        <hr />
        <div>
          extensions:
          <ul style={{ listStyle: 'none', paddingLeft: '5px' }}>
            {Object.keys(extensions).sort().map((name) => {
              const extension = extensions[name]

              return (
                <li key={extension.name}><b>{extension.name}:</b> {extension.version}</li>
              )
            })}
          </ul>
        </div>
      </div>
    )
  }
}

export default AboutModal
