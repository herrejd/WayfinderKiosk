/**
 * GateFinderService - Gate lookup and navigation routing
 *
 * Handles finding gates by number, calculating routes from the kiosk location,
 * and parsing flight numbers from various input formats.
 */

import type { SDKPOI, SDKDirections, SDKLocation } from '@/types/wayfinder-sdk';
import { wayfinderService } from './WayfinderService';

class GateFinderService {
  /**
   * Find a gate by gate number
   * @param gateNumber - Gate number (e.g., "A12", "42", "B-5")
   * @returns Gate POI if found
   */
  async findGate(gateNumber: string): Promise<SDKPOI | null> {
    const map = wayfinderService.getInstance();
    if (!map) {
      throw new Error('Map instance not initialized');
    }

    // Normalize gate number (remove spaces, hyphens, make uppercase)
    const normalizedGate = gateNumber.replace(/[\s-]/g, '').toUpperCase();

    try {
      // Search for gate using various query formats
      const queries = [
        `Gate ${gateNumber}`,
        `Gate ${normalizedGate}`,
        gateNumber,
        normalizedGate,
      ];

      // Try each query format
      for (const query of queries) {
        const results = (await map.search(query, true)) as SDKPOI[];

        // Look for gate POIs in results
        const gatePOI = results.find((poi) => {
          // Check if category indicates it's a gate
          if (poi.category?.toLowerCase().includes('gate')) {
            return true;
          }

          // Check if name contains the gate number
          const poiName = poi.name.replace(/[\s-]/g, '').toUpperCase();
          if (poiName.includes(normalizedGate) || poiName.includes(`GATE${normalizedGate}`)) {
            return true;
          }

          return false;
        });

        if (gatePOI) {
          return gatePOI;
        }
      }

      // No gate found
      return null;
    } catch (error) {
      console.error(`Error finding gate ${gateNumber}:`, error);
      throw new Error(`Failed to find gate: ${gateNumber}`);
    }
  }

  /**
   * Get navigation route to a gate
   * @param gateId - POI ID of the gate
   * @param accessible - Whether to use accessible routes
   * @returns Route directions with ETA and distance
   */
  async getRouteToGate(gateId: string, accessible: boolean = false): Promise<SDKDirections> {
    const map = wayfinderService.getInstance();
    if (!map) {
      throw new Error('Map instance not initialized');
    }

    // Get kiosk location
    const kioskLocation = wayfinderService.getKioskLocation();
    const from: SDKLocation = {
      lat: kioskLocation.lat,
      lng: kioskLocation.lng,
      floorId: kioskLocation.floorId,
    };

    const to: SDKLocation = { poiId: gateId };

    try {
      const directions = await map.getDirections(from, to, accessible);
      return directions;
    } catch (error) {
      console.error(`Error getting route to gate ${gateId}:`, error);
      throw new Error(`Failed to get route to gate: ${gateId}`);
    }
  }

  /**
   * Show navigation to a gate on the fullscreen map
   * @param gateId - POI ID of the gate
   * @param accessible - Whether to use accessible routes
   */
  async showNavigationToGate(gateId: string, accessible: boolean = false): Promise<void> {
    const map = wayfinderService.getInstance();
    if (!map) {
      throw new Error('Map instance not initialized');
    }

    // Get kiosk location
    const kioskLocation = wayfinderService.getKioskLocation();
    const from: SDKLocation = {
      lat: kioskLocation.lat,
      lng: kioskLocation.lng,
      floorId: kioskLocation.floorId,
    };

    const to: SDKLocation = { poiId: gateId };

    try {
      await map.showNavigation(from, to, accessible);
    } catch (error) {
      console.error(`Error showing navigation to gate ${gateId}:`, error);
      throw new Error(`Failed to show navigation to gate: ${gateId}`);
    }
  }

  /**
   * Parse and normalize flight number from various formats
   * @param input - Flight number in various formats
   * @returns Normalized flight number or null if invalid
   *
   * Supported formats:
   * - AA123
   * - AA 123
   * - AA-123
   * - American 123
   * - Flight AA123
   */
  parseFlightNumber(input: string): string | null {
    if (!input || typeof input !== 'string') {
      return null;
    }

    // Remove "Flight" prefix if present
    let cleaned = input.trim().replace(/^flight\s+/i, '');

    // Common airline code mappings (add more as needed)
    const airlineMap: Record<string, string> = {
      american: 'AA',
      delta: 'DL',
      united: 'UA',
      southwest: 'WN',
      alaska: 'AS',
      jetblue: 'B6',
      spirit: 'NK',
      frontier: 'F9',
    };

    // Replace airline names with codes
    Object.entries(airlineMap).forEach(([name, code]) => {
      const regex = new RegExp(`^${name}\\s+`, 'i');
      cleaned = cleaned.replace(regex, `${code} `);
    });

    // Extract airline code and flight number
    // Matches: AA123, AA 123, AA-123, etc.
    const match = cleaned.match(/^([A-Z]{2})\s*[-]?\s*(\d{1,4})$/i);

    if (match) {
      const airlineCode = match[1].toUpperCase();
      const flightNum = match[2];
      return `${airlineCode}${flightNum}`;
    }

    return null;
  }

  /**
   * Find gate by flight number
   * Note: This requires integration with a flight data API
   * For now, this is a placeholder that searches for gates directly
   *
   * @param flightNumber - Normalized flight number
   * @returns Gate POI if found
   */
  async findGateByFlightNumber(flightNumber: string): Promise<SDKPOI | null> {
    // TODO: In production, this would:
    // 1. Query a flight data API with the flight number
    // 2. Get the gate assignment from the API
    // 3. Call findGate() with the gate number

    // For now, we'll just search for the flight number in POI data
    const map = wayfinderService.getInstance();
    if (!map) {
      throw new Error('Map instance not initialized');
    }

    try {
      const results = (await map.search(flightNumber, true)) as SDKPOI[];

      // Find gate POIs
      const gatePOI = results.find((poi) => poi.category?.toLowerCase().includes('gate'));

      return gatePOI || null;
    } catch (error) {
      console.error(`Error finding gate for flight ${flightNumber}:`, error);
      return null;
    }
  }

  /**
   * Get all gates in the venue
   * @returns Array of gate POIs
   */
  async getAllGates(): Promise<SDKPOI[]> {
    const map = wayfinderService.getInstance();
    if (!map) {
      throw new Error('Map instance not initialized');
    }

    try {
      // Search for all gates
      const results = (await map.search('gate', true)) as SDKPOI[];

      // Filter for gate POIs only
      const gates = results.filter((poi) => {
        return poi.category?.toLowerCase().includes('gate');
      });

      // Sort by gate name/number
      gates.sort((a, b) => {
        // Extract numbers from gate names for proper sorting
        const getGateNum = (name: string) => {
          const match = name.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };

        const numA = getGateNum(a.name);
        const numB = getGateNum(b.name);

        if (numA !== numB) {
          return numA - numB;
        }

        // If numbers are same, sort alphabetically
        return a.name.localeCompare(b.name);
      });

      return gates;
    } catch (error) {
      console.error('Error fetching all gates:', error);
      throw new Error('Failed to fetch gates');
    }
  }

  /**
   * Calculate estimated walking time based on distance
   * @param distanceMeters - Distance in meters
   * @param accessible - Whether using accessible route (slower)
   * @returns Estimated time in seconds
   */
  calculateWalkingTime(distanceMeters: number, accessible: boolean = false): number {
    // Average walking speed: 1.4 m/s (standard), 0.9 m/s (accessible)
    const walkingSpeed = accessible ? 0.9 : 1.4;
    return Math.ceil(distanceMeters / walkingSpeed);
  }

  /**
   * Format walking time for display
   * @param seconds - Time in seconds
   * @returns Formatted string (e.g., "3 min", "12 min")
   */
  formatWalkingTime(seconds: number): string {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  }

  /**
   * Format distance for display
   * @param meters - Distance in meters
   * @returns Formatted string (e.g., "150 ft", "0.2 mi")
   */
  formatDistance(meters: number): string {
    const feet = meters * 3.28084;

    if (feet < 500) {
      return `${Math.round(feet)} ft`;
    }

    const miles = feet / 5280;
    return `${miles.toFixed(1)} mi`;
  }
}

// Export singleton instance
export const gateFinderService = new GateFinderService();
