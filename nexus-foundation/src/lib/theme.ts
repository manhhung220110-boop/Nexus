const KEY = 'nexus_theme'

export function getTheme(): 'light' | 'dark' {
  return (localStorage.getItem(KEY) as 'light' | 'dark') || 'light'
}

export function setTheme(theme: 'light' | 'dark') {
  localStorage.setItem(KEY, theme)
  document.documentElement.setAttribute('data-theme', theme)
}

export function applyStoredTheme() {
  setTheme(getTheme())
}
