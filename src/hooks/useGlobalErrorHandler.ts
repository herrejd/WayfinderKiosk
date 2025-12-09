/**
 * Global error handler hook for the Airport Wayfinder Kiosk
 * Catches unhandled errors and unhandled promise rejections
 * Auto-reloads the page after 3 seconds on critical errors
 */

import { useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore';

interface UseGlobalErrorHandlerOptions {
  autoReloadDelay?: number;
  shouldAutoReload?: boolean;
  onError?: (error: Error, isUnhandledRejection: boolean) => void;
}

/**
 * Hook that sets up global error handling
 * Listens for window.onerror and unhandledrejection events
 * Automatically reloads the page after a delay if enabled
 *
 * @param options Configuration options for error handling behavior
 */
export const useGlobalErrorHandler = (
  options: UseGlobalErrorHandlerOptions = {}
) => {
  const {
    autoReloadDelay = 3000,
    shouldAutoReload = true,
    onError,
  } = options;

  const setErrorMessage = useKioskStore((state) => state.setErrorMessage);

  useEffect(() => {
    let reloadTimeout: ReturnType<typeof setTimeout>;

    /**
     * Handle uncaught errors
     */
    const handleError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);

      console.error('Uncaught error:', error);
      console.error('File:', event.filename, 'Line:', event.lineno);

      // Update store with error message
      setErrorMessage(
        `Error: ${error.message || 'An unexpected error occurred'}`
      );

      // Call custom error handler if provided
      if (onError) {
        onError(error, false);
      }

      // Auto-reload if enabled
      if (shouldAutoReload) {
        console.warn(
          `Reloading page in ${autoReloadDelay}ms due to critical error`
        );
        reloadTimeout = setTimeout(() => {
          window.location.reload();
        }, autoReloadDelay);
      }
    };

    /**
     * Handle unhandled promise rejections
     */
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));

      console.error('Unhandled promise rejection:', error);

      // Update store with error message
      setErrorMessage(
        `Promise error: ${error.message || 'An unexpected error occurred'}`
      );

      // Call custom error handler if provided
      if (onError) {
        onError(error, true);
      }

      // Auto-reload if enabled
      if (shouldAutoReload) {
        console.warn(
          `Reloading page in ${autoReloadDelay}ms due to unhandled rejection`
        );
        reloadTimeout = setTimeout(() => {
          window.location.reload();
        }, autoReloadDelay);
      }

      // Prevent the browser's default unhandled rejection handling
      event.preventDefault();
    };

    /**
     * Handle visibility change to reset error message when user returns
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear error message when user comes back to the page
        setErrorMessage(null);
      }
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Clear any pending reload timeout
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
    };
  }, [setErrorMessage, autoReloadDelay, shouldAutoReload, onError]);
};

/**
 * Manual error throwing utility for catching errors in async contexts
 * @param error The error to log and track
 * @param context Optional context information about where error occurred
 */
export const logKioskError = (
  error: Error | unknown,
  context?: Record<string, unknown>
) => {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  console.error('Kiosk error:', {
    message: errorObj.message,
    stack: errorObj.stack,
    context,
  });

  // Update store with error message
  useKioskStore.setState({
    errorMessage: `Error: ${errorObj.message}`,
  });
};
