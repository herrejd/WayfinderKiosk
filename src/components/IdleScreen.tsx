/**
 * Idle Screen Component
 * Main welcome/attract screen for the Airport Wayfinder Kiosk
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useKioskStore } from '@/store/kioskStore';

export const IdleScreen: React.FC = () => {
  const navigate = useNavigate();
  const setLanguage = useKioskStore((state) => state.setLanguage);
  const language = useKioskStore((state) => state.language);

  const handleGateFinder = () => {
    navigate('/map');
  };

  const handleDirectory = () => {
    navigate('/directory');
  };

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 touch-none select-none"
    >
      {/* Header */}
      <header className="absolute top-8 text-center">
        <h1 className="text-6xl font-bold text-white drop-shadow-lg">
          Airport Wayfinder
        </h1>
        <p className="text-2xl text-blue-100 mt-2">
          Your Navigation Assistant
        </p>
      </header>

      {/* Main Action Buttons */}
      <main className="flex flex-col gap-8 mt-16">
        <button
          onClick={handleGateFinder}
          className="min-w-[400px] min-h-[140px] bg-white text-blue-700 text-4xl font-bold
                     rounded-3xl shadow-2xl hover:bg-blue-50 hover:scale-105
                     active:scale-95 transition-all duration-200
                     focus:outline-none focus:ring-4 focus:ring-yellow-400"
          aria-label="Find your gate - scan boarding pass or search by flight number"
        >
          <span className="flex items-center justify-center gap-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Find Your Gate
          </span>
        </button>

        <button
          onClick={handleDirectory}
          className="min-w-[400px] min-h-[140px] bg-white/90 text-blue-700 text-4xl font-bold
                     rounded-3xl shadow-2xl hover:bg-white hover:scale-105
                     active:scale-95 transition-all duration-200
                     focus:outline-none focus:ring-4 focus:ring-yellow-400"
          aria-label="Browse airport directory - shops, restaurants, and lounges"
        >
          <span className="flex items-center justify-center gap-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Browse Directory
          </span>
        </button>
      </main>

      {/* Language Selector */}
      <footer className="absolute bottom-8 flex gap-4">
        {(['en', 'es', 'fr'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-6 py-3 rounded-lg text-xl font-semibold transition-all
                       ${language === lang
                         ? 'bg-yellow-400 text-blue-900'
                         : 'bg-white/20 text-white hover:bg-white/30'}`}
            aria-pressed={language === lang}
            aria-label={`Switch language to ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : 'French'}`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </footer>

      {/* Touch prompt */}
      <div className="absolute bottom-24 text-blue-200 text-xl animate-pulse">
        Touch to begin
      </div>
    </div>
  );
};

export default IdleScreen;
