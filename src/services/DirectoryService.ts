/**
 * DirectoryService - POI fetching and categorization
 *
 * Fetches and filters POIs from the headless SDK instance based on categories.
 * Implements caching to reduce redundant API calls.
 */

import type { SDKPOI, WayfinderMap } from '@/types/wayfinder-sdk';
import { wayfinderService } from './WayfinderService';

// Helper functions for distance calculation
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function getDistanceM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Distance in meters
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
  private allPOIsCache: SDKPOI[] | null = null;
  private cacheTimestamp: number | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Initialize the directory service and prefetch all POIs
   * Should be called once at app startup
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
        this.allPOIsCache = await this.fetchAllPOIs();
        this.cacheTimestamp = Date.now();
        console.log(`DirectoryService: Cached ${this.allPOIsCache.length} POIs`);
      } catch (error) {
        console.error('DirectoryService: Failed to initialize', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
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
   * @private
   */
  private async getPOIsByCategory(
    categoryKey: string,
    prefixes: readonly string[]
  ): Promise<DirectoryPOI[]> {
    // Check cache
    const cached = this.poiCache.get(categoryKey);
    if (cached && this.isCacheValid()) {
      return cached;
    }

    try {
      // Fetch all POIs if not cached
      if (!this.allPOIsCache || !this.isCacheValid()) {
        this.allPOIsCache = await this.fetchAllPOIs();
        this.cacheTimestamp = Date.now();
      }

      // Filter by category prefixes (case-insensitive)
      const filtered = this.allPOIsCache.filter((poi) => {
        if (!poi.category) return false;
        const category = poi.category.toLowerCase();
        return prefixes.some((prefix) => category.startsWith(prefix.toLowerCase()));
      });

      // Get kiosk location to calculate distances
      const kioskLocation = wayfinderService.getKioskLocation();

      // Augment POIs with distance from kiosk
      const poisWithDistance = filtered.map((poi) => {
        const distance = getDistanceM(
          kioskLocation.lat,
          kioskLocation.lng,
          poi.position.latitude,
          poi.position.longitude
        );
        return { ...poi, distanceFromKiosk: distance };
      });

      // Sort by floor and then by distance
      poisWithDistance.sort((a, b) => {
        const aOnSameFloor = a.position.floorId === kioskLocation.floorId;
        const bOnSameFloor = b.position.floorId === kioskLocation.floorId;

        if (aOnSameFloor && !bOnSameFloor) return -1;
        if (!aOnSameFloor && bOnSameFloor) return 1;
        
        return a.distanceFromKiosk - b.distanceFromKiosk;
      });

      // Cache the sorted results
      this.poiCache.set(categoryKey, poisWithDistance);

      return poisWithDistance;
    } catch (error) {
      console.error(`Error fetching ${categoryKey} POIs:`, error);
      throw new Error(`Failed to fetch ${categoryKey} POIs`);
    }
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
   * Get POIs by security status (pre/post security)
   * @param afterSecurity - true for post-security, false for pre-security
   */
  async getPOIsBySecurityStatus(afterSecurity: boolean): Promise<SDKPOI[]> {
    if (!this.allPOIsCache || !this.isCacheValid()) {
      this.allPOIsCache = await this.fetchAllPOIs();
      this.cacheTimestamp = Date.now();
    }

    return this.allPOIsCache.filter((poi) => poi.isAfterSecurity === afterSecurity);
  }

  /**
   * Get all navigable POIs
   */
  async getNavigablePOIs(): Promise<SDKPOI[]> {
    if (!this.allPOIsCache || !this.isCacheValid()) {
      this.allPOIsCache = await this.fetchAllPOIs();
      this.cacheTimestamp = Date.now();
    }

    return this.allPOIsCache.filter((poi) => poi.isNavigable);
  }

  /**
   * Get all POIs (for debugging or custom filtering)
   */
  async getAllPOIs(): Promise<SDKPOI[]> {
    if (!this.allPOIsCache || !this.isCacheValid()) {
      this.allPOIsCache = await this.fetchAllPOIs();
      this.cacheTimestamp = Date.now();
    }
    return this.allPOIsCache;
  }

  /**
   * Get security checkpoint wait times
   * Returns POIs with category "security" that have queue/wait time data
   */
  async getSecurityWaitTimes(): Promise<SecurityWaitTime[]> {
    if (!this.allPOIsCache || !this.isCacheValid()) {
      this.allPOIsCache = await this.fetchAllPOIs();
      this.cacheTimestamp = Date.now();
    }

    // Filter for security POIs with dynamic data
    const securityPOIs = this.allPOIsCache.filter(
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
