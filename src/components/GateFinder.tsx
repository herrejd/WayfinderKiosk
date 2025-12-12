/**
 * GateFinder View Component
 *
 * Allows passengers to find their gate by:
 * 1. Scanning their boarding pass with the camera (PDF417 barcode)
 * 2. Manually entering their flight number
 *
 * Displays route information and initiates navigation to the gate.
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useKioskStore } from '@/store/kioskStore';
import { barcodeScannerService, gateFinderService } from '@/services';
import type { BoardingPassData, POI } from '@/types/wayfinder';
import type { SDKPOI } from '@/types/wayfinder-sdk';

export function GateFinder() {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Store state - use individual selectors to prevent re-render loops
  const selectPOI = useKioskStore((state) => state.selectPOI);
  const setNavigating = useKioskStore((state) => state.setNavigating);
  const setErrorMessage = useKioskStore((state) => state.setErrorMessage);
  const updateInteraction = useKioskStore((state) => state.updateInteraction);
  const setView = useKioskStore((state) => state.setView);

  // Component state
  const [isScanning, setIsScanning] = useState(false);
  const [flightNumber, setFlightNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [boardingPass, setBoardingPass] = useState<BoardingPassData | null>(null);
  const [gatePOI, setGatePOI] = useState<SDKPOI | null>(null);
  const [walkingTime, setWalkingTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (barcodeScannerService.isActive()) {
        barcodeScannerService.stopScanning();
      }
    };
  }, []);

  /**
   * Handle successful boarding pass scan
   */
  const handleBoardingPassScan = async (data: BoardingPassData) => {
    updateInteraction();
    setBoardingPass(data);
    setError(null);

    // If gate is in boarding pass, search for it
    if (data.gate) {
      await searchForGate(data.gate);
    } else if (data.flightNumber) {
      // Try to find gate by flight number
      setIsSearching(true);
      try {
        const gate = await gateFinderService.findGateByFlightNumber(data.flightNumber);
        if (gate) {
          await displayGateInfo(gate);
        } else {
          setError('Gate information not found. Please try manual search or ask an agent.');
        }
      } catch (err) {
        console.error('Error finding gate by flight number:', err);
        setError('Unable to find gate. Please try manual search.');
      } finally {
        setIsSearching(false);
      }
    } else {
      setError('Boarding pass does not contain gate or flight information.');
    }
  };

  /**
   * Handle scan errors
   */
  const handleScanError = (errorMsg: string) => {
    console.error('Scan error:', errorMsg);
    if (errorMsg.includes('camera')) {
      setError('Camera access denied. Please enable camera permissions or use manual entry.');
    } else {
      setError('Could not read boarding pass. Please try again or use manual entry.');
    }
  };

  /**
   * Start camera barcode scanning
   */
  const startScanning = async () => {
    updateInteraction();
    if (!videoRef.current) {
      setError('Video element not ready');
      return;
    }

    setError(null);
    setIsScanning(true);

    try {
      await barcodeScannerService.startScanning(
        videoRef.current,
        handleBoardingPassScan,
        handleScanError
      );
    } catch (err) {
      console.error('Failed to start scanning:', err);
      setIsScanning(false);
      handleScanError(err instanceof Error ? err.message : 'Failed to start camera');
    }
  };

  /**
   * Stop camera scanning
   */
  const stopScanning = () => {
    barcodeScannerService.stopScanning();
    setIsScanning(false);
  };

  /**
   * Search for gate by gate number
   */
  const searchForGate = async (gateNumber: string) => {
    updateInteraction();
    setIsSearching(true);
    setError(null);

    try {
      const gate = await gateFinderService.findGate(gateNumber);
      if (gate) {
        await displayGateInfo(gate);
      } else {
        setError(`Gate ${gateNumber} not found. Please verify the gate number.`);
      }
    } catch (err) {
      console.error('Error searching for gate:', err);
      setError('Unable to find gate. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handle manual flight number search
   */
  const handleManualSearch = async () => {
    updateInteraction();
    if (!flightNumber.trim()) {
      setError('Please enter a flight number');
      return;
    }

    const parsedFlightNumber = gateFinderService.parseFlightNumber(flightNumber);
    if (!parsedFlightNumber) {
      setError('Invalid flight number format. Please use format like AA123 or American 123.');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const gate = await gateFinderService.findGateByFlightNumber(parsedFlightNumber);
      if (gate) {
        await displayGateInfo(gate);
      } else {
        setError(`Gate for flight ${parsedFlightNumber} not found. Please check the flight information displays or ask an agent.`);
      }
    } catch (err) {
      console.error('Error finding gate by flight number:', err);
      setError('Unable to find gate. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Display gate information and calculate route
   */
  const displayGateInfo = async (gate: SDKPOI) => {
    setGatePOI(gate);

    try {
      // Get route to calculate walking time
      const gateId = gate.id || gate.poiId || gate.name;
      const route = await gateFinderService.getRouteToGate(gateId);
      const timeSeconds = route.eta || 0;
      setWalkingTime(gateFinderService.formatWalkingTime(timeSeconds));
    } catch (err) {
      console.error('Error calculating route:', err);
      // Still show gate info even if route calculation fails
      setWalkingTime(null);
    }
  };

  /**
   * Navigate to gate on map
   */
  const navigateToGate = async () => {
    updateInteraction();
    if (!gatePOI) {
      return;
    }

    try {
      // Convert SDKPOI to POI for store
      const poi: POI = {
        id: gatePOI.id || gatePOI.poiId || gatePOI.name,
        name: gatePOI.name,
        category: 'relax', // Gates are general category
        description: gatePOI.description || '',
        position: {
          lat: gatePOI.position.latitude,
          lng: gatePOI.position.longitude,
          floor: gatePOI.position.floorId,
        },
        floor: gatePOI.position.floorId,
      };

      // Update store
      selectPOI(poi);
      setNavigating(true);

      // Show navigation on map
      const poiId = gatePOI.id || gatePOI.poiId || gatePOI.name;
      await gateFinderService.showNavigationToGate(poiId);

      // No longer need to navigate; the store handles showing the map
    } catch (err) {
      console.error('Error starting navigation:', err);
      setErrorMessage('Unable to start navigation. Please try again.');
      setError('Unable to start navigation. Please try again.');
    }
  };

  /**
   * Reset to initial state
   */
  const resetSearch = () => {
    updateInteraction();
    setBoardingPass(null);
    setGatePOI(null);
    setWalkingTime(null);
    setError(null);
    setFlightNumber('');
    if (isScanning) {
      stopScanning();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-md p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => {
              updateInteraction();
              setView('idle');
            }}
            className="flex items-center gap-3 text-blue-600 hover:text-blue-700 transition-colors text-xl font-medium"
            aria-label="Back to home"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>{t('common.back')}</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('gateFinder.title')}</h1>
          <div className="w-24" aria-hidden="true" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Error Display */}
          {error && (
            <div
              className="bg-red-50 border-2 border-red-500 rounded-lg p-6 text-center"
              role="alert"
              aria-live="polite"
            >
              <p className="text-xl text-red-800 font-medium">{error}</p>
              <button
                onClick={resetSearch}
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-lg font-medium"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* Results Display */}
          {gatePOI && !error && (
            <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
              <div className="text-center border-b pb-6">
                <h2 className="text-4xl font-bold text-green-600 mb-2">Gate Found!</h2>
                {boardingPass && (
                  <div className="text-gray-700 space-y-1">
                    <p className="text-xl">
                      <span className="font-semibold">Passenger:</span> {boardingPass.passengerName}
                    </p>
                    <p className="text-xl">
                      <span className="font-semibold">Flight:</span> {boardingPass.flightNumber}
                    </p>
                    {boardingPass.seatNumber && (
                      <p className="text-xl">
                        <span className="font-semibold">Seat:</span> {boardingPass.seatNumber}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center space-y-4">
                <div>
                  <p className="text-2xl text-gray-600 mb-2">{t('gateFinder.gateResult')}</p>
                  <p className="text-6xl font-bold text-blue-600">{gatePOI.name}</p>
                </div>

                {walkingTime && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xl text-gray-700">
                      <span className="font-semibold">{t('gateFinder.walkingTime')}:</span> {walkingTime}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={navigateToGate}
                className="w-full min-h-[80px] bg-blue-600 text-white text-2xl font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-lg"
                aria-label={`Navigate to ${gatePOI.name}`}
              >
                {t('gateFinder.navigate')}
              </button>

              <button
                onClick={resetSearch}
                className="w-full min-h-[60px] bg-gray-200 text-gray-800 text-xl font-medium rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors"
                aria-label="Search for another gate"
              >
                Search Another Gate
              </button>
            </div>
          )}

          {/* Barcode Scanner Section */}
          {!gatePOI && (
            <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {t('gateFinder.scanPrompt')}
                </h2>
                <p className="text-lg text-gray-600">
                  {t('gateFinder.manualEntry')}
                </p>
              </div>

              {/* Video Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  aria-label="Camera preview for barcode scanning"
                />
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <p className="text-white text-xl font-medium">Camera Preview</p>
                  </div>
                )}
              </div>

              {/* Scanner Controls */}
              <div className="flex gap-4">
                {!isScanning ? (
                  <button
                    onClick={startScanning}
                    disabled={isSearching}
                    className="flex-1 min-h-[70px] bg-green-600 text-white text-2xl font-bold rounded-lg hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
                    aria-label="Start scanning boarding pass"
                  >
                    {isSearching ? 'Searching...' : 'Start Scanning'}
                  </button>
                ) : (
                  <button
                    onClick={stopScanning}
                    className="flex-1 min-h-[70px] bg-red-600 text-white text-2xl font-bold rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors shadow-lg"
                    aria-label="Stop scanning"
                  >
                    Stop Scanning
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Manual Entry Section */}
          {!gatePOI && (
            <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Enter Flight Number
                </h2>
                <p className="text-lg text-gray-600">
                  Example: AA123, Delta 456, or UA789
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => {
                    setFlightNumber(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder={t('gateFinder.flightPlaceholder')}
                  disabled={isSearching || isScanning}
                  className="w-full text-2xl p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  aria-label="Flight number input"
                  maxLength={10}
                />

                <button
                  onClick={handleManualSearch}
                  disabled={isSearching || isScanning || !flightNumber.trim()}
                  className="w-full min-h-[70px] bg-blue-600 text-white text-2xl font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
                  aria-label="Search for gate by flight number"
                >
                  {isSearching ? t('common.loading') : t('gateFinder.searchButton')}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default GateFinder;
