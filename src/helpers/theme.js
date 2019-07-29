import { extensions } from '../lib/configuration.js'
import resolveUrl from './resolveUrl.js'

function getCurrentTheme () {
  const defaultTheme = extensions.studio.options.theme
  let currentTheme = defaultTheme
  let userTheme = window.localStorage.getItem('studioTheme')

  if (userTheme != null) {
    currentTheme = userTheme
  }

  return currentTheme
}

function setCurrentTheme (themeName, { onLoad, onError } = {}) {
  const themeLinks = Array.prototype.slice.call(document.querySelectorAll('link[data-jsreport-studio-theme]'))
  const defaultThemeLink = themeLinks.find((l) => l.dataset.defaultJsreportStudioTheme === 'true' || l.dataset.defaultJsreportStudioTheme === true)
  let targetThemeLink = themeLinks.find((l) => l.dataset.jsreportStudioTheme === themeName)

  if (!defaultThemeLink) {
    return
  }

  if (!targetThemeLink) {
    const newThemeLink = document.createElement('link')

    newThemeLink.rel = 'stylesheet'
    newThemeLink.href = resolveUrl(`/studio/assets/alternativeTheme.css?name=${themeName}`)
    newThemeLink.disabled = false
    newThemeLink.dataset.jsreportStudioTheme = themeName

    newThemeLink.onload = () => {
      changeTheme()

      if (onLoad) {
        onLoad()
      }
    }

    newThemeLink.onerror = () => {
      if (onError) {
        onError()
      }
    }

    defaultThemeLink.parentNode.insertBefore(newThemeLink, defaultThemeLink.nextSibling)

    themeLinks.push(newThemeLink)

    targetThemeLink = newThemeLink
  } else {
    changeTheme()

    if (onLoad) {
      onLoad()
    }
  }

  function changeTheme () {
    const currentTheme = getCurrentTheme()

    if (targetThemeLink.dataset.jsreportStudioTheme !== currentTheme) {
      targetThemeLink.disabled = false

      themeLinks.forEach((l) => {
        if (l.dataset.jsreportStudioTheme !== themeName) {
          l.disabled = true
        }
      })
    }

    window.localStorage.setItem('studioTheme', themeName)
  }
}

export { getCurrentTheme }
export { setCurrentTheme }
