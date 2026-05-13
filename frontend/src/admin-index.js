import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './custom-styles.css';
import AdminApp from './AdminApp';
import { ToastProvider } from './contexts/ToastContext';
import ThemeProvider from './contexts/ThemeContext';
import { installApiFetchCredentials } from './setupApiFetch';

installApiFetchCredentials();

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AdminApp />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
