import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useKioskStore } from '@/store/kioskStore';
import { useKeyboard, useKeyboardInput } from '@/context/KeyboardContext';

// Background images to cycle through
const BACKGROUND_IMAGES = [
  '/assets/Airportbackdrop.png',
  '/assets/AirportInterior.png',
  '/assets/AirportTarmac.png',
];

const CYCLE_INTERVAL = 8000; // 8 seconds between transitions
const TRANSITION_DURATION = 1500; // 1.5 second crossfade

export const IdleScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const setView = useKioskStore((state) => state.setView);
  const setMapVisible = useKioskStore((state) => state.setMapVisible);
  const setFlightSearchQuery = useKioskStore((state) => state.setFlightSearchQuery);
  const setLanguage = useKioskStore((state) => state.setLanguage);
  const language = useKioskStore((state) => state.language);

  const [flightNumber, setFlightNumber] = useState('');
  const { isVisible: isKeyboardVisible } = useKeyboard();
  const inputRef = useRef<HTMLInputElement>(null);

  const { handleFocus } = useKeyboardInput(inputRef, flightNumber, setFlightNumber);

  // Background image cycling state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Cycle through background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const handleExploreMap = () => {
    setView('map');
    setMapVisible(true);
  };

  const handleDirectory = () => {
    setView('directory');
  };

  const handleFlightSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = flightNumber.trim();
    if (!trimmedQuery) return;

    // Split concatenated airline codes and flight numbers (e.g., BA2011 -> BA 2011)
    const regex = /^([A-Z]{2})(\d+)$/i;
    const match = trimmedQuery.match(regex);
    let formattedQuery;

    if (match) {
      formattedQuery = `${match[1].toUpperCase()} ${match[2]}`;
    } else {
      formattedQuery = trimmedQuery;
    }

    console.log(`[IdleScreen] Flight search submitted: "${formattedQuery}"`);
    setFlightSearchQuery(formattedQuery);
    setView('map');
    setMapVisible(true);
  };

  const handleLanguageChange = (lang: 'en' | 'es' | 'fr') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  // Calculate dynamic padding for keyboard
  const keyboardPadding = useMemo(() => {
    return isKeyboardVisible ? 'pb-[300px]' : 'pb-0';
  }, [isKeyboardVisible]);

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center touch-none select-none relative overflow-hidden">
      {/* Background image layers for crossfade effect */}
      {BACKGROUND_IMAGES.map((image, index) => (
        <div
          key={image}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity ease-in-out"
          style={{
            backgroundImage: `url('${image}')`,
            opacity: index === currentImageIndex ? 1 : 0,
            transitionDuration: `${TRANSITION_DURATION}ms`,
            zIndex: 0,
          }}
          aria-hidden="true"
        />
      ))}

      {/* Gradient overlay for better text readability */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-900/40"
        style={{ zIndex: 1 }}
        aria-hidden="true"
      />

      <header className="absolute top-8 text-center" style={{ zIndex: 2 }}>
        <h1 className="text-6xl font-bold text-white drop-shadow-lg">
          {t('idle.title')}
        </h1>
        <p className="text-2xl text-white/90 mt-2 drop-shadow-md">
          {t('idle.subtitle')}
        </p>
      </header>

      {/* Main Action Buttons */}
      <main className={`flex flex-col gap-8 mt-16 transition-all duration-300 ${keyboardPadding} relative z-10`}>
        <button
          onClick={handleExploreMap}
          className="min-w-[400px] min-h-[140px] bg-white text-blue-700 text-4xl font-bold rounded-3xl shadow-2xl hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/50"
          aria-label={t('idle.findGate')}
        >
          <span className="flex items-center justify-center gap-4">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            {t('idle.findGate')}
          </span>
        </button>

        <button
          onClick={handleDirectory}
          className="min-w-[400px] min-h-[140px] bg-white/90 text-blue-700 text-4xl font-bold rounded-3xl shadow-2xl hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-white/50"
          aria-label={t('idle.directory')}
        >
          <span className="flex items-center justify-center gap-4">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            {t('idle.directory')}
          </span>
        </button>

        {/* Flight Search Box */}
        <form onSubmit={handleFlightSearch} className="mt-8">
          <label htmlFor="flight-search" className="text-xl text-white mb-2 block text-center drop-shadow-md">
            {t('gateFinder.manualEntry')}
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="flight-search"
              type="text"
              value={flightNumber}
              onFocus={handleFocus}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              placeholder={t('gateFinder.flightPlaceholder')}
              className="w-full h-16 px-6 text-2xl text-gray-800 bg-white border-2 border-white rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-white/50"
            />
            <button
              type="submit"
              className="h-16 px-8 bg-white text-blue-700 font-bold text-2xl rounded-xl shadow-lg hover:bg-blue-50 active:scale-95 transition-all"
              aria-label={t('common.search')}
            >
              {t('common.search')}
            </button>
          </div>
        </form>
      </main>

      {/* Language Selector and Touch Prompt */}
      <footer className="absolute bottom-8 flex flex-col items-center gap-4 z-10">
        <div className="flex gap-4">
          {(['en', 'es', 'fr'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-6 py-3 rounded-lg text-xl font-semibold transition-all ${
                language === lang
                  ? 'bg-white text-blue-700 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              aria-pressed={language === lang}
              aria-label={`Switch language to ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : 'French'}`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="text-white/80 text-xl animate-pulse mt-4 drop-shadow-md">
          {t('idle.touchPrompt')}
        </div>
      </footer>
    </div>
  );
};

export default IdleScreen;
