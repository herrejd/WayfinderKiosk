/**
 * WayfinderService - Singleton wrapper for Atrius Wayfinder JS SDK
 *
 * Manages SDK loading and maintains both fullscreen and headless map instances.
 * The fullscreen instance is used for interactive navigation display,
 * while the headless instance is used for data fetching operations.
 */

import { useKioskStore } from '@/store/kioskStore';
import type { LMInitSDK, WayfinderMap, WayfinderConfig } from '@/types/wayfinder-sdk';

const SDK_URL = 'https://maps.locuslabs.com/sdk/LocusMapsSDK.js';

const KIOSK_CONFIG = {
  accountId: 'A18L64IIIUQX7L',
  venueId: 'llia',
  kioskLocation: {
    pinTitle: 'You Are Here',
    lat: 36.08516393497611,
    lng: -115.15065662098584,
    floorId: 'llia-terminal1-departures',
    structureId: 'llia-terminal1',
  },
} as const;

class WayfinderService {
  private LMInit: LMInitSDK | null = null;
  private instance: WayfinderMap | null = null;
  private sdkLoadPromise: Promise<LMInitSDK> | null = null;

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

    const config: WayfinderConfig = {
      accountId: KIOSK_CONFIG.accountId,
      venueId: KIOSK_CONFIG.venueId,
      headless: false,
      pinnedLocation: KIOSK_CONFIG.kioskLocation,
      pinnedLocationZoom: 18,
      pinnedLocationFocusAtStart: true,
      uiHide: {
        sidebar: false,
        levelSelector: false,
        controls: false,
      },
      name: 'Atrius Aiport',
      noLangOptions: false,
    };

    try {
      this.instance = await LMInit.newMap(container, config);
      this.setupEventListeners(this.instance);
      return this.instance;
    } catch (error) {
      console.error('Error initializing Wayfinder instance:', error);
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
      lat: KIOSK_CONFIG.kioskLocation.lat,
      lng: KIOSK_CONFIG.kioskLocation.lng,
      floorId: KIOSK_CONFIG.kioskLocation.floorId,
    };
  }
}

// Export singleton instance
export const wayfinderService = new WayfinderService();
