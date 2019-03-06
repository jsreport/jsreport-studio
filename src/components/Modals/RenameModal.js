import React, {Component, PropTypes} from 'react'
import {connect} from 'react-redux'
import {actions, selectors} from '../../redux/entities'
import api from '../../helpers/api.js'
import { entitySets } from '../../lib/configuration.js'

@connect((state, props) => ({ entity: selectors.getById(state, props.options._id) }), { ...actions })
export default class RenameModal extends Component {
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

  async rename () {
    if (!this.refs.name.value) {
      return
    }

    const newName = this.refs.name.value
    const nameAttribute = entitySets[this.props.entity.__entitySet].nameAttribute

    try {
      await api.post('/studio/validate-entity-name', {
        data: {
          _id: this.props.entity._id,
          name: newName,
          entitySet: this.props.entity.__entitySet,
          folderShortid: this.props.entity.folder != null ? this.props.entity.folder.shortid : null
        }
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

    this.props.close()

    this.props.update({
      _id: this.props.entity._id,
      [nameAttribute]: newName
    })
    this.props.save(this.props.entity._id)
  }

  componentDidMount () {
    setTimeout(() => this.refs.name.focus(), 0)
  }

  render () {
    const { error } = this.state
    const { entity } = this.props
    const nameAttribute = entitySets[entity.__entitySet].nameAttribute

    return <div>
      <div className='form-group'>
        <label>rename entity</label>
        <input ref='name' type='text' defaultValue={entity[nameAttribute]} />
      </div>
      <div className='form-group'>
        <span style={{color: 'red', display: error ? 'block' : 'none'}}>{error}</span>
      </div>
      <div className='button-bar'>
        <button className='button confirmation' onClick={() => this.rename()}>Ok</button>
        <button className='button confirmation' ref='cancel' onClick={() => this.props.close()}>Cancel</button>
      </div>
    </div>
  }
}
