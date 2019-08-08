
const inheritanceMap = {
  'primary-color': [
    'table-color',
    'table-selection-color',
    'property-title-color',
    'contextMenu-button-color',
    'modal-color',
    'modal-close-hover-color',
    'entityTree-color'
  ],
  'primary-backgroundColor': [
    'table-heading-backgroundColor',
    'table-row-backgroundColor',
    'controls-backgroundColor',
    'entityTree-button-hover-backgroundColor',
    'popover-backgroundColor'
  ],
  'primary-selection-backgroundColor': [
    'headings-color',
    'controls-hover-borderColor',
    'resizer-icons-hover-color',
    'tab-title-active-backgroundColor',
    'property-title-expanded-backgroundColor',
    'entityTree-node-active-backgroundColor',
    'entityTree-collapseIcon-color',
    'entityTree-collapseIcon-hover-color',
    'entityTree-button-active-borderColor'
  ],
  'primary-selection-color': [
    'button-color',
    'table-row-borderColor',
    'resizer-paneHolder-color',
    'tab-title-active-color',
    'entityTree-node-active-color',
    'entityTree-node-hover-color',
    'toolbar-color'
  ],
  'primary-hover-color': [
    'table-row-active-color',
    'table-row-hover-color',
    'toolbar-button-hover-color',
    'tab-title-hover-color',
    'property-heading-color',
    'controls-list-hover-color'
  ],
  'primary-hover-backgroundColor': [
    'table-row-active-backgroundColor',
    'resizer-collapsed-hover-backgroundColor',
    'toolbar-button-hover-backgroundColor',
    'toolbar-popup-hover-backgroundColor',
    'tab-titles-borderColor',
    'tab-title-hover-backgroundColor',
    'property-heading-backgroundColor',
    'entityTree-icon-hover-color'
  ],
  'secondary-color': [
    'modal-close-color',
    'resizer-icons-color',
    'entityFinder-results-borderColor',
    'entityTree-icon-color',
    'resizer-collapsed-backgroundColor',
    'toolbar-button-disabled-color',
    'tab-close-color'
  ],
  'secondary-backgroundColor': [
    'modal-backgroundColor',
    'property-panel-backgroundColor',
    'entityTree-button-backgroundColor',
    'entityTree-backgroundColor'
  ],
  'secondary-hover-backgroundColor': [
    'table-row-hover-backgroundColor',
    'entityTree-node-hover-backgroundColor',
    'tab-close-hover-backgroundColor',
    'controls-list-hover-backgroundColor'
  ],
  'alternative-backgroundColor': [
    'toolbar-backgroundColor',
    'entityTree-outlineColor'
  ],
  'toolbar-backgroundColor': [
    'toolbar-target-backgroundColor'
  ]
}

module.exports = (currentVariables) => {
  const variables = Object.assign({}, currentVariables)

  Object.entries(inheritanceMap).map(([genericName, vars]) => {
    vars.forEach((varName) => {
      if (variables[varName] == null) {
        variables[varName] = variables[genericName]
      }
    })
  })

  return variables
}
