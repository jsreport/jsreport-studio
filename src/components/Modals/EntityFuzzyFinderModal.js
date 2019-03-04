import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import fuzzyFilterFactory from 'react-fuzzy-filter'
import { selectors as entitiesSelector } from '../../redux/entities'
import { actions as editorActions } from '../../redux/editor'
import { entitySets, entityTreeIconResolvers } from '../../lib/configuration'
import styles from './EntityFuzzyFinderModal.scss'

const { InputFilter, FilterResults } = fuzzyFilterFactory()

const fuseConfig = {
  shouldSort: true,
  includeScore: true,
  includeMatches: true,
  keys: ['path', 'name']
}

const resolveEntityTreeIconStyle = (entity) => {
  for (const k in entityTreeIconResolvers) {
    const mode = entityTreeIconResolvers[k](entity)
    if (mode) {
      return mode
    }
  }

  return null
}

class EntityFuzzyFinderModal extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }

  constructor (props) {
    super(props)

    this.state = {
      selectedIndex: 0
    }

    this.lastResults = null

    this.setInputNode = this.setInputNode.bind(this)
    this.setResulItemNode = this.setResulItemNode.bind(this)
    this.getItem = this.getItem.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.renderResults = this.renderResults.bind(this)
  }

  componentDidMount () {
    setTimeout(() => this.inputNode.focus(), 0)
  }

  setInputNode (el) {
    this.inputNode = el
  }

  setResulItemNode (el, idx) {
    this[`resultItemNode${idx}`] = el
  }

  getItem (itemResult) {
    return itemResult.hasOwnProperty('_id') ? itemResult : itemResult.item
  }

  openEntity (entity) {
    this.props.openTab({ _id: entity._id })
    this.props.close()
  }

  handleKeyDown (ev) {
    const lastResults = this.lastResults
    const { selectedIndex } = this.state
    const { close } = this.props
    const scrollOpts = { block: 'nearest', inline: 'nearest' }

    if (ev.keyCode === 40 && selectedIndex < lastResults.length - 1) {
      ev.preventDefault()
      ev.stopPropagation()

      const newIndex = selectedIndex + 1

      // up arrow
      this.setState({
        selectedIndex: newIndex
      })

      this[`resultItemNode${newIndex}`].scrollIntoView(scrollOpts)
    } else if (ev.keyCode === 38 && selectedIndex > 0) {
      ev.preventDefault()
      ev.stopPropagation()

      const newIndex = selectedIndex - 1

      // down arrow
      this.setState({
        selectedIndex: newIndex
      })

      this[`resultItemNode${newIndex}`].scrollIntoView(scrollOpts)
    } else if (ev.keyCode === 13) {
      ev.preventDefault()
      ev.stopPropagation()

      // enter
      if (lastResults[selectedIndex]) {
        this.openEntity(this.getItem(lastResults[selectedIndex]).entity)
      }

      this.setState({
        selectedIndex: 0
      })

      close()
    }
  }

  renderItemName (item, keyMatch) {
    const parentPath = `/${item.path.split('/').slice(1, -1).join('/')}`
    const elements = []

    if (keyMatch) {
      // +1 because the "/" at the end was removed
      const nameStartIndex = parentPath === '/' ? 1 : parentPath.length + 1
      const nameIndices = []
      const nameElements = []
      const pathIndices = []
      const pathElements = []

      keyMatch.indices.forEach((ind) => {
        const maxIndexForPath = parentPath.length - 1
        const maxIndexForName = item.path.length - 1

        const inRangeOfName = (
          ind[1] >= nameStartIndex &&
          ind[1] <= maxIndexForName
        )

        const inRangeOfFullPath = (
          ind[0] >= 0 &&
          ind[0] <= maxIndexForPath
        )

        if (inRangeOfName) {
          // we substract "- nameStartIndex" here because the indices must be relative
          // to item.name string
          nameIndices.push([
            (ind[0] <= nameStartIndex ? nameStartIndex : ind[0]) - nameStartIndex,
            ind[1] - nameStartIndex
          ])
        }

        if (inRangeOfFullPath) {
          pathIndices.push([ind[0], ind[1] >= maxIndexForPath ? maxIndexForPath : ind[1]])
        }
      })

      if (nameIndices.length > 0) {
        const maxIndexForName = item.name.length - 1
        let lastNameIndex = 0

        nameIndices.forEach(([indexStart, indexEnd], idx) => {
          if (lastNameIndex !== indexStart) {
            nameElements.push(
              <span key={`entity-name${lastNameIndex}/${indexStart - 1}`}>
                {item.name.slice(lastNameIndex, indexStart)}
              </span>
            )
          }

          nameElements.push(
            <span key={`entity-name${indexStart}/${indexEnd}`} style={{ color: '#000' }}>
              <strong>{item.name.slice(indexStart, indexEnd + 1)}</strong>
            </span>
          )

          lastNameIndex = indexEnd + 1

          if (idx === nameIndices.length - 1) {
            const resString = item.name.slice(lastNameIndex, maxIndexForName + 1)

            if (resString !== '') {
              nameElements.push(
                <span key={`entity-name${lastNameIndex}/${maxIndexForName}`}>
                  {resString}
                </span>
              )
            }
          }
        })
      } else {
        nameElements.push(
          item.name
        )
      }

      if (pathIndices.length > 0) {
        const maxIndexForPath = parentPath.length - 1
        let lastPathIndex = 0

        pathIndices.forEach(([indexStart, indexEnd], idx) => {
          if (lastPathIndex !== indexStart) {
            pathElements.push(
              <span key={`entity-path${lastPathIndex}/${indexStart - 1}`}>
                {parentPath.slice(lastPathIndex, indexStart)}
              </span>
            )
          }

          pathElements.push(
            <span key={`entity-path${indexStart}/${indexEnd}`}>
              <strong>{parentPath.slice(indexStart, indexEnd + 1)}</strong>
            </span>
          )

          lastPathIndex = indexEnd + 1

          if (idx === pathIndices.length - 1) {
            const resString = parentPath.slice(lastPathIndex, maxIndexForPath + 1)

            if (resString !== '') {
              pathElements.push(
                <span key={`entity-path${lastPathIndex}/${maxIndexForPath}`}>
                  {resString}
                </span>
              )
            }
          }
        })
      } else {
        pathElements.push(
          parentPath
        )
      }

      elements.push(
        <span key='entity-name'>{nameElements}</span>
      )

      elements.push(
        <span key='entity-path' className={styles.resultsItemPath}>{pathElements}</span>
      )
    } else {
      elements.push(
        <span key='entity-name'>{item.name}</span>
      )

      elements.push(
        <span key='entity-path' className={styles.resultsItemPath}>{parentPath}</span>
      )
    }

    return elements
  }

  renderResults (filteredItems) {
    // limit results to max 10 items
    const itemsToRender = filteredItems.slice(0, 10)
    const { selectedIndex } = this.state
    let content

    this.lastResults = itemsToRender

    if (itemsToRender.length > 0) {
      content = itemsToRender.map((current, idx) => {
        const item = this.getItem(current)
        const isActive = selectedIndex === idx
        const iconStyle = resolveEntityTreeIconStyle(item.entity) || (entitySets[item.entity.__entitySet].faIcon || styles.resultsItemDefaultIcon)
        const keyMatch = (current.hasOwnProperty('_id') ? [] : current.matches).find((m) => m.key === 'path')

        return (
          <div
            key={item.path}
            className={`${styles.resultsItem} ${isActive ? styles.active : ''}`}
            title={item.path}
            ref={(el) => this.setResulItemNode(el, idx)}
            onClick={() => this.openEntity(item.entity)}
          >
            {iconStyle && (
              <i key='entity-icon' className={`${styles.resultsItemIcon} fa ${iconStyle || ''}`} />
            )}
            {this.renderItemName(item, keyMatch)}
          </div>
        )
      })
    } else {
      content = (
        <div key='no-results' className={styles.resultsItem}>
          <span className={styles.emptyResults}><i>No results</i></span>
        </div>
      )
    }

    return (
      <div className={styles.results}>
        {content}
      </div>
    )
  }

  render () {
    const { entities } = this.props

    return (
      <div className={styles.container}>
        <div onKeyDown={this.handleKeyDown}>
          <InputFilter
            debounceTime={200}
            onChange={() => this.setState({ selectedIndex: 0 })}
            inputProps={{
              ref: this.setInputNode,
              placeholder: 'Ex: Orders, Invoice, /samples, /samples/Population',
              className: styles.input
            }}
          />
          <FilterResults
            items={entities}
            fuseConfig={fuseConfig}
          >
            {this.renderResults}
          </FilterResults>
        </div>
      </div>
    )
  }
}

export default Object.assign(connect((state) => ({
  entities: entitiesSelector.getNormalizedEntities(state)
}), {
  openTab: editorActions.openTab
})(EntityFuzzyFinderModal), { frameless: true })
