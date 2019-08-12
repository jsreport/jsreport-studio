
module.exports = (themeVariablesDef, currentVariables) => {
  const inheritanceMap = Object.entries(themeVariablesDef).reduce((acu, [varName, varDef]) => {
    if (varDef.extends != null) {
      acu[varDef.extends] = acu[varDef.extends] || []
      acu[varDef.extends].push(varName)
    }

    return acu
  }, {})

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
