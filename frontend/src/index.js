/*
  Purpose:
  - Application entrypoint. Mounts the React tree, wires global providers
    (Theme + Toast) and configures performance reporting.

  Contract:
  - Wrap the app in `ThemeProvider` (applies CSS tokens and persisted theme)
    and `ToastProvider` (global toast notifications).

  Notes:
  - Avoid introducing heavy logic here. If you need global initialization
    make it idempotent and side-effect-free where possible.
*/

// Import React here so ESLint/react rules that expect React in scope for JSX
// (depending on parser/config) are satisfied. CRA's automatic runtime works
// without this, but some lint setups still expect the symbol to exist.
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './custom-styles.css';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';
import ThemeProvider from './contexts/ThemeContext';
import reportWebVitals from './reportWebVitals';
import { API_BASE } from './config/api';

// Ensure API requests to our backend include credentials so admin cookies are
// sent with requests from the admin UI (dev convenience). This wraps the
// global fetch and adds `credentials: 'include'` for requests targeting the
// configured API base URL. It is safe to keep this in development; in
// production a proper auth flow should be used.
if (typeof window !== 'undefined' && window.fetch) {
  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : (input && input.url);
      if (url && url.startsWith(API_BASE)) {
        // Merge credentials option but do not overwrite if caller explicitly set it
        if (!init || typeof init.credentials === 'undefined') {
          init = Object.assign({}, init, { credentials: 'include' });
        }
      }
    } catch (e) {
      // ignore and fall back to default fetch
    }
    return origFetch(input, init);
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
// React and providers are used directly in the render call above.
root.render(
  React.createElement(React.StrictMode, null,
    React.createElement(ThemeProvider, null,
      React.createElement(ToastProvider, null,
        React.createElement(App, null)
      )
    )
  )
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
