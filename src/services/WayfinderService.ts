/**
 * WayfinderService - Singleton wrapper for Atrius Wayfinder JS SDK
 *
 * Manages SDK loading and maintains both fullscreen and headless map instances.
 * The fullscreen instance is used for interactive navigation display,
 * while the headless instance is used for data fetching operations.
 */

import { useKioskStore } from '@/store/kioskStore';
import { config } from '@/config';
import type { LMInitSDK, WayfinderMap, WayfinderConfig } from '@/types/wayfinder-sdk';

const SDK_URL = 'https://maps.locuslabs.com/sdk/LocusMapsSDK.js';

class WayfinderService {
  private LMInit: LMInitSDK | null = null;
  private instance: WayfinderMap | null = null;
  private sdkLoadPromise: Promise<LMInitSDK> | null = null;

  // Deferred promise for waitForInstance() - allows callers to await map initialization
  private instanceDeferred: {
    promise: Promise<WayfinderMap>;
    resolve: (map: WayfinderMap) => void;
    reject: (error: Error) => void;
  } | null = null;

  /**
   * Dynamically load the SDK script
   * Returns cached promise if already loading/loaded
   */
  async loadSDK(): Promise<LMInitSDK> {
    // Return cached instance if available
    if (this.LMInit) {
      return this.LMInit;
    }

    // Return in-progress load if already loading
    if (this.sdkLoadPromise) {
      return this.sdkLoadPromise;
    }

    // Start new SDK load using dynamic import
    this.sdkLoadPromise = (async () => {
      try {
        console.log('Loading Wayfinder SDK from:', SDK_URL);

        // Dynamically import the SDK module
        const module = await import(/* @vite-ignore */ SDK_URL);
        console.log('SDK module loaded:', module);

        const LMInit = module.default as LMInitSDK;

        if (!LMInit) {
          console.error('SDK module contents:', Object.keys(module));
          throw new Error('SDK loaded but LMInit not found');
        }

        console.log('LMInit found, configuring...');

        // Enable logging in development mode
        const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
        LMInit.setLogging(isDev);

        this.LMInit = LMInit;
        console.log('Wayfinder SDK loaded successfully');
        return LMInit;
      } catch (error) {
        console.error('Failed to load Wayfinder SDK:', error);
        throw new Error(`Failed to load Wayfinder SDK: ${error instanceof Error ? error.message : error}`);
      }
    })();

    return this.sdkLoadPromise;
  }

  /**
   * Initialize the single, shared map instance
   * @param container - CSS selector for the container element
   */
  async init(container: string): Promise<WayfinderMap> {
    // If instance exists, destroy it before creating a new one
    if (this.instance) {
      this.destroy();
    }

    const LMInit = await this.loadSDK();

    // Build SDK configuration from environment variables
    const sdkConfig: WayfinderConfig = {
      accountId: config.wayfinder.accountId,
      venueId: config.wayfinder.venueId,
      headless: false,
      pinnedLocation: config.kioskLocation,
      pinnedLocationZoom: 18,
      pinnedLocationFocusAtStart: true,
      uiHide: {
        sidebar: false,
        levelSelector: false,
        controls: false,
      },
      name: config.appName,
      noLangOptions: false,
    };

    // Add POI categories for quick actions if configured (all languages)
    if (config.poiCategoriesConfig) {
      // Spread all POI category keys (poiCategories, poiCategories-es, poiCategories-fr) into SDK config
      Object.entries(config.poiCategoriesConfig).forEach(([key, value]) => {
        (sdkConfig as any)[key] = value;
      });
      console.log('Added POI categories to config:', Object.keys(config.poiCategoriesConfig));
    }

    // Configure plugins
    const plugins: Record<string, unknown> = {};

    // Add flight status plugin if enabled
    if (config.flightStatusEnabled) {
      const flightStatusConfig: Record<string, unknown> = {};

      // Add API key if provided
      if (config.flightStatusApiKey) {
        flightStatusConfig.apiKey = config.flightStatusApiKey;
      }

      plugins.flightStatus = flightStatusConfig;
      console.log('Flight status plugin enabled');
    }

    // Add plugins to SDK config if any are configured
    if (Object.keys(plugins).length > 0) {
      (sdkConfig as any).plugins = plugins;
      console.log('Final SDK plugins config:', JSON.stringify(plugins, null, 2));
    }

    try {
      this.instance = await LMInit.newMap(container, sdkConfig);
      this.setupEventListeners(this.instance);

      // Resolve any pending waitForInstance() calls
      if (this.instanceDeferred) {
        this.instanceDeferred.resolve(this.instance);
      }

      return this.instance;
    } catch (error) {
      console.error('Error initializing Wayfinder instance:', error);

      // Reject any pending waitForInstance() calls and reset for potential retry
      if (this.instanceDeferred) {
        this.instanceDeferred.reject(
          error instanceof Error ? error : new Error('Failed to initialize map instance')
        );
        this.instanceDeferred = null;
      }

      throw new Error('Failed to initialize map instance');
    }
  }

  /**
   * Set up event listeners for map interactions
   * Used for analytics and inactivity timer reset
   */
  private setupEventListeners(map: WayfinderMap): void {
    // Track user interactions for inactivity timer
    map.on('userMoveStart', () => {
      window.dispatchEvent(new CustomEvent('map-interaction'));
    });

    // Track POI selections for analytics
    map.on('poiSelected', (_, poi) => {
      window.dispatchEvent(
        new CustomEvent('poi-selected', {
          detail: { poiId: poi.poiId, name: poi.name, category: poi.category },
        })
      );
    });

    // Track level changes
    map.on('levelChange', (_, levelStatus) => {
      window.dispatchEvent(
        new CustomEvent('level-changed', {
          detail: levelStatus,
        })
      );
    });
  }

  /**
   * Get the single map instance
   * Returns null if not initialized
   */
  getInstance(): WayfinderMap | null {
    return this.instance;
  }

  /**
   * Lazily create the deferred promise structure
   * Used internally by waitForInstance()
   */
  private getInstanceDeferred() {
    if (!this.instanceDeferred) {
      let resolve!: (map: WayfinderMap) => void;
      let reject!: (error: Error) => void;
      const promise = new Promise<WayfinderMap>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      this.instanceDeferred = { promise, resolve, reject };
    }
    return this.instanceDeferred;
  }

  /**
   * Wait for the map instance to be available
   * Returns immediately if already initialized, otherwise waits for init() to complete
   * This is more efficient than polling getInstance() in a loop
   */
  waitForInstance(): Promise<WayfinderMap> {
    if (this.instance) {
      return Promise.resolve(this.instance);
    }
    return this.getInstanceDeferred().promise;
  }

  /**
   * Destroy the map instance and clean up resources
   */
  destroy(): void {
    if (this.instance) {
      try {
        // Use the 'fire' method, as direct calls are not working
        if (typeof (this.instance as any).fire === 'function') {
          (this.instance as any).fire('destroy');
          console.log('Map instance destroyed via fire().');
        } else {
          console.warn('destroy: .fire() method not found on instance.');
        }
      } catch (error) {
        console.error('Error destroying instance:', error);
      }
      this.instance = null;
      // Reset deferred so future waitForInstance() calls create a fresh promise
      this.instanceDeferred = null;
    }
  }

  /**
   * Triggers the flight search on the map
   * When config.flightSearchShowUI is true (default), first opens the gate.departures
   * search panel via showSearch(), then performs the search via flightSetSearch()
   * @param query - The flight number or airline code
   * @param showUI - Override config to control showSearch behavior (optional)
   */
  flightSearch(query: string, showUI?: boolean): void {
    if (!this.instance) {
      console.warn('flightSearch: No map instance available');
      return;
    }

    const sdkMap = this.instance as any;

    // Use parameter override if provided, otherwise use config
    const shouldShowUI = showUI !== undefined ? showUI : config.flightSearchShowUI;
    console.log(`flightSearch: showUI=${shouldShowUI}, config.flightSearchShowUI=${config.flightSearchShowUI}`);

    // Step 1: Optionally open the departures search UI first
    if (shouldShowUI) {
      if (typeof sdkMap.showSearch === 'function') {
        sdkMap.showSearch('gate.departures');
        console.log('showSearch(gate.departures) called to open search UI');
      } else {
        console.warn('flightSearch: showSearch() method not found on instance');
      }

      // Step 2: Delay the actual search to allow UI to open
      setTimeout(() => {
        this.performFlightSearch(query);
      }, 300);
    } else {
      // Skip showSearch, call flightSetSearch directly
      this.performFlightSearch(query);
    }
  }

  /**
   * Internal method to perform the actual flight search
   * @param query - The flight number or airline code
   */
  private performFlightSearch(query: string): void {
    if (!this.instance) return;

    const sdkMap = this.instance as any;
    if (typeof sdkMap.flightSetSearch === 'function') {
      sdkMap.flightSetSearch(query);
      console.log(`flightSetSearch command sent with query: ${query}`);
    } else {
      console.warn('flightSearch: flightSetSearch() method not found on instance');
    }
  }

  /**
   * Restore the map to its saved initial state
   */
  restoreInitialState(): void {
    if (this.instance) {
      const initialMapState = useKioskStore.getState().initialMapState;
      if (initialMapState) {
        // Reverting to fire() as the direct setState() call causes a DataCloneError
        if (typeof (this.instance as any).fire === 'function') {
          (this.instance as any).fire('setState', { state: initialMapState });
          console.log('Map state restored to initial state via fire().');
        } else {
          console.warn('restoreInitialState: .fire() method not found on instance.');
        }
      } else {
        console.warn('restoreInitialState: No initial map state saved.');
      }
    }
  }

  /**
   * Get the kiosk location configuration
   */
  getKioskLocation() {
    return {
      lat: config.kioskLocation.lat,
      lng: config.kioskLocation.lng,
      floorId: config.kioskLocation.floorId,
    };
  }

  /**
   * Set the map UI language
   * POI categories for each language are loaded at initialization time
   * @param language - Language code ('en', 'es', 'fr')
   */
  setLanguage(language: 'en' | 'es' | 'fr'): void {
    if (this.instance) {
      try {
        (this.instance as any).setLanguage(language);
        console.log(`Map language set to: ${language}`);
      } catch (error) {
        console.error('Error setting map language:', error);
      }
    }
  }
}

// Export singleton instance
export const wayfinderService = new WayfinderService();
