/**
 * AccessibilityToolbar Component
 * Provides accessibility controls for high contrast, large text, and audio feedback
 * Fixed position floating toolbar with expandable panel
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useKioskStore } from '@/store/kioskStore';
import { audioService } from '@/services';

/**
 * Accessibility Toolbar Component
 * Located at bottom-right of screen with floating button that expands to show options
 */
export const AccessibilityToolbar: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const userPreferences = useKioskStore((state) => state.userPreferences);
  const setUserPreferences = useKioskStore((state) => state.setUserPreferences);

  const handleHighContrastToggle = () => {
    audioService.click();
    setUserPreferences({
      accessibility: {
        ...userPreferences.accessibility,
        highContrast: !userPreferences.accessibility.highContrast,
      },
    });
    // Body class is applied by App.tsx useEffect (single source of truth)
  };

  const handleLargeTextToggle = () => {
    audioService.click();
    setUserPreferences({
      accessibility: {
        ...userPreferences.accessibility,
        largeText: !userPreferences.accessibility.largeText,
      },
    });
    // Body class is applied by App.tsx useEffect (single source of truth)
  };

  const handleAudioToggle = () => {
    audioService.click();
    setUserPreferences({
      audioEnabled: !userPreferences.audioEnabled,
    });
  };

  return (
    <>
      {/* Floating toolbar panel */}
      {isOpen && (
        <div
          className="fixed bottom-36 left-6 bg-white border-2 border-gray-800 rounded-lg shadow-lg p-4 z-40"
          role="region"
          aria-label="Accessibility options"
        >
          <div className="flex flex-col gap-4 min-w-max">
            {/* High Contrast Button */}
            <button
              onClick={handleHighContrastToggle}
              aria-pressed={userPreferences.accessibility.highContrast}
              aria-label={
                userPreferences.accessibility.highContrast
                  ? 'High contrast mode enabled. Click to disable'
                  : 'High contrast mode disabled. Click to enable'
              }
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors min-h-[48px] ${
                userPreferences.accessibility.highContrast
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              <span className="text-xl">◐</span>
              <span>{t('accessibility.highContrast')}</span>
            </button>

            {/* Large Text Button */}
            <button
              onClick={handleLargeTextToggle}
              aria-pressed={userPreferences.accessibility.largeText}
              aria-label={
                userPreferences.accessibility.largeText
                  ? 'Large text mode enabled. Click to disable'
                  : 'Large text mode disabled. Click to enable'
              }
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors min-h-[48px] ${
                userPreferences.accessibility.largeText
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              <span className="text-xl">A+</span>
              <span>{t('accessibility.largeText')}</span>
            </button>

            {/* Audio Feedback Button */}
            <button
              onClick={handleAudioToggle}
              aria-pressed={userPreferences.audioEnabled}
              aria-label={
                userPreferences.audioEnabled
                  ? 'Audio feedback enabled. Click to disable'
                  : 'Audio feedback disabled. Click to enable'
              }
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors min-h-[48px] ${
                userPreferences.audioEnabled
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              <span className="text-xl">🔊</span>
              <span>{t('accessibility.audioFeedback')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={
          isOpen
            ? 'Close accessibility options panel'
            : 'Open accessibility options panel'
        }
        className="fixed bottom-20 left-6 w-16 h-16 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg flex items-center justify-center transition-colors z-40 font-bold text-2xl min-h-[48px] min-w-[48px]"
        title="Accessibility Options"
      >
        ♿
      </button>
    </>
  );
};

export default AccessibilityToolbar;
