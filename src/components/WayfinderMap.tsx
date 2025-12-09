/**
 * WayfinderMap Component
 * Displays the Atrius Wayfinder SDK map with navigation support
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { wayfinderService } from '@/services';
import { useKioskStore } from '@/store/kioskStore';

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
  const initStartedRef = useRef(false);
  const navigationShownRef = useRef(false);

  // Use callback ref to initialize map when container is ready
  const mapContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || initStartedRef.current) return;
      initStartedRef.current = true;

      const initMap = async () => {
        try {
          setIsLoading(true);
          setError(null);

          // Create unique ID for the container
          const containerId = 'wayfinder-map-container';
          node.id = containerId;

          console.log('Initializing Wayfinder map...');

          // Initialize fullscreen map instance
          await wayfinderService.initFullscreen(`#${containerId}`);

          console.log('Wayfinder map initialized successfully');

          setIsLoading(false);
          setMapReady(true);
          onMapReady?.();
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Failed to initialize map');
          console.error('Error initializing Wayfinder map:', error);
          console.error('Full error details:', err);

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
    // Return a cleanup function that will be called when the component unmounts
    return () => {
      // Only attempt to destroy if the map was successfully initialized.
      if (mapReady) {
        wayfinderService.destroyFullscreen();
        initStartedRef.current = false;
        navigationShownRef.current = false;
      }
    };
  }, [mapReady]);

  // Handle navigation display AFTER map is ready
  useEffect(() => {
    // Wait until map is ready
    if (!mapReady || !showNavigation || !selectedPOI) {
      return;
    }

    // Prevent showing navigation multiple times for same POI
    if (navigationShownRef.current) {
      return;
    }

    const map = wayfinderService.getFullscreen();
    if (!map) {
      console.error('Map instance not available');
      return;
    }

    const fire = (map as any).fire;
    const on = (map as any).on;

    // Convert POI ID to integer - SDK expects integer
    const poiIdStr = selectedPOI.id;
    // The SDK uses string POI IDs, so parseInt is not needed for showNavigation.
    // const poiIdInt = parseInt(poiIdStr, 10); 
    const kioskLocation = wayfinderService.getKioskLocation();

    const showRoute = async () => {
      if (navigationShownRef.current) return;

      console.log('=== Calling showNavigation ===');
      console.log('From Kiosk Location:', kioskLocation);
      console.log('To POI ID:', poiIdStr);

      try {
        // The `showNavigation` function automatically displays the route and UI
        // as described in the `wayfinder-integration-guide.md`.
        const sdkMap = map as any;
        if (typeof sdkMap.fire === 'function') {
          sdkMap.fire('showNavigation', {
            from: kioskLocation, // from: kiosk location { lat, lng, floorId }
            to: { poiId: poiIdStr }, // to: destination POI
            accessible: false, // accessible route
          });
          console.log('`fire("showNavigation")` called successfully.');
          navigationShownRef.current = true;
        } else {
          console.error('`map.fire()` is not available. Check SDK map instance.');
        }
      } catch (err) {
        console.error('Error calling `showNavigation`:', err);
      }

      /* --- OLD CODE: MANUAL ROUTE DRAWING ---
      if (navigationShownRef.current) return;

      console.log('=== Getting Directions and Drawing Route ===');
      console.log('From:', kioskLocation);
      console.log('To POI ID:', poiIdInt);

      try {
        // Get directions data
        if (typeof (map as any).getDirections !== 'function') {
          console.error('getDirections not available');
          return;
        }

        console.log('Calling getDirections...');
        const directions = await (map as any).getDirections(
          { lat: kioskLocation.lat, lng: kioskLocation.lng, floorId: kioskLocation.floorId },
          { poiId: poiIdInt },
          false // accessible
        );

        console.log('Directions received:', directions);
        console.log('Distance:', directions?.distance, 'meters');
        console.log('Time:', directions?.time, 'minutes');
        console.log('Steps:', directions?.steps?.length);
        console.log('Waypoints:', directions?.waypoints?.length);

        // Draw the route using waypoints
        if (directions?.waypoints && directions.waypoints.length > 0) {
          // Convert waypoints to coordinate pairs for drawLines
          // Waypoints format varies - log to see structure
          console.log('First waypoint:', directions.waypoints[0]);

          // Extract coordinates from waypoints
          const coords: Array<[number, number]> = directions.waypoints.map((wp: any) => {
            // Handle different possible formats
            if (Array.isArray(wp)) {
              return wp as [number, number];
            } else if (wp.lat !== undefined && wp.lng !== undefined) {
              return [wp.lng, wp.lat] as [number, number];
            } else if (wp.latitude !== undefined && wp.longitude !== undefined) {
              return [wp.longitude, wp.latitude] as [number, number];
            }
            return [wp[0], wp[1]] as [number, number];
          });

          console.log('Drawing route with', coords.length, 'points');
          console.log('First coord:', coords[0]);
          console.log('Last coord:', coords[coords.length - 1]);

          // Use fire to draw lines since drawLines might not be a direct method
          if (typeof fire === 'function') {
            // Clear any existing route first
            fire.call(map, 'clearLines', 'navigation-route');

            // Draw the route
            fire.call(
              map,
              'drawLines',
              'navigation-route',
              coords,
              { color: '#0066CC', width: 6 },
              3 // ordinal for the floor
            );
            console.log('Route drawn on map');
          }

          // Also show the destination POI
          fire.call(map, 'showPOI', poiIdInt);
          console.log('Destination POI highlighted');
        }

        navigationShownRef.current = true;
      } catch (err) {
        console.error('Error in navigation:', err);
      }
      */
    };

    // Listen for moveEnd event to know when map is truly ready
    let moveEndHandler: (() => void) | null = null;
    let initialMoveComplete = false;

    if (typeof on === 'function') {
      moveEndHandler = () => {
        if (!initialMoveComplete) {
          initialMoveComplete = true;
          console.log('Initial map move complete, sending navigation...');
          // Give a small additional delay after moveEnd
          setTimeout(showRoute, 200);
        }
      };

      on.call(map, 'moveEnd', moveEndHandler);
      console.log('Registered moveEnd listener for navigation timing');
    }

    // Fallback: If no moveEnd fires within 2 seconds, send anyway
    const fallbackTimeout = setTimeout(() => {
      if (!navigationShownRef.current) {
        console.log('Fallback timeout - sending navigation now');
        showRoute();
      }
    }, 2000);

    return () => {
      clearTimeout(fallbackTimeout);
      // Note: SDK may not support removing listeners, but we prevent double-fire with ref
    };
  }, [mapReady, showNavigation, selectedPOI]);

  // Map container - always render so callback ref fires
  // Overlay loading/error states on top
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Map container - always mounted */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        aria-label="Interactive airport map"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-2xl text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
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
    </div>
  );
};

export default WayfinderMap;
