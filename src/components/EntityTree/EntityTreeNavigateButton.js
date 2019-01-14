import React from 'react'
import EntityTreeButton from './EntityTreeButton'
import EntityFuzzyFinderModal from '../Modals/EntityFuzzyFinderModal.js'
import { modalHandler } from '../../lib/configuration.js'

export default () => (
  <EntityTreeButton onClick={() => modalHandler.open(EntityFuzzyFinderModal, {})}>
    <i className='fa fa-arrow-right' title='Navigate CTRL+P' />
  </EntityTreeButton>
)
