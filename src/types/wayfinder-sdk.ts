/**
 * TypeScript interfaces for Atrius Wayfinder JS SDK
 * Based on LocusLabs SDK documentation
 */

/**
 * Location dictionary formats supported by SDK
 */
export type SDKLocation =
  | { poiId: string }
  | { lat: number; lng: number; ordinal: number }
  | { lat: number; lng: number; floorId: string };

/**
 * POI object schema from SDK
 * Based on getAllPOIs() response: { poiId: poiObject, ... }
 */
export interface SDKPOI {
  id?: string; // Added when converting from getAllPOIs() object format
  poiId?: string; // Legacy field
  name: string;
  category: string;
  description?: string;
  position: {
    latitude: number;
    longitude: number;
    floorId: string;
    structureName?: string;
    buildingId?: string;
  };
  isNavigable?: boolean;
  isAfterSecurity?: boolean;
  images?: string[]; // Array of image URLs
  keywords?: Array<{
    name: string;
    isDisplayed: boolean;
    isUserSearchable: boolean;
  }>;
  links?: Array<{
    type: string;
    url: string;
  }>;
  operationHours?: string;
  phone?: string;
  nearbyLandmark?: string;
  zoomRadius?: string;
}

/**
 * Directions result from SDK
 */
export interface SDKDirections {
  eta: number;
  distance: number;
  steps: Array<{
    instruction: string;
    distance: number;
    floorId: string;
  }>;
}

/**
 * Map position result
 */
export interface SDKMapPosition {
  lat: number;
  lng: number;
  ordinal: number;
  floorId: string;
  structureId: string;
}

/**
 * Map status for events
 */
export interface SDKMapStatus {
  position: SDKMapPosition;
  zoom: number;
  pitch: number;
}

/**
 * Level status for levelChange events
 */
export interface SDKLevelStatus {
  floorId: string;
  structureId: string;
  ordinal: number;
}

/**
 * Venue data from SDK
 */
export interface SDKVenueData {
  name: string;
  id: string;
  category: string;
  address: string;
  securityQueueTypes: string[];
}

/**
 * Structure data from SDK
 */
export interface SDKStructure {
  name: string;
  id: string;
  levels: Array<{
    id: string;
    name: string;
    ordinal: number;
  }>;
}

/**
 * Wayfinder SDK Map instance interface
 */
export interface WayfinderMap {
  // Navigation & Directions
  showNavigation(
    from: SDKLocation,
    to: SDKLocation,
    accessible?: boolean,
    securityLanes?: string[]
  ): Promise<void>;

  getDirections(
    from: SDKLocation,
    to: SDKLocation,
    accessible?: boolean,
    securityLanes?: string[]
  ): Promise<SDKDirections>;

  showNavigationMultiple(
    waypoints: SDKLocation[],
    accessible?: boolean,
    securityLanes?: string[]
  ): Promise<void>;

  // POI Operations
  getAllPOIs(): Promise<Record<string, SDKPOI>>; // Returns object with POI IDs as keys
  search(term: string, details?: boolean): Promise<SDKPOI[] | string[]>;
  getPOIDetails(poiId: string): Promise<SDKPOI>;
  showPOI(poiId: string): void;
  showPOIResults(poiIds: string[]): void;
  hidePOIResults(): void;
  showSearch(searchTerm: string): void;
  resetSearch(): void;

  // Map Control
  setPosition(location: SDKLocation): void;
  getPosition(): SDKMapPosition;
  showLevel(ordinal: number): void;
  zoomTo(zoom: number): void;
  zoomBy(zoomDelta: number): void;
  getZoom(): number;
  minZoom(): number;
  maxZoom(): number;
  setBearing(bearing: number): void;
  setPitch(pitch: number): void;
  resetMap(): void;
  setViewportBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    ordinal?: number
  ): void;

  // Drawing & Markers
  drawMarker(name: string, location: SDKLocation, imageUrl?: string): void;
  hideMarker(name: string): void;
  drawLines(
    groupName: string,
    coords: Array<[number, number]>,
    style: { color: string; width: number },
    ordinal: number
  ): void;
  clearLines(groupName: string): void;

  // Venue Data
  getVenueData(): Promise<SDKVenueData>;
  getStructures(): Promise<SDKStructure[]>;
  showStructure(structureId: string): void;
  switchVenue(venueId: string): void;

  // State Management
  getState(): string;
  setState(stateIdentifier: string): void;
  setLanguage(languageCode: string): void;

  // Utility
  enablePoiSelection(enabled: boolean): void;
  destroy(): void;

  // Events
  on(
    event: 'userMoveStart' | 'userMoving' | 'moveEnd',
    callback: (eventName: string, mapStatus: SDKMapStatus) => void
  ): void;
  on(
    event: 'levelChange',
    callback: (eventName: string, levelStatus: SDKLevelStatus) => void
  ): void;
  on(
    event: 'poiSelected' | 'poiShown',
    callback: (eventName: string, poiDetails: SDKPOI) => void
  ): void;

  // Event-based command system
  fire(command: string, params?: Record<string, unknown>): void;
  observe(event: string, callback: (...args: unknown[]) => void): void;
  filter(filterFn: unknown): void;
  detach(): void;

  // Debugging
  help(): string | object;
  getCommandJSON(): string | object;
  setLogging(enabled: boolean): void;
}

/**
 * SDK initialization config
 */
export interface WayfinderConfig {
  accountId: string;
  venueId: string;
  headless: boolean;
  pinnedLocation?: {
    pinTitle?: string;
    lat: number;
    lng: number;
    floorId: string;
    structureId: string;
  };
  pinnedLocationZoom?: number;
  pinnedLocationFocusAtStart?: boolean;
  uiHide?: {
    sidebar?: boolean;
    controls?: boolean;
    levelSelector?: boolean;
  };
  name?: string;
  noLangOptions?: boolean;
}

/**
 * LMInit SDK entry point
 */
export interface LMInitSDK {
  setLogging(enabled: boolean): void;
  newMap(containerSelector: string | null, config: WayfinderConfig): Promise<WayfinderMap>;
}
