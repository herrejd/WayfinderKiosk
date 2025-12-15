/**
 * WayfinderMap Component
 * Displays the Atrius Wayfinder SDK map with navigation support
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { wayfinderService } from '@/services';
import { useKioskStore } from '@/store/kioskStore';
import { config } from '@/config';
import { QRCodeModal } from './QRCodeModal';

interface WayfinderMapProps {
  className?: string;
  showNavigation?: boolean;
  onMapReady?: () => void;
  onError?: (error: Error) => void;
}

export const WayfinderMap: React.FC<WayfinderMapProps> = ({
  className = '',
  showNavigation = false,
  onMapReady,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const selectedPOI = useKioskStore((state) => state.selectedPOI);
  const setInitialMapState = useKioskStore((state) => state.setInitialMapState);
  const flightSearchQuery = useKioskStore((state) => state.flightSearchQuery);
  const setFlightSearchQuery = useKioskStore((state) => state.setFlightSearchQuery);
  const isMapReadyGlobal = useKioskStore((state) => state.isMapReady);
  const setMapReadyGlobal = useKioskStore((state) => state.setMapReady);
  const qrCodeUrl = useKioskStore((state) => state.qrCodeUrl);
  const setQrCodeUrl = useKioskStore((state) => state.setQrCodeUrl);
  const initStartedRef = useRef(false);
  const navigationShownRef = useRef(false);
  const mapContainerNodeRef = useRef<HTMLDivElement | null>(null);

  // Use callback ref to initialize map when container is ready
  const mapContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      mapContainerNodeRef.current = node;
      if (!node || initStartedRef.current) return;
      initStartedRef.current = true;

      const initMap = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const containerId = 'wayfinder-map-container';
          node.id = containerId;
          console.log('Initializing Wayfinder map...');
          await wayfinderService.init(`#${containerId}`);
          console.log('Wayfinder map initialized successfully');
          setIsLoading(false);
          setMapReady(true);
          setMapReadyGlobal(true);
          onMapReady?.();
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Failed to initialize map');
          console.error('Error initializing Wayfinder map:', error);
          setError(error);
          setIsLoading(false);
          onError?.(error);
        }
      };

      initMap();
    },
    [onMapReady, onError]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapReady) {
        wayfinderService.destroy();
        initStartedRef.current = false;
        navigationShownRef.current = false;
      }
    };
  }, [mapReady]);

  // Intercept external link clicks and show QR code instead
  useEffect(() => {
    const container = mapContainerNodeRef.current;
    if (!container || !mapReady) return;

    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Find the closest anchor element
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Check if it's an external link (starts with http/https and has target="_blank")
      const isExternal =
        (href.startsWith('http://') || href.startsWith('https://')) &&
        (anchor.getAttribute('target') === '_blank' || !href.includes(window.location.hostname));

      if (isExternal) {
        // Prevent the default link behavior
        event.preventDefault();
        event.stopPropagation();

        // Show QR code modal instead
        setQrCodeUrl(href);
        console.log('Intercepted external link:', href);
      }
    };

    // Use capture phase to intercept before SDK handles it
    container.addEventListener('click', handleLinkClick, true);

    return () => {
      container.removeEventListener('click', handleLinkClick, true);
    };
  }, [mapReady, setQrCodeUrl]);

  // Effect to capture the initial map state, runs only when map is first ready.
  useEffect(() => {
    if (!mapReady) return;

    const map = wayfinderService.getInstance();
    if (!map) return;

    // Check if we already have a saved state
    const hasInitialState = useKioskStore.getState().initialMapState;
    if (hasInitialState) return;

    const on = (map as any).on;
    if (typeof on !== 'function') return;

    let hasCaptured = false;
    const initialMoveHandler = () => {
      if (!hasCaptured) {
        hasCaptured = true;
        const stateId = (map as any).getState();
        if (stateId) {
          setInitialMapState(stateId);
          console.log('Initial map state saved.');
        }
      }
    };

    on.call(map, 'moveEnd', initialMoveHandler);

    // Fallback in case moveEnd doesn't fire
    const fallback = setTimeout(() => {
      if (!hasCaptured) {
        hasCaptured = true;
        const stateId = (map as any).getState();
        if (stateId) {
          setInitialMapState(stateId);
          console.log('Initial map state saved (via fallback).');
        }
      }
    }, 4000);

    return () => clearTimeout(fallback);
  }, [mapReady, setInitialMapState]);

  // Ref to track pending search - prevents cleanup from cancelling
  const pendingSearchRef = useRef<string | null>(null);

  // Effect to handle flight number searches
  // Use global isMapReady state which persists, combined with local mapReady
  useEffect(() => {
    const isReady = mapReady || isMapReadyGlobal;
    console.log(`[FlightSearch Effect] mapReady=${mapReady}, isMapReadyGlobal=${isMapReadyGlobal}, flightSearchQuery="${flightSearchQuery}"`);

    if (isReady && flightSearchQuery && flightSearchQuery !== pendingSearchRef.current) {
      const query = flightSearchQuery;
      pendingSearchRef.current = query;
      console.log(`[FlightSearch Effect] Triggering search for: "${query}"`);

      // Clear the query from store
      setFlightSearchQuery(null);

      // Delay to allow map visibility transition to complete
      setTimeout(() => {
        console.log(`[FlightSearch Effect] Calling wayfinderService.flightSearch("${query}")`);
        wayfinderService.flightSearch(query);
        pendingSearchRef.current = null;
      }, 500);
    }
  }, [mapReady, isMapReadyGlobal, flightSearchQuery, setFlightSearchQuery]);

  // Effect to handle showing navigation when a POI is selected
  useEffect(() => {
    // Reset flag if POI is cleared
    if (!selectedPOI) {
      navigationShownRef.current = false;
      return;
    }

    if (!mapReady || !showNavigation || navigationShownRef.current) {
      return;
    }

    const map = wayfinderService.getInstance();
    if (!map) return;

    const showRoute = () => {
      if (navigationShownRef.current || !selectedPOI) return;
      navigationShownRef.current = true;

      const poiIdStr = selectedPOI.id;
      const kioskLocation = wayfinderService.getKioskLocation();
      console.log('=== Calling showNavigation ===');

      try {
        const sdkMap = map as any;
        if (typeof sdkMap.showNavigation === 'function') {
          sdkMap.showNavigation(kioskLocation, { poiId: poiIdStr }, false);
          console.log('Direct call to `showNavigation` completed.');
        } else {
          console.error('`map.showNavigation()` is not a direct function.');
        }
      } catch (err) {
        console.error('Error calling `showNavigation`:', err);
      }
    };
    
    // A small delay helps ensure the map is ready to receive commands after being displayed
    setTimeout(showRoute, 200);

  }, [mapReady, showNavigation, selectedPOI]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        aria-label="Interactive airport map"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-2xl text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-95 z-10">
          <div className="text-center px-8">
            <svg
              className="w-20 h-20 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-2xl font-bold text-red-800 mb-2">Map Error</h3>
            <p className="text-xl text-red-600">{error.message}</p>
            <p className="text-lg text-red-500 mt-2">Please try again or contact assistance</p>
          </div>
        </div>
      )}

      {/* QR Code Modal for external links and "Take Map With You" */}
      {qrCodeUrl && (
        <QRCodeModal
          url={qrCodeUrl}
          onClose={() => setQrCodeUrl(null)}
          title={
            config.mapQrBaseUrl && qrCodeUrl.startsWith(config.mapQrBaseUrl)
              ? 'Take This Map With You'
              : undefined
          }
        />
      )}
    </div>
  );
};

export default WayfinderMap;
