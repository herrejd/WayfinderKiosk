/**
 * Inactivity timer hook for the Airport Wayfinder Kiosk
 * Automatically resets the kiosk to idle state after a period of inactivity
 */

import { useEffect, useRef, useCallback } from 'react';
import { useKioskStore } from '@/store/kioskStore';

interface UseInactivityTimerOptions {
  /** Timeout duration in milliseconds (default: 60000ms = 1 minute) */
  timeout?: number;
  /** Callback to execute when timeout occurs */
  onTimeout?: () => void;
  /** Whether to enable the timer (default: true) */
  enabled?: boolean;
  /** Debug mode to log timer activity */
  debug?: boolean;
}

/**
 * Hook that tracks user inactivity and triggers a callback after a timeout
 */
export const useInactivityTimer = (options: UseInactivityTimerOptions = {}) => {
  const {
    timeout = 60000,
    onTimeout,
    enabled = true,
    debug = false,
  } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  // Keep onTimeout ref updated without causing re-renders
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Get store values - use selectors to prevent unnecessary re-renders
  const isNavigating = useKioskStore((state) => state.isNavigating);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();

    if (debug) {
      console.log('Inactivity timer started');
    }

    timeoutRef.current = setTimeout(() => {
      if (debug) {
        console.log('Inactivity timeout triggered');
      }
      onTimeoutRef.current?.();
    }, timeout);
  }, [timeout, debug, clearTimer]);

  // Handle user interaction - reset timer
  const handleInteraction = useCallback(() => {
    if (!enabled || isNavigating) return;

    if (debug) {
      console.log('User interaction detected, resetting timer');
    }
    startTimer();
  }, [enabled, isNavigating, debug, startTimer]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }

    // Start initial timer
    if (!isNavigating) {
      startTimer();
    }

    // Add event listeners
    // Note: mousemove intentionally excluded - it fires too frequently and
    // isn't meaningful interaction on a kiosk. touchstart/click/keydown cover
    // all intentional user interactions.
    const events = ['touchstart', 'click', 'keydown'];
    events.forEach((event) => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
      clearTimer();
    };
  }, [enabled, isNavigating, startTimer, handleInteraction, clearTimer]);

  return {
    resetTimer: handleInteraction,
    pauseTimer: clearTimer,
    resumeTimer: startTimer,
  };
};
