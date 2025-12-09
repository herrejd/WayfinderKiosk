/**
 * Zustand store for Airport Wayfinder Kiosk global state management
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { POI, UserPreferences } from '../types/wayfinder';

/**
 * Type definitions for the Kiosk store state
 */
export type ViewType = 'idle' | 'gate-finder' | 'directory' | 'map';

export interface KioskState {
  // State properties
  currentView: ViewType;
  selectedPOI: POI | null;
  lastInteraction: Date;
  language: 'en' | 'es' | 'fr';
  isNavigating: boolean;
  isOffline: boolean;
  userPreferences: UserPreferences;
  errorMessage: string | null;
  isLoading: boolean;

  // Actions
  setView: (view: ViewType) => void;
  selectPOI: (poi: POI | null) => void;
  updateInteraction: () => void;
  setLanguage: (language: 'en' | 'es' | 'fr') => void;
  setNavigating: (isNavigating: boolean) => void;
  setOffline: (isOffline: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setUserPreferences: (preferences: Partial<UserPreferences>) => void;
  reset: () => void;
}

/**
 * Default user preferences
 */
const defaultUserPreferences: UserPreferences = {
  language: 'en',
  accessibility: {
    highContrast: false,
    largeText: false,
  },
  audioEnabled: true,
};

/**
 * Initial state for the Kiosk store
 */
const initialState: Omit<
  KioskState,
  | 'setView'
  | 'selectPOI'
  | 'updateInteraction'
  | 'setLanguage'
  | 'setNavigating'
  | 'setOffline'
  | 'setErrorMessage'
  | 'setLoading'
  | 'setUserPreferences'
  | 'reset'
> = {
  currentView: 'idle',
  selectedPOI: null,
  lastInteraction: new Date(),
  language: 'en',
  isNavigating: false,
  isOffline: false,
  userPreferences: defaultUserPreferences,
  errorMessage: null,
  isLoading: false,
};

/**
 * Create the Kiosk store with Zustand
 * Includes devtools for debugging and persist middleware for local storage
 */
export const useKioskStore = create<KioskState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        /**
         * Set the current view/screen
         */
        setView: (view: ViewType) => {
          set(
            { currentView: view },
            false,
            { type: 'setView', payload: view }
          );
        },

        /**
         * Select a POI or clear selection
         */
        selectPOI: (poi: POI | null) => {
          set(
            { selectedPOI: poi },
            false,
            { type: 'selectPOI', payload: poi }
          );
        },

        /**
         * Update the last interaction timestamp
         * Used for inactivity detection
         */
        updateInteraction: () => {
          set(
            { lastInteraction: new Date() },
            false,
            { type: 'updateInteraction' }
          );
        },

        /**
         * Set the language preference
         */
        setLanguage: (language: 'en' | 'es' | 'fr') => {
          set(
            (state) => ({
              language,
              userPreferences: {
                ...state.userPreferences,
                language,
              },
            }),
            false,
            { type: 'setLanguage', payload: language }
          );
        },

        /**
         * Set navigation state
         * When true, inactivity timer is paused
         */
        setNavigating: (isNavigating: boolean) => {
          set(
            { isNavigating },
            false,
            { type: 'setNavigating', payload: isNavigating }
          );
        },

        /**
         * Set offline status
         */
        setOffline: (isOffline: boolean) => {
          set(
            { isOffline },
            false,
            { type: 'setOffline', payload: isOffline }
          );
        },

        /**
         * Set error message for display
         */
        setErrorMessage: (message: string | null) => {
          set(
            { errorMessage: message },
            false,
            { type: 'setErrorMessage', payload: message }
          );
        },

        /**
         * Set global loading state
         */
        setLoading: (isLoading: boolean) => {
          set(
            { isLoading },
            false,
            { type: 'setLoading', payload: isLoading }
          );
        },

        /**
         * Update user preferences
         */
        setUserPreferences: (preferences: Partial<UserPreferences>) => {
          set(
            (state) => ({
              userPreferences: {
                ...state.userPreferences,
                ...preferences,
              },
            }),
            false,
            { type: 'setUserPreferences', payload: preferences }
          );
        },

        /**
         * Reset store to initial state
         * Used for inactivity timeout and error recovery
         */
        reset: () => {
          set(initialState, false, { type: 'reset' });
        },
      }),
      {
        name: 'kiosk-store',
        // Only persist user preferences across sessions
        partialize: (state) => ({
          userPreferences: state.userPreferences,
        }),
      }
    ),
    {
      name: 'KioskStore',
    }
  )
);

/**
 * Selector hooks for accessing specific parts of the store
 */

export const useCurrentView = () => useKioskStore((state) => state.currentView);
export const useSelectedPOI = () => useKioskStore((state) => state.selectedPOI);
export const useLastInteraction = () =>
  useKioskStore((state) => state.lastInteraction);
export const useLanguage = () => useKioskStore((state) => state.language);
export const useIsNavigating = () =>
  useKioskStore((state) => state.isNavigating);
export const useIsOffline = () => useKioskStore((state) => state.isOffline);
export const useUserPreferences = () =>
  useKioskStore((state) => state.userPreferences);
export const useErrorMessage = () =>
  useKioskStore((state) => state.errorMessage);
export const useIsLoading = () => useKioskStore((state) => state.isLoading);
