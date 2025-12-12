/**
 * TakeMapButton Component
 * Floating button that generates a QR code for users to take the current map view
 * to their phone via the hosted web app
 */

import React from 'react';
import { useKioskStore } from '@/store/kioskStore';
import { wayfinderService } from '@/services';
import { config } from '@/config';

export const TakeMapButton: React.FC = () => {
  const setQrCodeUrl = useKioskStore((state) => state.setQrCodeUrl);
  const isMapReady = useKioskStore((state) => state.isMapReady);
  const isMapVisible = useKioskStore((state) => state.isMapVisible);

  const handleTakeMap = async () => {
    const map = wayfinderService.getInstance();
    if (!map) {
      console.warn('TakeMapButton: No map instance available');
      return;
    }

    try {
      // Get current map state (returns a Promise)
      const state = await (map as any).getState();
      if (!state) {
        console.warn('TakeMapButton: Could not get map state');
        return;
      }

      // Build the URL with state parameter
      const mapUrl = `${config.mapQrBaseUrl}?s=${state}`;
      console.log('Generated map URL:', mapUrl);
      console.log('State length:', state.length);

      // Show QR code modal
      setQrCodeUrl(mapUrl);
    } catch (error) {
      console.error('TakeMapButton: Error getting map state:', error);
    }
  };

  // Only show button when map is visible and ready (SDK initialized)
  if (!isMapReady || !isMapVisible) {
    return null;
  }

  return (
    <button
      onClick={handleTakeMap}
      aria-label="Take this map with you - scan QR code on your phone"
      className="fixed bottom-40 left-6 w-16 h-16 rounded-full bg-green-600 text-white hover:bg-green-700 shadow-lg flex items-center justify-center transition-colors z-40 min-h-[48px] min-w-[48px]"
      title="Take Map With You"
    >
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
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    </button>
  );
};

export default TakeMapButton;
