/**
 * DirectoryService - POI fetching and categorization
 *
 * Fetches and filters POIs from the headless SDK instance based on categories.
 * Implements caching to reduce redundant API calls.
 */

import type { SDKPOI, WayfinderMap } from '@/types/wayfinder-sdk';
import { wayfinderService } from './WayfinderService';

/**
 * Fast Euclidean distance calculation for terminal-scale distances
 * ~10x faster than Haversine, accurate within ~0.1% for distances < 1km
 *
 * @param lat1 - Latitude of point 1 (degrees)
 * @param lon1 - Longitude of point 1 (degrees)
 * @param lat2 - Latitude of point 2 (degrees)
 * @param lon2 - Longitude of point 2 (degrees)
 * @param cosLat - Pre-computed cos(latitude) for efficiency
 * @returns Distance in meters
 */
function fastDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  cosLat: number
): number {
  // Convert lat/lng deltas to meters
  // 1 degree latitude ≈ 110,540 meters
  // 1 degree longitude ≈ 111,320 * cos(latitude) meters
  const dx = (lon2 - lon1) * 111320 * cosLat;
  const dy = (lat2 - lat1) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}

// Augmented POI type with distance
export type DirectoryPOI = SDKPOI & { distanceFromKiosk: number };

// POI category prefixes based on venue configuration
const CATEGORY_PREFIXES = {
  shop: ['shop', 'retail.', 'duty-free.'],
  dine: ['eat.', 'food.', 'restaurant.', 'cafe.'],
  relax: ['services.lounge', 'relax', 'amenities.'],
} as const;

class DirectoryService {
  private poiCache = new Map<string, DirectoryPOI[]>();
  // Store POIs with pre-computed distances (calculated once at init)
  private allPOIsCache: DirectoryPOI[] | null = null;
  private cacheTimestamp: number | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Initialize the directory service and prefetch all POIs
   * Should be called once at app startup
   * Calculates distances for all POIs immediately (using fast Euclidean formula)
   */
  async initialize(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        console.log('DirectoryService: Initializing and fetching all POIs...');
        // The map instance is now initialized by the WayfinderMap component.
        // We will wait for it to be ready before fetching POIs.
        const rawPOIs = await this.fetchAllPOIs();

        // Calculate distances for all POIs once using fast formula
        this.allPOIsCache = this.augmentWithDistances(rawPOIs);
        this.cacheTimestamp = Date.now();
        console.log(`DirectoryService: Cached ${this.allPOIsCache.length} POIs with distances`);
      } catch (error) {
        console.error('DirectoryService: Failed to initialize', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Augment raw POIs with pre-computed distances from kiosk
   * Uses fast Euclidean formula (optimal for terminal-scale distances)
   */
  private augmentWithDistances(pois: SDKPOI[]): DirectoryPOI[] {
    const kioskLocation = wayfinderService.getKioskLocation();
    // Pre-compute cos(latitude) for efficiency
    const cosLat = Math.cos(kioskLocation.lat * Math.PI / 180);

    return pois.map((poi) => ({
      ...poi,
      distanceFromKiosk: fastDistanceMeters(
        kioskLocation.lat,
        kioskLocation.lng,
        poi.position.latitude,
        poi.position.longitude,
        cosLat
      ),
    }));
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.allPOIsCache !== null && this.isCacheValid();
  }

  /**
   * Get all shop POIs (retail, duty-free, etc.)
   */
  async getShopPOIs(): Promise<DirectoryPOI[]> {
    return this.getPOIsByCategory('shop', CATEGORY_PREFIXES.shop);
  }

  /**
   * Get all dining POIs (restaurants, cafes, etc.)
   */
  async getDinePOIs(): Promise<DirectoryPOI[]> {
    return this.getPOIsByCategory('dine', CATEGORY_PREFIXES.dine);
  }

  /**
   * Get all relaxation POIs (lounges, spas, etc.)
   */
  async getRelaxPOIs(): Promise<DirectoryPOI[]> {
    return this.getPOIsByCategory('relax', CATEGORY_PREFIXES.relax);
  }

  /**
   * Get the map instance, waiting for initialization if needed
   * Uses WayfinderService.waitForInstance() which is more efficient than polling
   * @private
   */
  private async getMapInstance(): Promise<WayfinderMap> {
    return wayfinderService.waitForInstance();
  }

  /**
   * Search for POIs by text query
   * @param query - Search term
   * @returns Matching POIs
   */
  async searchPOIs(query: string): Promise<SDKPOI[]> {
    if (!query.trim()) {
      return [];
    }

    const map = await this.getMapInstance();

    try {
      const results = await map.search(query, true);
      return results as SDKPOI[];
    } catch (error) {
      console.error('Error searching POIs:', error);
      throw new Error(`Failed to search POIs: ${query}`);
    }
  }

  /**
   * Get detailed information for a specific POI
   * @param poiId - POI identifier
   */
  async getPOIById(poiId: string): Promise<SDKPOI> {
    const map = await this.getMapInstance();

    try {
      return await map.getPOIDetails(poiId);
    } catch (error) {
      console.error(`Error fetching POI ${poiId}:`, error);
      throw new Error(`Failed to fetch POI details: ${poiId}`);
    }
  }

  /**
   * Fetch all POIs from the SDK
   * Returns POIs as an array with ID included in each POI object
   */
  private async fetchAllPOIs(): Promise<SDKPOI[]> {
    const map = await this.getMapInstance();

    // Try getAllPOIs first (returns object with POI IDs as keys)
    if (typeof map.getAllPOIs === 'function') {
      console.log('DirectoryService: Using getAllPOIs method');
      const poisObj = await map.getAllPOIs();

      // Convert to array, adding the ID to each POI
      const poisArray: SDKPOI[] = [];
      for (const [poiId, poi] of Object.entries(poisObj)) {
        poisArray.push({
          ...poi,
          id: poiId,
        } as SDKPOI);
      }
      return poisArray;
    }

    // Fallback: Use search with empty string
    console.log('DirectoryService: getAllPOIs not available, using search fallback');
    const results = await map.search('', true);

    if (Array.isArray(results)) {
      // Filter out string results and map POI objects
      const poiResults = results.filter(
        (item): item is SDKPOI => typeof item === 'object' && item !== null
      );
      return poiResults.map((poi, index) => ({
        ...poi,
        id: poi.poiId || `poi-${index}`,
      }));
    }

    console.error('DirectoryService: Unexpected search result format');
    return [];
  }

  /**
   * Get POIs filtered by category prefixes
   * Distances are pre-computed at initialization, so this just filters and sorts
   * @private
   */
  private async getPOIsByCategory(
    categoryKey: string,
    prefixes: readonly string[]
  ): Promise<DirectoryPOI[]> {
    // Check category cache first
    const cached = this.poiCache.get(categoryKey);
    if (cached && this.isCacheValid()) {
      return cached;
    }

    // Wait for initialization to complete (ensures single fetch)
    if (this.initPromise) {
      await this.initPromise;
    }

    // If still no cache after init, something went wrong
    if (!this.allPOIsCache) {
      throw new Error('DirectoryService not initialized');
    }

    // Filter by category prefixes (case-insensitive)
    // Distances are already computed in allPOIsCache
    const filtered = this.allPOIsCache.filter((poi) => {
      if (!poi.category) return false;
      const category = poi.category.toLowerCase();
      return prefixes.some((prefix) => category.startsWith(prefix.toLowerCase()));
    });

    // Get kiosk location for floor comparison
    const kioskLocation = wayfinderService.getKioskLocation();

    // Sort by floor (same floor first) then by pre-computed distance
    const sorted = [...filtered].sort((a, b) => {
      const aOnSameFloor = a.position.floorId === kioskLocation.floorId;
      const bOnSameFloor = b.position.floorId === kioskLocation.floorId;

      if (aOnSameFloor && !bOnSameFloor) return -1;
      if (!aOnSameFloor && bOnSameFloor) return 1;

      return a.distanceFromKiosk - b.distanceFromKiosk;
    });

    // Cache the sorted results for this category
    this.poiCache.set(categoryKey, sorted);

    return sorted;
  }

  /**
   * Check if the cache is still valid
   * @private
   */
  private isCacheValid(): boolean {
    if (!this.cacheTimestamp) return false;
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }

  /**
   * Clear all cached POI data
   * Useful when switching venues or forcing a refresh
   */
  clearCache(): void {
    this.poiCache.clear();
    this.allPOIsCache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Ensure initialization is complete before accessing cache
   * @private
   */
  private async ensureInitialized(): Promise<DirectoryPOI[]> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.allPOIsCache) {
      throw new Error('DirectoryService not initialized');
    }
    return this.allPOIsCache;
  }

  /**
   * Get POIs by security status (pre/post security)
   * @param afterSecurity - true for post-security, false for pre-security
   */
  async getPOIsBySecurityStatus(afterSecurity: boolean): Promise<DirectoryPOI[]> {
    const pois = await this.ensureInitialized();
    return pois.filter((poi) => poi.isAfterSecurity === afterSecurity);
  }

  /**
   * Get all navigable POIs
   */
  async getNavigablePOIs(): Promise<DirectoryPOI[]> {
    const pois = await this.ensureInitialized();
    return pois.filter((poi) => poi.isNavigable);
  }

  /**
   * Get all POIs (for debugging or custom filtering)
   */
  async getAllPOIs(): Promise<DirectoryPOI[]> {
    return this.ensureInitialized();
  }

  /**
   * Get security checkpoint wait times
   * Returns POIs with category "security" that have queue/wait time data
   * Uses cached data for initial load, call refreshSecurityWaitTimes() for live updates
   */
  async getSecurityWaitTimes(): Promise<SecurityWaitTime[]> {
    const pois = await this.ensureInitialized();
    return this.extractSecurityWaitTimes(pois);
  }

  /**
   * Refresh security wait times with fresh data from SDK
   * Call this for periodic updates to get live queue times
   */
  async refreshSecurityWaitTimes(): Promise<SecurityWaitTime[]> {
    const map = await this.getMapInstance();

    try {
      // Fetch fresh POI data from SDK
      console.log('DirectoryService: Refreshing security wait times...');
      const poisObj = await map.getAllPOIs();

      // Extract security POIs with their current dynamic data
      const freshPOIs: SDKPOI[] = [];
      for (const [poiId, poi] of Object.entries(poisObj)) {
        if (poi.category === 'security' && poi.dynamicData?.security) {
          freshPOIs.push({ ...poi, id: poiId } as SDKPOI);
        }
      }

      return this.extractSecurityWaitTimes(freshPOIs);
    } catch (error) {
      console.error('Error refreshing security wait times:', error);
      // Fall back to cached data on error
      return this.getSecurityWaitTimes();
    }
  }

  /**
   * Extract wait time data from POIs
   * @private
   */
  private extractSecurityWaitTimes(pois: (SDKPOI | DirectoryPOI)[]): SecurityWaitTime[] {
    // Filter for security POIs with dynamic data
    const securityPOIs = pois.filter(
      (poi) => poi.category === 'security' && poi.dynamicData?.security
    );

    // Map to simplified wait time objects
    return securityPOIs.map((poi) => ({
      id: poi.id || poi.poiId || poi.name,
      name: poi.name,
      queueType: poi.queue?.queueSubtype || 'standard',
      waitTimeMinutes: poi.dynamicData?.security?.queueTime ?? poi.queue?.defaultQueueTime ?? 0,
      isTemporarilyClosed: poi.dynamicData?.security?.isTemporarilyClosed ?? false,
      isRealTime: poi.dynamicData?.security?.timeIsReal ?? false,
      lastUpdated: poi.dynamicData?.security?.lastUpdated
        ? new Date(poi.dynamicData.security.lastUpdated)
        : null,
      location: poi.nearbyLandmark || poi.position.structureName || '',
    }));
  }
}

/**
 * Simplified security wait time data for UI display
 */
export interface SecurityWaitTime {
  id: string;
  name: string;
  queueType: string; // 'clear', 'tsa', 'precheck', 'standard'
  waitTimeMinutes: number;
  isTemporarilyClosed: boolean;
  isRealTime: boolean;
  lastUpdated: Date | null;
  location: string;
}

// Export singleton instance
export const directoryService = new DirectoryService();
