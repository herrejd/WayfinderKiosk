/**
 * Idle Screen Component
 * Main welcome/attract screen for the Airport Wayfinder Kiosk
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useKioskStore } from '@/store/kioskStore';
import { directoryService, type SecurityWaitTime } from '@/services';

/**
 * Security Wait Time Display Component
 * Shows current wait times for security checkpoints
 */
function SecurityWaitTimes() {
  const { t } = useTranslation();
  const [waitTimes, setWaitTimes] = useState<SecurityWaitTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchWaitTimes() {
      try {
        const times = await directoryService.getSecurityWaitTimes();
        if (mounted) {
          setWaitTimes(times);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError('Unable to load wait times');
          setLoading(false);
        }
      }
    }

    fetchWaitTimes();

    // Refresh wait times every 2 minutes
    const interval = setInterval(fetchWaitTimes, 2 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Don't render if no data or error
  if (loading || error || waitTimes.length === 0) {
    return null;
  }

  // Get color based on wait time
  const getWaitTimeColor = (minutes: number, isClosed: boolean) => {
    if (isClosed) return 'text-red-600';
    if (minutes <= 10) return 'text-green-600';
    if (minutes <= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get background color based on wait time
  const getWaitTimeBgColor = (minutes: number, isClosed: boolean) => {
    if (isClosed) return 'bg-red-100';
    if (minutes <= 10) return 'bg-green-100';
    if (minutes <= 20) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // Format queue type for display
  const formatQueueType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'clear':
        return t('security.clear');
      case 'precheck':
      case 'tsa_precheck':
        return t('security.precheck');
      case 'tsa':
      case 'standard':
      default:
        return t('security.standard');
    }
  };

  return (
    <div
      className="absolute top-8 right-8 bg-white/95 rounded-2xl shadow-xl p-4 min-w-[280px]"
      role="region"
      aria-label="Security checkpoint wait times"
    >
      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {t('security.title')}
      </h2>

      <div className="space-y-2">
        {waitTimes.map((wt) => (
          <div
            key={wt.id}
            className={`flex items-center justify-between p-3 rounded-lg ${getWaitTimeBgColor(wt.waitTimeMinutes, wt.isTemporarilyClosed)}`}
          >
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800">{wt.name}</span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatQueueType(wt.queueType)}</span>
                {wt.location && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {wt.location}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className={`text-2xl font-bold ${getWaitTimeColor(wt.waitTimeMinutes, wt.isTemporarilyClosed)}`}>
              {wt.isTemporarilyClosed ? (
                <span className="text-base">{t('security.closed')}</span>
              ) : (
                <>
                  {wt.waitTimeMinutes}
                  <span className="text-sm font-normal ml-1">{t('common.min')}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Real-time indicator */}
      {waitTimes.some(wt => wt.isRealTime) && (
        <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          {t('security.liveData')}
        </div>
      )}
    </div>
  );
}

export const IdleScreen: React.FC = () => {
  const { t } = useTranslation();
  const setView = useKioskStore((state) => state.setView);
  const setMapVisible = useKioskStore((state) => state.setMapVisible);
  const selectPOI = useKioskStore((state) => state.selectPOI);
  const setLanguage = useKioskStore((state) => state.setLanguage);
  const language = useKioskStore((state) => state.language);

  const handleGateFinder = () => {
    // Show the map in its default (pinned location) view
    setView('map');
    setMapVisible(true);
    selectPOI(null); // Clear any previously selected POI
  };

  const handleDirectory = () => {
    setView('directory');
  };

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center touch-none select-none bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/assets/Airportbackdrop.png')" }}
    >
      {/* Header */}
      <header className="absolute top-8 left-0 right-0 text-center">
        <h1 className="text-6xl font-bold text-gray-900 drop-shadow-lg">
          {t('idle.title')}
        </h1>
        <p className="text-2xl text-gray-700 mt-2">
          {t('idle.subtitle')}
        </p>
      </header>

      {/* Security Wait Times - Top Right */}
      <SecurityWaitTimes />

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
            {t('idle.findGate')}
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
            {t('idle.directory')}
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
                         ? 'bg-blue-600 text-white'
                         : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            aria-pressed={language === lang}
            aria-label={`Switch language to ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : 'French'}`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </footer>

      {/* Touch prompt */}
      <div className="absolute bottom-24 text-gray-600 text-xl animate-pulse">
        {t('idle.touchPrompt')}
      </div>
    </div>
  );
};

export default IdleScreen;
