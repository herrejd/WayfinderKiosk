/**
 * MapView Component
 * Page wrapper for the Wayfinder map with navigation controls
 */

import React from 'react';
import { useKioskStore } from '@/store/kioskStore';
import { WayfinderMap } from './WayfinderMap';
import { wayfinderService } from '@/services';
import { parseFloorId } from '@/utils/floorParser';

export const MapView: React.FC = () => {
  const selectedPOI = useKioskStore((state) => state.selectedPOI);
  const selectPOI = useKioskStore((state) => state.selectPOI);
  const setNavigating = useKioskStore((state) => state.setNavigating);
  const setView = useKioskStore((state) => state.setView);
  const setMapVisible = useKioskStore((state) => state.setMapVisible);

  const handleBack = () => {
    // Call resetMap() directly on the map instance
    const map = wayfinderService.getInstance();
    if (map) {
      map.resetMap();
    }

    // Delay the state update to allow the map to process the reset command
    setTimeout(() => {
      setNavigating(false);
      selectPOI(null);
      setMapVisible(false);
      setView('idle');
    }, 100);
  };

  const handleClearRoute = () => {
    // Call resetMap() directly on the map instance
    const map = wayfinderService.getInstance();
    if (map) {
      map.resetMap();
    }

    // Delay the state update to allow the map to process the reset command
    setTimeout(() => {
      selectPOI(null);
      setNavigating(false);
      setMapVisible(false);
      setView('directory');
    }, 100);
  };

  const handleMapReady = () => {
    // Map is ready, set navigating state if we have a POI
    if (selectedPOI) {
      setNavigating(true);
    }
  };

  const handleMapError = (error: Error) => {
    console.error('Map error:', error);
    // Could dispatch to error tracking service here
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow-lg z-10">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-500
                       rounded-xl text-xl font-semibold transition-all
                       active:scale-95 focus:outline-none focus:ring-4 focus:ring-yellow-400"
            aria-label="Go back to previous screen"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>

          {/* Title */}
          <h1 className="text-3xl font-bold flex-1 text-center">
            {selectedPOI ? (
              <span className="flex items-center justify-center gap-3">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {selectedPOI.name}
              </span>
            ) : (
              'Airport Map'
            )}
          </h1>

          {/* Clear Route Button or Spacer */}
          {selectedPOI ? (
            <button
              onClick={handleClearRoute}
              className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-500
                         rounded-xl text-xl font-semibold transition-all
                         active:scale-95 focus:outline-none focus:ring-4 focus:ring-yellow-400"
              aria-label="Clear route and return to directory"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear Route
            </button>
          ) : (
            <div className="w-[140px]" /> /* Spacer to center title */
          )}
        </div>

        {/* Location details if POI is selected */}
        {selectedPOI && (
          <div className="px-6 pb-4 border-t border-blue-600 pt-3">
            <div className="flex items-center justify-center gap-6 text-blue-100">
              <span className="flex items-center gap-2 text-lg">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                  />
                </svg>
                {parseFloorId(selectedPOI.floor)}
              </span>
              {selectedPOI.distanceMeters && (
                <span className="flex items-center gap-2 text-lg">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  {Math.round(selectedPOI.distanceMeters)} meters away
                </span>
              )}
              <span className="flex items-center gap-2 text-lg capitalize">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                {selectedPOI.category}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Map Container */}
      <main className="flex-1 relative">
        <WayfinderMap
          className="h-full"
          showNavigation={!!selectedPOI}
          onMapReady={handleMapReady}
          onError={handleMapError}
        />
      </main>
    </div>
  );
};

export default MapView;
