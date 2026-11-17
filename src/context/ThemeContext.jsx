import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

function initialTheme() {
  try {
    const saved = localStorage.getItem('medibook-theme')
    if (saved) return saved
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('medibook-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
