import React, {Component, PropTypes} from 'react'
import {connect} from 'react-redux'
import {actions as entitiesActions} from '../../redux/entities'
import api from '../../helpers/api.js'

@connect((state) => ({}), { ...entitiesActions })
export default class Modal extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }

  constructor (props) {
    super(props)

    this.state = {
      error: null
    }
  }

  handleKeyPress (e) {
    if (e.key === 'Enter') {
      this.submit(e.target.value)
    }
  }

  async submit (val) {
    let entity = {}
    const name = val || this.refs.nameInput.value
    let response

    entity.name = name

    if (this.props.options.defaults != null) {
      entity = Object.assign(this.props.options.defaults, entity)
    }

    try {
      await api.post('/studio/validate-entity-name', {
        data: {
          _id: entity._id,
          name: entity.name,
          entitySet: 'folders',
          folderShortid: entity.folder != null ? entity.folder.shortid : null
        }
      })

      response = await api.post('/odata/folders', {
        data: entity
      })
    } catch (e) {
      this.setState({
        error: e.message
      })

      return
    }

    this.setState({
      error: null
    })

    response.__entitySet = 'folders'

    this.props.addExisting(response)

    this.props.close()
  }

  // the modal component for some reason after open focuses the panel itself
  componentDidMount () {
    setTimeout(() => this.refs.nameInput.focus(), 0)
  }

  render () {
    const { error } = this.state
    const { initialName } = this.props.options

    return <div>
      <div className='form-group'>
        <label>New folder</label>
        <input
          type='text'
          placeholder='name...'
          ref='nameInput'
          defaultValue={initialName}
          onKeyPress={(e) => this.handleKeyPress(e)}
        />
      </div>
      <div className='form-group'>
        <span style={{color: 'red', display: error ? 'block' : 'none'}}>{error}</span>
      </div>
      <div className='button-bar'>
        <button className='button confirmation' onClick={() => this.submit()}>ok</button>
      </div>
    </div>
  }
}
