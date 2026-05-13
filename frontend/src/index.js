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
import PublicApp from './PublicApp';
import { ToastProvider } from './contexts/ToastContext';
import ThemeProvider from './contexts/ThemeContext';
import reportWebVitals from './reportWebVitals';
import { initClsDebug } from './dev/clsDebug';
import { installApiFetchCredentials } from './setupApiFetch';
import { initAnalytics, reportWebVital } from './utils/analytics';

installApiFetchCredentials();

const root = ReactDOM.createRoot(document.getElementById('root'));
initAnalytics();

// React and providers are used directly in the render call above.
root.render(
  React.createElement(React.StrictMode, null,
      React.createElement(ThemeProvider, null,
      React.createElement(ToastProvider, null,
        React.createElement(PublicApp, null)
      )
    )
  )
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(reportWebVital);

if (typeof window !== 'undefined') {
  initClsDebug();
}
