import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { entitySets } from '../../lib/configuration.js'
import { actions, selectors } from '../../redux/entities'

@connect((state, props) => ({
  entity: selectors.getById(state, props.options.entityId)
}), { ...actions })
export default class ConcurrentUpdateErrorModal extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }

  constructor (props) {
    super(props)

    this.state = {
      isSaving: false
    }

    this.componentMounted = false
  }

  componentDidMount () {
    this.componentMounted = true

    setTimeout(() => this.refs.latest.focus(), 0)
  }

  componentWillUnmount () {
    this.componentMounted = false
  }

  async override () {
    const { isSaving } = this.state
    const { entity } = this.props

    if (isSaving) {
      return
    }

    this.setState({
      isSaving: true
    })

    try {
      await this.props.save(entity._id, { ignoreFailed: false, validateConcurrent: false })
    } catch (e) {
      console.error(e)
    }

    if (this.componentMounted) {
      this.setState({
        isSaving: false
      })

      this.props.close()
    }
  }

  async useLatest () {
    const { isSaving } = this.state
    const { entity } = this.props

    if (isSaving) {
      return
    }

    this.setState({
      isSaving: true
    })

    try {
      const freshEntity = await this.props.load(entity._id, true)
      freshEntity.__entitySet = entity.__entitySet
      this.props.replace(undefined, freshEntity)
    } catch (e) {
      console.error(e)
    }

    if (this.componentMounted) {
      this.setState({
        isSaving: false
      })

      this.props.close()
    }
  }

  render () {
    const { isSaving } = this.state
    const { entity } = this.props

    return (
      <div>
        <h2>Entity&nbsp;<b>{entity[entitySets[entity.__entitySet].nameAttribute]} ({entitySets[entity.__entitySet].visibleName || entity.__entitySet})</b> was updated by another source.</h2>
        <div>
          You can either choose <b>"Refresh entity"</b>, which will discard the local changes you have
          {' '}done and will load the entity from the store again, or you can choose <b>"Override"</b>, which will save the local changes to
          the store overriding any previous change.
        </div>

        <div className='button-bar'>
          <button className='button confirmation' disabled={isSaving} ref='latest' onClick={() => this.useLatest()}>Refresh entity</button>
          <button className='button danger' disabled={isSaving} onClick={() => this.override()}>Override</button>
        </div>
      </div>
    )
  }
}
