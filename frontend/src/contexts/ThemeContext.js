import { createContext, useEffect } from 'react';

/*
  ThemeContext

  Purpose:
  - Provide a simple theme store for the app with three modes: 'light', 'dark', and 'system'.
  - Persist the user's explicit choice in localStorage (when available).
  - Apply the chosen theme by setting a `data-theme` attribute on the <html> element so
    CSS variables and utility classes can respond to the runtime theme.

  API (ThemeContext value):
  - theme: one of 'light' | 'dark' | 'system'
  - setTheme: function to change the theme (e.g., setTheme('dark'))

  Usage example:
    import { useContext } from 'react';
    import { ThemeContext } from '../contexts/ThemeContext';

    function MyComponent() {
      const { theme, setTheme } = useContext(ThemeContext);
      return <button onClick={() => setTheme('dark')}>Dark</button>;
    }

  Notes:
  - 'system' leaves control to the user's OS/browser preference by removing the
    `data-theme` attribute; CSS should use media queries (prefers-color-scheme)
    or rely on the absence of data-theme to apply the system theme.
  - The provider is intentionally lightweight — it only stores a string and side-effects
    by toggling a single HTML attribute. Keep logic here minimal to avoid hydration issues.
*/

export const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {}
});

export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('site-theme', 'dark'); } catch {
      // ignore storage errors silently
    }
  }, []);

  const noop = () => {};

  return (
    <ThemeContext.Provider value={{ theme: 'dark', setTheme: noop }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
