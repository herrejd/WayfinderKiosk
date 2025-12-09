/**
 * React Entry Point for Airport Wayfinder Kiosk
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/i18n';
import App from '@/App';
import '@/index.css';

import { wayfinderService } from '@/services';

/**
 * Initialize services and then mount the React application
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with id "root" not found in index.html');
}

const root = ReactDOM.createRoot(rootElement);

// Initialize required services before rendering the app
(async () => {
  try {
    console.log('Initializing core services...');
    // Ensure the headless instance for data fetching is ready before the app mounts
    await wayfinderService.initHeadless();
    console.log('Core services initialized successfully.');

    // Render the app once services are ready
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize services. Application cannot start.', error);
    root.render(
      <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>
        <h1>Fatal Error</h1>
        <p>Could not initialize core application services. Please restart the application.</p>
        <p>
          <em>{error instanceof Error ? error.message : 'An unknown error occurred.'}</em>
        </p>
      </div>
    );
  }
})();
