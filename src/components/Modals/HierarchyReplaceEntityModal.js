import React, { Component, PropTypes } from 'react'
import { entitySets } from '../../lib/configuration'
import { connect } from 'react-redux'
import { selectors } from '../../redux/entities'
import { actions } from '../../redux/editor'

@connect((state, props) => ({
  sourceEntity: selectors.getById(state, props.options.sourceId, false),
  targetEntity: selectors.getByShortid(state, props.options.targetShortId, false),
  resolveEntityPath: (entity, ...params) => selectors.resolveEntityPath(state, entity, ...params)
}), { ...actions })
export default class HierarchyReplaceEntityModal extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }

  replace () {
    const { sourceEntity, targetEntity, options, hierarchyMove, close } = this.props
    const { existingEntity } = options

    close()

    hierarchyMove({
      id: sourceEntity._id,
      entitySet: sourceEntity.__entitySet
    }, {
      shortid: targetEntity != null ? targetEntity.shortid : null,
      children: targetEntity == null ? [existingEntity._id] : options.targetChildren
    }, options.shouldCopy, true, false)
  }

  cancel () {
    this.props.close()
  }

  componentDidMount () {
    if (!this.cancelBtn) {
      return
    }

    setTimeout(() => this.cancelBtn.focus(), 0)
  }

  render () {
    const { sourceEntity, targetEntity, resolveEntityPath, options } = this.props
    const { existingEntity, existingEntityEntitySet } = options

    if (!sourceEntity) {
      return <div />
    }

    const sourceEntityName = sourceEntity[entitySets[sourceEntity.__entitySet].nameAttribute]
    const sourceEntitySetVisibleName = entitySets[sourceEntity.__entitySet].visibleName || entitySets[sourceEntity.__entitySet].name
    const existingEntityEntitySetVisibleName = entitySets[existingEntityEntitySet].visibleName || entitySets[existingEntityEntitySet].name
    const shouldCopy = options.shouldCopy

    return (
      <div>
        <div>
          <b>{shouldCopy ? 'Copy' : 'Move'}</b> failed. Entity with name <b>{sourceEntityName}</b> already exists {targetEntity != null ? 'in target folder ' : 'at root level'}{targetEntity != null && (
            <b>{resolveEntityPath(targetEntity)}</b>
          )}.
          <br />
          <br />
          <div>
            <b>source entity: </b> {resolveEntityPath(sourceEntity)} ({sourceEntitySetVisibleName})
            <br />
            <b>target entity: </b> {resolveEntityPath(existingEntity)} ({existingEntityEntitySetVisibleName})
          </div>
          <br />
          Do you want to replace it?
        </div>
        <div className='button-bar'>
          <button className='button danger' onClick={() => this.replace()}>Yes</button>
          <button className='button confirmation' ref={(el) => { this.cancelBtn = el }} onClick={() => this.cancel()}>Cancel</button>
        </div>
      </div>
    )
  }
}
