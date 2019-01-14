import React, { Component } from 'react'
import { connect } from 'react-redux'
import { modalHandler } from '../../../lib/configuration.js'
import { selectors as entitiesSelectors } from '../../../redux/entities'
import { actions } from '../../../redux/editor'
import EntityTreeSelectionModal from '../../Modals/EntityTreeSelectionModal.js'
import styles from './EntityRefSelect.scss'

const SelectInput = ({ textToShow, entity, handleOpenTree, openTab }) => (
  <div className={styles.selectInput} onClick={() => handleOpenTree()}>
    <i className='fa fa-pencil-square-o' />
    <span
      title={textToShow}
      className={textToShow ? styles.link : ''}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()

        if (entity) {
          openTab(entity)
        } else {
          handleOpenTree()
        }
      }}
    >
      {textToShow || 'select ...'}
    </span>
  </div>
)

class EntityRefSelect extends Component {
  constructor (props) {
    super(props)

    this.handleOpenTree = this.handleOpenTree.bind(this)
    this.renderSelectedControl = this.renderSelectedControl
  }

  handleOpenTree () {
    const { onChange } = this.props

    modalHandler.open(EntityTreeSelectionModal, {
      headingLabel: this.props.headingLabel,
      filter: this.props.filter,
      selectableFilter: this.props.selectableFilter,
      selected: this.props.value,
      multiple: this.props.multiple === true,
      onSave: (selected) => onChange(selected)
    })
  }

  render () {
    const {
      value,
      multiple = false,
      getEntityByShortid,
      resolveEntityPath
    } = this.props

    let currentValue

    if (value != null) {
      currentValue = multiple === true ? value : [value]
    }

    if (!multiple) {
      let textToShow
      let entity

      if (currentValue != null && currentValue[0] != null) {
        entity = getEntityByShortid(currentValue[0], false)

        if (!entity) {
          textToShow = ''
        } else {
          textToShow = resolveEntityPath(entity)
        }
      } else {
        textToShow = ''
      }

      return <SelectInput
        textToShow={textToShow}
        handleOpenTree={this.handleOpenTree}
        entity={entity}
        openTab={this.props.openTab}
      />
    }

    let items = []

    if (currentValue) {
      currentValue.forEach((eShortid) => {
        const entity = getEntityByShortid(eShortid, false)

        if (!entity) {
          return
        }

        const namePath = resolveEntityPath(entity)

        items.push(
          <li key={namePath} title={namePath} onClick={() => this.props.openTab(entity)}>
            <span>{namePath}</span>
          </li>
        )
      })
    }

    return (
      <div className={styles.select}>
        <SelectInput
          handleOpenTree={this.handleOpenTree}
          openTab={this.props.openTab}
        />
        <ul tabIndex='0'>
          {items}
        </ul>
      </div>
    )
  }
}

export default connect(
  (state) => ({
    getEntityByShortid: (shortid, ...params) => entitiesSelectors.getByShortid(state, shortid, ...params),
    resolveEntityPath: (_id, ...params) => entitiesSelectors.resolveEntityPath(state, _id, ...params)
  }), { openTab: actions.openTab }
)(EntityRefSelect)
