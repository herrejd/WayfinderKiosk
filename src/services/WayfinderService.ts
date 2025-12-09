/**
 * WayfinderService - Singleton wrapper for Atrius Wayfinder JS SDK
 *
 * Manages SDK loading and maintains both fullscreen and headless map instances.
 * The fullscreen instance is used for interactive navigation display,
 * while the headless instance is used for data fetching operations.
 */

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
  private fullscreenInstance: WayfinderMap | null = null;
  private headlessInstance: WayfinderMap | null = null;
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
   * Initialize headless instance for data fetching
   * Does not require a DOM container
   */
  async initHeadless(): Promise<WayfinderMap> {
    if (this.headlessInstance) {
      return this.headlessInstance;
    }

    const LMInit = await this.loadSDK();

    const config: WayfinderConfig = {
      accountId: KIOSK_CONFIG.accountId,
      venueId: KIOSK_CONFIG.venueId,
      headless: true,
    };

    try {
      this.headlessInstance = await LMInit.newMap(null, config);
      return this.headlessInstance;
    } catch (error) {
      console.error('Error initializing headless Wayfinder instance:', error);
      throw new Error('Failed to initialize headless map instance');
    }
  }

  /**
   * Initialize fullscreen instance for interactive map display
   * @param container - CSS selector for the container element
   */
  async initFullscreen(container: string): Promise<WayfinderMap> {
    // If instance exists, destroy it before creating a new one
    if (this.fullscreenInstance) {
      this.destroyFullscreen();
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
      this.fullscreenInstance = await LMInit.newMap(container, config);
      this.setupEventListeners(this.fullscreenInstance);
      return this.fullscreenInstance;
    } catch (error) {
      console.error('Error initializing fullscreen Wayfinder instance:', error);
      throw new Error('Failed to initialize fullscreen map instance');
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
   * Get the headless map instance
   * Returns null if not initialized
   */
  getHeadless(): WayfinderMap | null {
    return this.headlessInstance;
  }

  /**
   * Get the fullscreen map instance
   * Returns null if not initialized
   */
  getFullscreen(): WayfinderMap | null {
    return this.fullscreenInstance;
  }

  /**
   * Destroy only the fullscreen map instance.
   * This is called by the map component on unmount.
   */
  destroyFullscreen(): void {
    if (this.fullscreenInstance) {
      try {
        // Use the 'fire' method, as direct calls are not working
        if (typeof (this.fullscreenInstance as any).fire === 'function') {
          (this.fullscreenInstance as any).fire('destroy');
          console.log('Fullscreen map instance destroyed via fire().');
        } else {
          console.warn('destroyFullscreen: .fire() method not found on instance.');
        }
      } catch (error) {
        console.error('Error destroying fullscreen instance:', error);
      }
      this.fullscreenInstance = null;
    }
  }

  /**
   * Destroy all map instances and clean up resources
   * Should be called when the application unmounts
   */
  destroy(): void {
    this.destroyFullscreen();

    if (this.headlessInstance) {
      try {
        this.headlessInstance.destroy();
        console.log('Headless map instance destroyed.');
      } catch (error) {
        console.error('Error destroying headless instance:', error);
      }
      this.headlessInstance = null;
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
