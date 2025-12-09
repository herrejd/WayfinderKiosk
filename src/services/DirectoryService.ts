/**
 * DirectoryService - POI fetching and categorization
 *
 * Fetches and filters POIs from the headless SDK instance based on categories.
 * Implements caching to reduce redundant API calls.
 */

import type { SDKPOI } from '@/types/wayfinder-sdk';
import { wayfinderService } from './WayfinderService';

// POI category prefixes based on venue configuration
const CATEGORY_PREFIXES = {
  shop: ['shop', 'retail.', 'duty-free.'],
  dine: ['eat.', 'food.', 'restaurant.', 'cafe.'],
  relax: ['services.lounge', 'relax', 'amenities.'],
} as const;

class DirectoryService {
  private poiCache = new Map<string, SDKPOI[]>();
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
        await wayfinderService.initHeadless();
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
  async getShopPOIs(): Promise<SDKPOI[]> {
    return this.getPOIsByCategory('shop', CATEGORY_PREFIXES.shop);
  }

  /**
   * Get all dining POIs (restaurants, cafes, etc.)
   */
  async getDinePOIs(): Promise<SDKPOI[]> {
    return this.getPOIsByCategory('dine', CATEGORY_PREFIXES.dine);
  }

  /**
   * Get all relaxation POIs (lounges, spas, etc.)
   */
  async getRelaxPOIs(): Promise<SDKPOI[]> {
    return this.getPOIsByCategory('relax', CATEGORY_PREFIXES.relax);
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

    const headless = wayfinderService.getHeadless();
    if (!headless) {
      throw new Error('Headless map instance not initialized');
    }

    try {
      const results = await headless.search(query, true);
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
    const headless = wayfinderService.getHeadless();
    if (!headless) {
      throw new Error('Headless map instance not initialized');
    }

    try {
      return await headless.getPOIDetails(poiId);
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
    const headless = wayfinderService.getHeadless();
    if (!headless) {
      throw new Error('Headless map instance not initialized');
    }

    // Try getAllPOIs first (returns object with POI IDs as keys)
    if (typeof headless.getAllPOIs === 'function') {
      console.log('DirectoryService: Using getAllPOIs method');
      const poisObj = await headless.getAllPOIs();

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
    const results = await headless.search('', true);

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
  ): Promise<SDKPOI[]> {
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

      // Sort alphabetically by name
      filtered.sort((a, b) => a.name.localeCompare(b.name));

      // Cache the filtered results
      this.poiCache.set(categoryKey, filtered);

      return filtered;
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
}

// Export singleton instance
export const directoryService = new DirectoryService();
