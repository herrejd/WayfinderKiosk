/**
 * Main App Component
 * Sets up routing and core layout for the Airport Wayfinder Kiosk
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useKioskStore } from '@/store/kioskStore';
import { useGlobalErrorHandler } from '@/hooks/useGlobalErrorHandler';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { directoryService } from '@/services';
import ErrorBoundary from '@/components/ErrorBoundary';
import IdleScreen from '@/components/IdleScreen';
import GateFinder from '@/components/GateFinder';
import Directory from '@/components/Directory';
import MapView from '@/components/MapView';
import AccessibilityToolbar from '@/components/AccessibilityToolbar';

/**
 * Main application layout with routing
 */
const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const isOffline = useKioskStore((state) => state.isOffline);
  const reset = useKioskStore((state) => state.reset);
  const userPreferences = useKioskStore((state) => state.userPreferences);

  // Stable callback for timeout
  const handleTimeout = useCallback(() => {
    console.log('Inactivity timeout - returning to idle screen');
    reset();
    navigate('/');
  }, [reset, navigate]);

  // Set up inactivity timer to return to idle screen
  useInactivityTimer({
    timeout: 60000,
    onTimeout: handleTimeout,
    enabled: true,
  });

  // Apply accessibility classes to body based on user preferences
  useEffect(() => {
    if (userPreferences.accessibility.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    if (userPreferences.accessibility.largeText) {
      document.body.classList.add('large-text');
    } else {
      document.body.classList.remove('large-text');
    }
  }, [userPreferences.accessibility.highContrast, userPreferences.accessibility.largeText]);

  return (
    <div className="w-full h-full overflow-hidden bg-white">
      {/* Offline indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 z-50 text-center">
          No internet connection
        </div>
      )}

      {/* Main content */}
      <Routes>
        <Route path="/" element={<IdleScreen />} />
        <Route path="/gate-finder" element={<GateFinder />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/map" element={<MapView />} />
        <Route path="*" element={<IdleScreen />} />
      </Routes>

      {/* Accessibility Toolbar */}
      <AccessibilityToolbar />
    </div>
  );
};

/**
 * Root App Component
 * Wraps the application with error boundary and routing
 */
export const App: React.FC = () => {
  const initRef = useRef(false);

  // Set up global error handler
  useGlobalErrorHandler({
    autoReloadDelay: 3000,
    shouldAutoReload: true,
  });

  // Initialize directory service (fetch and cache POIs) at app startup
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    directoryService.initialize().catch((error) => {
      console.error('Failed to initialize directory service:', error);
    });
  }, []);

  // Set up online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online');
      useKioskStore.setState({ isOffline: false });
    };

    const handleOffline = () => {
      console.log('Connection lost');
      useKioskStore.setState({ isOffline: true });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial online status
    if (!navigator.onLine) {
      useKioskStore.setState({ isOffline: true });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ErrorBoundary>
      <HashRouter>
        <AppLayout />
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
