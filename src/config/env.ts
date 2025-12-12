/**
 * Environment Configuration
 * Loads and exports environment variables with type safety and defaults
 */

/**
 * Kiosk configuration derived from environment variables
 */
export const config = {
  // Atrius Wayfinder SDK Credentials
  wayfinder: {
    accountId: import.meta.env.VITE_WAYFINDER_ACCOUNT_ID || '',
    venueId: import.meta.env.VITE_WAYFINDER_VENUE_ID || '',
  },

  // Kiosk Pinned Location
  kioskLocation: {
    pinTitle: import.meta.env.VITE_KIOSK_PIN_TITLE || 'You Are Here',
    lat: parseFloat(import.meta.env.VITE_KIOSK_LATITUDE || '0'),
    lng: parseFloat(import.meta.env.VITE_KIOSK_LONGITUDE || '0'),
    floorId: import.meta.env.VITE_KIOSK_FLOOR_ID || '',
    structureId: import.meta.env.VITE_KIOSK_STRUCTURE_ID || '',
  },

  // QR Code Map Link
  mapQrBaseUrl: import.meta.env.VITE_MAP_QR_BASE_URL || '',

  // Flight Status Integration
  flightStatusEnabled: import.meta.env.VITE_FLIGHT_STATUS_ENABLED === 'true',
  flightStatusApiKey: import.meta.env.VITE_FLIGHT_STATUS_API_KEY || '',

  // Flight Search UI - when true, opens gate.departures search panel before searching
  // Set VITE_FLIGHT_SEARCH_SHOW_UI=false to disable
  flightSearchShowUI: (() => {
    const val = import.meta.env.VITE_FLIGHT_SEARCH_SHOW_UI;
    // Explicitly check for 'false' string (env vars are always strings)
    if (val === 'false' || val === '0' || val === 'no') {
      return false;
    }
    // Default to true if not set or set to anything else
    return true;
  })(),

  // POI Categories for map quick actions (all languages in one object)
  // Structure: { poiCategories: [...], "poiCategories-es": [...], "poiCategories-fr": [...] }
  poiCategoriesConfig: (() => {
    const categoriesJson = import.meta.env.VITE_POI_CATEGORIES;
    if (!categoriesJson) return null;
    try {
      return JSON.parse(categoriesJson) as Record<string, Array<{
        name: string;
        category?: string;
        svgId?: string;
        searchTerm?: string;
      }>>;
    } catch (e) {
      console.error('Failed to parse VITE_POI_CATEGORIES:', e);
      return null;
    }
  })(),

  // Inactivity Timeout
  inactivityTimeout: parseInt(import.meta.env.VITE_INACTIVITY_TIMEOUT || '60000', 10),

  // Application Name
  appName: import.meta.env.VITE_APP_NAME || 'Atrius Airport',
} as const;

/**
 * Validate required configuration
 * Call this on app startup to ensure all required env vars are set
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.wayfinder.accountId) {
    errors.push('VITE_WAYFINDER_ACCOUNT_ID is required');
  }
  if (!config.wayfinder.venueId) {
    errors.push('VITE_WAYFINDER_VENUE_ID is required');
  }
  if (!config.kioskLocation.lat || !config.kioskLocation.lng) {
    errors.push('VITE_KIOSK_LATITUDE and VITE_KIOSK_LONGITUDE are required');
  }
  if (!config.kioskLocation.floorId) {
    errors.push('VITE_KIOSK_FLOOR_ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default config;
