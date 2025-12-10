/**
 * React Entry Point for Airport Wayfinder Kiosk
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/i18n';
import App from '@/App';
import '@/index.css';

/**
 * Mount the React application to the DOM
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with id "root" not found in index.html');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

