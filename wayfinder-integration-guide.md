# Atrius Wayfinder JS SDK Integration Guide

## Overview

The Atrius Wayfinder JS SDK (formerly LocusLabs) provides indoor mapping and wayfinding capabilities. This guide covers integration for the airport kiosk application.

---

## SDK Basics

### Key Concepts

- **Venue ID**: Unique identifier for the airport/facility (e.g., 'lax' for Los Angeles International)
- **Account ID**: Your Atrius account identifier
- **Headless Mode**: `false` for full UI with controls, `true` for programmatic-only access
- **Map Instance**: The primary object for interacting with the map

### Installation Options

Based on our tech stack (React + Vite), we have several options:

1. **ES6 Module Import** (Recommended for React)
```javascript
import LMInit from 'https://maps.locuslabs.com/sdk/LocusMapsSDK.js'
```

2. **NPM Package** (if available)
```bash
npm install @locuslabs/sdk
```

3. **Script Tag** (fallback)
```html
<script src="https://maps.locuslabs.com/sdk/LocusMapsSDK.js"></script>
```

---

## Basic Fullscreen Map Implementation

### Vanilla HTML/JS Example (from docs)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script type="module">
        import LMInit from 'https://maps.locuslabs.com/sdk/LocusMapsSDK.js'

        const config = {
            venueId: 'lax',
            accountId: 'A11F4Y6SZRXH4X',
            headless: false
        }

        window.LMInit = LMInit
        LMInit.setLogging(true)
        LMInit.newMap('.mymap', config)
            .then(m => { window.map = m; })
            .catch(e => console.error('Error initializing map: ', e))
    </script>
    <style>
        html, body, .mymap {
            height: 100%; 
            margin: 0; 
            padding: 0;
        }
    </style>
</head>
<body>
    <div class="mymap" style="height: 100%;"></div>
</body>
</html>
```

### Key Features (Fullscreen Mode)

When `headless: false`, the SDK provides:
- **Search**: POI and location search
- **Directions**: Route planning and display
- **POI Info**: Details when clicking on points of interest
- **Levels**: Floor/level switching for multi-level venues
- **Zoom**: Pan and zoom controls
- **Additional overlays**: Venue-specific controls

---

## React Integration Approach

### 1. Create a Wayfinder Service

```typescript
// services/WayfinderService.ts

export interface WayfinderConfig {
  venueId: string;
  accountId: string;
  headless: boolean;
}

export interface WayfinderMap {
  // Map instance methods - to be filled in as we explore SDK
  destroy: () => void;
  // Add more as discovered
}

class WayfinderService {
  private LMInit: any = null;
  private mapInstance: WayfinderMap | null = null;

  async initialize() {
    if (!this.LMInit) {
      // Dynamic import for SDK
      const module = await import('https://maps.locuslabs.com/sdk/LocusMapsSDK.js');
      this.LMInit = module.default;
      this.LMInit.setLogging(process.env.NODE_ENV === 'development');
    }
    return this.LMInit;
  }

  async createMap(
    containerSelector: string, 
    config: WayfinderConfig
  ): Promise<WayfinderMap> {
    const LMInit = await this.initialize();
    
    try {
      this.mapInstance = await LMInit.newMap(containerSelector, config);
      return this.mapInstance;
    } catch (error) {
      console.error('Error initializing Wayfinder map:', error);
      throw error;
    }
  }

  getMapInstance(): WayfinderMap | null {
    return this.mapInstance;
  }

  destroyMap() {
    if (this.mapInstance) {
      this.mapInstance.destroy();
      this.mapInstance = null;
    }
  }
}

export const wayfinderService = new WayfinderService();
```

### 2. Create a Map Component

```typescript
// components/WayfinderMap.tsx
import { useEffect, useRef, useState } from 'react';
import { wayfinderService, WayfinderConfig, WayfinderMap } from '../services/WayfinderService';

interface WayfinderMapProps {
  config: WayfinderConfig;
  onMapReady?: (map: WayfinderMap) => void;
  className?: string;
}

export const WayfinderMap: React.FC<WayfinderMapProps> = ({ 
  config, 
  onMapReady,
  className = 'wayfinder-map'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      if (!containerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Create unique selector for this instance
        const selector = `.${className}`;
        
        const map = await wayfinderService.createMap(selector, config);
        
        if (mounted) {
          setIsLoading(false);
          onMapReady?.(map);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load map');
          setIsLoading(false);
        }
      }
    };

    initMap();

    return () => {
      mounted = false;
      wayfinderService.destroyMap();
    };
  }, [config, className, onMapReady]);

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{ height: '100%', width: '100%', position: 'relative' }}
    >
      {isLoading && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          zIndex: 1000
        }}>
          <span>Loading map...</span>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'red',
          zIndex: 1000
        }}>
          <span>Error: {error}</span>
        </div>
      )}
    </div>
  );
};
```

### 3. Use in Application

```typescript
// App.tsx or MapView.tsx
import { WayfinderMap } from './components/WayfinderMap';
import { WayfinderMap as WayfinderMapType } from './services/WayfinderService';

export const MapView = () => {
  const handleMapReady = (map: WayfinderMapType) => {
    console.log('Map is ready!', map);
    // Store map instance in state/context if needed for later interactions
  };

  const config = {
    venueId: 'YOUR_AIRPORT_CODE', // e.g., 'sea' for Seattle-Tacoma, 'lax' for LAX
    accountId: 'YOUR_ACCOUNT_ID',
    headless: false // Full UI with controls
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <WayfinderMap 
        config={config}
        onMapReady={handleMapReady}
      />
    </div>
  );
};
```

---

## Configuration for Different Use Cases

### Fullscreen Interactive Map (Gate Finder, POI Navigation)
```typescript
const fullscreenConfig = {
  venueId: 'airport_code',
  accountId: 'your_account_id',
  headless: false // Shows all controls
};
```

### Headless Mode (Directory Data Fetching)
```typescript
const headlessConfig = {
  venueId: 'airport_code',
  accountId: 'your_account_id',
  headless: true // No UI, programmatic access only
};
```

---

## Critical Implementation Notes

### 1. Container Requirements
- The div MUST have a defined height (percentage or pixels)
- The selector passed to `newMap()` must match the div class/id
- Parent containers should also have defined heights

### 2. Cleanup
- Always call `map.destroy()` when unmounting to prevent memory leaks
- Important for React components that mount/unmount

### 3. Error Handling
- Network failures during SDK load
- Invalid venue/account IDs
- Map initialization failures
- Handle gracefully with user-friendly messages

### 4. Loading States
- SDK takes time to download and initialize
- Show loading indicator during initialization
- Consider offline/cached fallback

---

## Next Steps for Integration

### Phase 1: Basic Map Display ✓
- [x] Understand SDK initialization
- [ ] Test basic map load with your venue/account
- [ ] Verify all controls appear correctly
- [ ] Test on touch devices

### Phase 2: Headless Mode for Directory
- [ ] Initialize second instance in headless mode
- [ ] Fetch POI data by category
- [ ] Parse and display in directory tabs

### Phase 3: Programmatic Interaction
- [ ] Trigger navigation to specific gate
- [ ] Highlight POIs programmatically
- [ ] Calculate routes
- [ ] Control zoom/pan from code

### Phase 4: Event Handling
- [ ] Listen for POI clicks
- [ ] Capture search queries
- [ ] Track user interactions

---

## Complete SDK API Reference

### Map Commands

#### Navigation & Directions

**`showNavigation(from, to, [accessible], [security_lanes])`**
Automatically displays a route and step-by-step directions on the map with the built-in directions UI.

```typescript
// Navigate from kiosk to a POI by ID
map.showNavigation(
  { poiId: 'kiosk-location' },
  { poiId: '210' }, // Gate or POI ID
  false // wheelchair accessible (true for accessible routes)
);

// Navigate using coordinates
map.showNavigation(
  { lat: 36.085, lng: -115.150, floorId: 'llia-terminal1-departures' },
  { poiId: 'gate-a1' },
  false
);
```

**Location Format Options:**
- `{ poiId: 'string' }` - Navigate to/from a POI by ID
- `{ lat: number, lng: number, ord: number }` - Coordinates with ordinal (floor number)
- `{ lat: number, lng: number, floorId: 'string' }` - Coordinates with floor ID

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| from | object | Starting location (POI ID or coordinates) |
| to | object | Destination location (POI ID or coordinates) |
| accessible | boolean | `true` for wheelchair accessible routes (optional) |
| security_lanes | array | Specify security lane types if supported (optional) |

**Notes:**
- If security lanes are supported by the venue and omitted, the user will be prompted to choose a lane
- The directions UI overlay is automatically displayed with step-by-step instructions

**`getDirections(from, to, [accessible], [security_lanes])`** (headless mode)
Returns directions object with eta, distance, steps.
```typescript
const directions = await map.getDirections(
  { lat: 38.855885, lng: -77.042925, ordinal: 1 },
  { poiId: '210' }
);
// Returns: { eta, distance, steps, ... }
```

**`showNavigationMultiple(waypoints, [accessible], [security_lanes])`**
Multi-stop routing.

#### POI Operations

**`search(term, [details])`** (headless mode)
Search for POIs by name/keyword.
```typescript
// Get POI IDs only
const poiIds = await map.search('coffee');

// Get full POI objects
const pois = await map.search('coffee', true);
```

**`getPOIDetails(poiId)`** (headless mode)
Get detailed POI information.
```typescript
const poi = await map.getPOIDetails('210');
// Returns full POI object with all fields
```

**`showPOI(poiId)`**
Display POI overlay with details.
```typescript
map.showPOI('210');
```

**`showPOIResults(poiIds)`**
Display markers for multiple POIs.
```typescript
map.showPOIResults(['210', '211', '212']);
```

**`hidePOIResults()`**
Clear POI markers.

**`showSearch(searchTerm)`**
Trigger search UI programmatically.

**`resetSearch()`**
Clear search UI and results.

#### Map Control

**`setPosition(location)`**
Pan to a location.
```typescript
map.setPosition({ poiId: '210' });
map.setPosition({ lat: 38.855885, lng: -77.042925, ordinal: 1 });
```

**`getPosition()`**
Get current map position.
```typescript
const pos = map.getPosition();
// Returns: { lat, lng, ordinal, floorId, structureId }
```

**`showLevel(ordinal)`**
Switch floors.
```typescript
map.showLevel(2); // Go to floor 2
```

**`zoomTo(zoom)` / `zoomBy(zoomDelta)`**
Control zoom level.
```typescript
map.zoomTo(15.5);
map.zoomBy(-2); // Zoom out
```

**`getZoom()` / `minZoom()` / `maxZoom()`**
Zoom level management.

**`setBearing(bearing)` / `setPitch(pitch)`**
Control map rotation and tilt.

**`resetMap()`**
Return to initial view.

**`setViewportBounds(minLat, maxLat, minLng, maxLng, [ordinal])`**
Fit bounds in viewport.

#### Drawing & Markers

**`drawMarker(name, location, [imageUrl])`**
Add custom marker.
```typescript
map.drawMarker('kiosk', { poiId: 'current-location' }, '/kiosk-icon.png');
```

**`hideMarker(name)`**
Hide marker.

**`drawLines(groupName, coords, style, ordinal)`**
Draw custom paths/boundaries.
```typescript
map.drawLines(
  'custom-route',
  [[38.855, -77.042], [38.856, -77.043]],
  { color: '#FF0088', width: 4 },
  1 // ordinal
);
```

**`clearLines(groupName)`**
Remove drawn lines.

#### Venue Data

**`getVenueData()`** (headless mode)
Get venue information.
```typescript
const venue = await map.getVenueData();
// Returns: { name, id, category, address, securityQueueTypes, ... }
```

**`getStructures()`** (headless mode)
Get building/structure data.
```typescript
const structures = await map.getStructures();
// Returns: { name, id, levels, ... }
```

**`showStructure(structureId)`**
Focus on specific building.

**`switchVenue(venueId)`**
Change to different venue.

#### State Management

**`getState()`**
Capture current map state.
```typescript
const state = map.getState();
// Save state for later restoration
```

**`setState(stateIdentifier)`**
Restore saved state.

**`setLanguage(languageCode)`**
Change UI language.

#### Utility

**`enablePoiSelection(boolean)`**
Enable/disable POI click interactions.

**`destroy()`**
Clean up map instance (critical for SPAs).

### Events

Listen to map events using `map.on(eventName, callback)`.

#### Available Events

**`userMoveStart`**
User begins map interaction.
```typescript
map.on('userMoveStart', (eventName, mapStatus) => {
  console.log('User started moving', mapStatus);
  // mapStatus: { position, zoom, pitch }
});
```

**`userMoving`**
Fires repeatedly during map movement (use sparingly - high frequency).
```typescript
map.on('userMoving', (eventName, mapStatus) => {
  // Avoid heavy operations here
});
```

**`moveEnd`**
Map movement completed (user or programmatic).
```typescript
map.on('moveEnd', (eventName, mapStatus) => {
  console.log('Movement ended', mapStatus);
});
```

**`levelChange`**
Floor changed.
```typescript
map.on('levelChange', (eventName, levelStatus) => {
  console.log('Floor changed', levelStatus);
  // levelStatus: { floorId, structureId, ordinal, ... }
});
```

**`poiSelected`**
User clicked a POI on the map.
```typescript
map.on('poiSelected', (eventName, poiDetails) => {
  console.log(`POI selected: ${poiDetails.name}`, poiDetails);
});
```

**`poiShown`**
POI displayed (any reason: click, search, programmatic).
```typescript
map.on('poiShown', (eventName, poiDetails) => {
  console.log(`POI shown: ${poiDetails.name}`);
});
```

### POI Object Schema

```typescript
interface POI {
  poiId: string;                    // Unique identifier
  name: string;                     // Display name
  category: string;                 // e.g., "eat.bar", "shop.retail", "services.lounge"
  description: string;              // Full description
  position: {
    latitude: number;
    longitude: number;
    floorId: string;
    structureName: string;
    buildingId: string;
  };
  isNavigable: boolean;             // Can navigate to this POI
  isAfterSecurity: boolean;         // Pre/post security location
  images: string[];                 // Image URLs
  keywords: Array<{
    name: string;
    isDisplayed: boolean;
    isUserSearchable: boolean;
  }>;
  links: Array<{
    type: string;                   // "primary", etc.
    url: string;
  }>;
  operationHours: string;           // e.g., "Mo-Fr 05:00-22:00"
  phone: string;
  nearbyLandmark: string;           // Major landmark reference
  zoomRadius: string;               // Visibility zoom level
}
```

### Location Dictionary Formats

```typescript
// By POI ID
{ poiId: 'string' }

// By coordinates with ordinal (floor number)
{ lat: 38.855885, lng: -77.042925, ordinal: 1 }

// By coordinates with floor ID
{ lat: 38.855885, lng: -77.042925, floorId: 'terminal-c-departures' }
```

## POI Category Strategy for Directory

Based on the category schema (hierarchical with dot notation), here's how to organize the Directory tabs:

### Shop Tab
Filter for categories starting with:
- `shop.` - General retail
- `retail.` - Retail stores
- `duty-free.` - Duty-free shopping

### Dine Tab
Filter for categories starting with:
- `eat.` - All food/beverage
- `food.` - Food vendors
- `restaurant.` - Sit-down restaurants
- `cafe.` - Coffee shops

### Relax Tab
Filter for categories starting with:
- `services.lounge` - Airport lounges
- `services.spa` - Spa services
- `services.` - Other relaxation services
- `amenities.` - Rest areas, quiet zones

### Implementation Strategy

```typescript
async function getPOIsByCategory(map: WayfinderMap, categoryPrefix: string): Promise<POI[]> {
  // Search returns all POIs, filter by category
  const allPOIs = await map.search('', true); // Empty search returns all
  
  return allPOIs.filter(poi => 
    poi.category && poi.category.startsWith(categoryPrefix)
  );
}

// Usage
const shopPOIs = await getPOIsByCategory(map, 'shop.');
const dinePOIs = await getPOIsByCategory(map, 'eat.');
const relaxPOIs = await getPOIsByCategory(map, 'services.lounge');
```

---

## Practical Implementation Examples for Kiosk

### 1. Gate Finder with Barcode Scanner

```typescript
// services/GateFinderService.ts
import { wayfinderService } from './WayfinderService';

interface BoardingPassData {
  flightNumber: string;
  airline: string;
  gate: string;
  departureTime: string;
}

export class GateFinderService {
  async findGate(boardingPass: BoardingPassData) {
    const map = wayfinderService.getMapInstance();
    if (!map) throw new Error('Map not initialized');

    // Search for the gate by ID or name
    const gateQuery = `Gate ${boardingPass.gate}`;
    const results = await map.search(gateQuery, true);

    if (results.length === 0) {
      throw new Error(`Gate ${boardingPass.gate} not found`);
    }

    const gatePOI = results[0];

    // Get current kiosk location (predefined)
    const kioskLocation = { poiId: 'kiosk-location-1' };

    // Show navigation to gate
    map.showNavigation(kioskLocation, { poiId: gatePOI.poiId });

    return {
      poi: gatePOI,
      flightInfo: boardingPass
    };
  }

  async getDirectionsToGate(gateId: string, accessible: boolean = false) {
    const map = wayfinderService.getMapInstance();
    if (!map) throw new Error('Map not initialized');

    const kioskLocation = { poiId: 'kiosk-location-1' };
    
    const directions = await map.getDirections(
      kioskLocation,
      { poiId: gateId },
      accessible
    );

    return directions; // { eta, distance, steps }
  }
}

export const gateFinderService = new GateFinderService();
```

### 2. Directory Service with Category Filtering

```typescript
// services/DirectoryService.ts
import { wayfinderService } from './WayfinderService';

interface DirectoryPOI {
  poiId: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  operationHours: string;
  isAfterSecurity: boolean;
}

export class DirectoryService {
  private poiCache: Map<string, DirectoryPOI[]> = new Map();

  async getShopPOIs(): Promise<DirectoryPOI[]> {
    return this.getPOIsByCategories(['shop.', 'retail.', 'duty-free.']);
  }

  async getDinePOIs(): Promise<DirectoryPOI[]> {
    return this.getPOIsByCategories(['eat.', 'food.', 'restaurant.', 'cafe.']);
  }

  async getRelaxPOIs(): Promise<DirectoryPOI[]> {
    return this.getPOIsByCategories(['services.lounge', 'services.spa', 'amenities.']);
  }

  private async getPOIsByCategories(categoryPrefixes: string[]): Promise<DirectoryPOI[]> {
    const cacheKey = categoryPrefixes.join(',');
    
    // Check cache first
    if (this.poiCache.has(cacheKey)) {
      return this.poiCache.get(cacheKey)!;
    }

    // Use headless instance for data fetching
    const headlessMap = wayfinderService.getHeadlessInstance();
    if (!headlessMap) throw new Error('Headless map not initialized');

    try {
      // Empty search returns all POIs
      const allPOIs = await headlessMap.search('', true);

      const filtered = allPOIs.filter(poi => 
        categoryPrefixes.some(prefix => 
          poi.category && poi.category.toLowerCase().startsWith(prefix.toLowerCase())
        )
      );

      // Cache results
      this.poiCache.set(cacheKey, filtered);

      return filtered;
    } catch (error) {
      console.error('Error fetching POIs:', error);
      return [];
    }
  }

  async getPOIDetails(poiId: string) {
    const headlessMap = wayfinderService.getHeadlessInstance();
    if (!headlessMap) throw new Error('Headless map not initialized');

    return await headlessMap.getPOIDetails(poiId);
  }

  clearCache() {
    this.poiCache.clear();
  }
}

export const directoryService = new DirectoryService();
```

### 3. Enhanced Wayfinder Service with Dual Instances

```typescript
// services/WayfinderService.ts (Enhanced)
import type { WayfinderMap } from '../types/wayfinder';

export interface WayfinderConfig {
  venueId: string;
  accountId: string;
  headless: boolean;
}

class WayfinderService {
  private LMInit: any = null;
  private fullscreenMapInstance: WayfinderMap | null = null;
  private headlessMapInstance: WayfinderMap | null = null;

  async initialize() {
    if (!this.LMInit) {
      const module = await import('https://maps.locuslabs.com/sdk/LocusMapsSDK.js');
      this.LMInit = module.default;
      this.LMInit.setLogging(process.env.NODE_ENV === 'development');
    }
    return this.LMInit;
  }

  async createFullscreenMap(
    containerSelector: string,
    config: Omit<WayfinderConfig, 'headless'>
  ): Promise<WayfinderMap> {
    const LMInit = await this.initialize();

    try {
      this.fullscreenMapInstance = await LMInit.newMap(containerSelector, {
        ...config,
        headless: false
      });

      // Set up event listeners
      this.setupEventListeners(this.fullscreenMapInstance);

      return this.fullscreenMapInstance;
    } catch (error) {
      console.error('Error initializing fullscreen map:', error);
      throw error;
    }
  }

  async createHeadlessMap(
    config: Omit<WayfinderConfig, 'headless'>
  ): Promise<WayfinderMap> {
    const LMInit = await this.initialize();

    try {
      // Headless doesn't need a container
      this.headlessMapInstance = await LMInit.newMap(null, {
        ...config,
        headless: true
      });

      return this.headlessMapInstance;
    } catch (error) {
      console.error('Error initializing headless map:', error);
      throw error;
    }
  }

  private setupEventListeners(map: WayfinderMap) {
    // POI selection tracking
    map.on('poiSelected', (_, poi) => {
      console.log('POI Selected:', poi.name, poi.poiId);
      // Emit to analytics or state management
    });

    // Level changes
    map.on('levelChange', (_, levelStatus) => {
      console.log('Level changed:', levelStatus);
    });

    // Movement tracking (for auto-reset timer)
    map.on('userMoveStart', () => {
      // Reset inactivity timer
      this.resetInactivityTimer();
    });
  }

  private resetInactivityTimer() {
    // Implementation will be in the main app
    window.dispatchEvent(new CustomEvent('map-interaction'));
  }

  getMapInstance(): WayfinderMap | null {
    return this.fullscreenMapInstance;
  }

  getHeadlessInstance(): WayfinderMap | null {
    return this.headlessMapInstance;
  }

  destroyAllMaps() {
    if (this.fullscreenMapInstance) {
      this.fullscreenMapInstance.destroy();
      this.fullscreenMapInstance = null;
    }
    if (this.headlessMapInstance) {
      this.headlessMapInstance.destroy();
      this.headlessMapInstance = null;
    }
  }
}

export const wayfinderService = new WayfinderService();
```

### 4. React Component for Gate Finder

```typescript
// components/GateFinder.tsx
import { useState, useEffect } from 'react';
import { WayfinderMap } from './WayfinderMap';
import { gateFinderService } from '../services/GateFinderService';
import { BarcodeScannerInput } from './BarcodeScannerInput';

export const GateFinder = () => {
  const [scanning, setScanning] = useState(true);
  const [gateInfo, setGateInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBoardingPassScanned = async (data: BoardingPassData) => {
    setScanning(false);
    setError(null);

    try {
      const result = await gateFinderService.findGate(data);
      setGateInfo(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gate not found');
      setTimeout(() => setScanning(true), 3000);
    }
  };

  const handleBackToScan = () => {
    setScanning(true);
    setGateInfo(null);
    setError(null);
  };

  const config = {
    venueId: process.env.VENUE_ID!,
    accountId: process.env.ACCOUNT_ID!
  };

  return (
    <div className="gate-finder">
      {scanning ? (
        <div className="scanner-view">
          <h1>Scan Your Boarding Pass</h1>
          <BarcodeScannerInput onScan={handleBoardingPassScanned} />
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="map-view">
          {gateInfo && (
            <div className="flight-info">
              <h2>Gate {gateInfo.flightInfo.gate}</h2>
              <p>Flight {gateInfo.flightInfo.flightNumber}</p>
              <p>Departure: {gateInfo.flightInfo.departureTime}</p>
            </div>
          )}
          <WayfinderMap config={config} />
          <button 
            onClick={handleBackToScan}
            className="back-button"
            aria-label="Back to scanner"
          >
            Scan Another Boarding Pass
          </button>
        </div>
      )}
    </div>
  );
};
```

### 5. React Component for Directory

```typescript
// components/Directory.tsx
import { useState, useEffect } from 'react';
import { directoryService } from '../services/DirectoryService';
import { POICard } from './POICard';

type DirectoryTab = 'shop' | 'dine' | 'relax';

export const Directory = () => {
  const [activeTab, setActiveTab] = useState<DirectoryTab>('shop');
  const [pois, setPois] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPOI, setSelectedPOI] = useState<any>(null);

  useEffect(() => {
    loadPOIs(activeTab);
  }, [activeTab]);

  const loadPOIs = async (tab: DirectoryTab) => {
    setLoading(true);
    try {
      let results;
      switch (tab) {
        case 'shop':
          results = await directoryService.getShopPOIs();
          break;
        case 'dine':
          results = await directoryService.getDinePOIs();
          break;
        case 'relax':
          results = await directoryService.getRelaxPOIs();
          break;
      }
      setPois(results);
    } catch (error) {
      console.error('Error loading POIs:', error);
      setPois([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePOIClick = async (poi: any) => {
    // Show on map
    const map = wayfinderService.getMapInstance();
    if (map) {
      map.showPOI(poi.poiId);
    }
    setSelectedPOI(poi);
  };

  const handleGetDirections = (poi: any) => {
    const map = wayfinderService.getMapInstance();
    if (map) {
      map.showNavigation(
        { poiId: 'kiosk-location-1' },
        { poiId: poi.poiId }
      );
    }
  };

  return (
    <div className="directory">
      {/* WCAG-compliant tab navigation */}
      <div role="tablist" className="directory-tabs">
        <button
          role="tab"
          aria-selected={activeTab === 'shop'}
          aria-controls="shop-panel"
          onClick={() => setActiveTab('shop')}
          className={activeTab === 'shop' ? 'active' : ''}
        >
          Shop
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'dine'}
          aria-controls="dine-panel"
          onClick={() => setActiveTab('dine')}
          className={activeTab === 'dine' ? 'active' : ''}
        >
          Dine
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'relax'}
          aria-controls="relax-panel"
          onClick={() => setActiveTab('relax')}
          className={activeTab === 'relax' ? 'active' : ''}
        >
          Relax
        </button>
      </div>

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`${activeTab}-panel`}
        className="directory-content"
      >
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="poi-grid">
            {pois.map(poi => (
              <POICard
                key={poi.poiId}
                poi={poi}
                onClick={() => handlePOIClick(poi)}
                onGetDirections={() => handleGetDirections(poi)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 6. Inactivity Timer Hook

```typescript
// hooks/useInactivityTimer.ts
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useInactivityTimer = (timeoutMs: number = 60000) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // Reset to home screen
      navigate('/');
      
      // Reset map to initial state
      const map = wayfinderService.getMapInstance();
      if (map) {
        map.resetMap();
        map.resetSearch();
        map.hidePOIResults();
      }
    }, timeoutMs);
  };

  useEffect(() => {
    // Reset timer on any user interaction
    const events = ['mousedown', 'touchstart', 'keypress', 'map-interaction'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer(); // Start initial timer

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timeoutMs]);

  return resetTimer;
};
```

## Questions Resolved

✅ **POI Categories**: Categories use dot notation (e.g., `eat.bar`, `shop.retail`)
✅ **Gate Lookup**: Use `search()` method with gate name/number
✅ **Route Display**: `showNavigation()` for UI, `getDirections()` for data
✅ **Event Listeners**: 6 events available (userMoveStart, moveEnd, poiSelected, etc.)
✅ **Multi-instance**: YES - can run headless for data + fullscreen for UI simultaneously

## Remaining Questions

1. **Styling**: Can we customize UI colors/theme for airport branding?
2. **Security Lanes**: What are valid security queue types for your airport?
3. **Kiosk Location**: How to set/get the kiosk's physical location POI ID?
4. **Offline Support**: Does SDK support offline mode with cached venue data?

---

## Resources

- SDK CDN: `https://maps.locuslabs.com/sdk/LocusMapsSDK.js`
- Documentation: `https://docs.atrius.com/docs/wayfinder-js-sdk#/`
- **Account ID**: `A18L64IIIUQX7L`
- **Venue ID**: `llia`
- **Live Map**: `https://acuityairport.maps.atrius.com/`

---

## SDK Configuration Reference (Full)

### Configuration Properties

| Property | Type | Description |
|----------|------|-------------|
| `accountId` | string | Customer account ID (required) |
| `venueId` | string | Venue to render (required) |
| `headless` | boolean | `true` for data-only mode, no visual rendering |
| `name` | string | Name for this map instance (internal use) |
| `pinnedLocation` | object | Static "You Are Here" marker location |
| `pinnedLocationZoom` | number | Zoom level when focusing on pinned location (0-24) |
| `pinnedLocationFocusAtStart` | boolean | Auto-focus on pinned location at start (default: true) |
| `theme` | object | Custom map colors (see UI Customization) |
| `uiHide` | object | Hide specific UI elements |
| `noLangOptions` | boolean | Disable language selector (default: false) |
| `preserveStateInURL` | boolean | Include map state in URL |
| `supportURLDeepLinks` | boolean | Allow deep link params in URL |
| `initState` | string | Initial map state string (from `getState()`) |
| `desktopViewMinWidth` | number | Min width for desktop layout |
| `poiCategories` | array | Custom categories for sidebar |
| `defaultSearchTerms` | array | Default search suggestions |
| `deepLinkParms` | object | Deep linking parameters |

### Pinned Location (Kiosk "You Are Here")

**Production Kiosk Location:**
- **Latitude**: `36.08516393497611`
- **Longitude**: `-115.15065662098584`
- **Floor ID**: `llia-terminal1-departures`
- **Structure ID**: `llia-terminal1`

```typescript
const config = {
  accountId: 'A18L64IIIUQX7L',
  venueId: 'llia',
  headless: false,
  pinnedLocation: {
    pinTitle: 'You Are Here',
    lat: 36.08516393497611,
    lng: -115.15065662098584,
    floorId: 'llia-terminal1-departures',
    structureId: 'llia-terminal1'
  },
  pinnedLocationZoom: 18,
  pinnedLocationFocusAtStart: true,
  uiHide: {
    sidebar: true,      // Hide for kiosk mode
    controls: false,    // Keep zoom controls
    levelSelector: false
  },
  noLangOptions: true   // Disable language picker for kiosk
};
```

### UI Hide Options

```typescript
uiHide: {
  sidebar: boolean,       // Hide sidebar/search panel
  controls: boolean,      // Hide zoom controls
  levelSelector: boolean  // Hide floor selector
}
```

---

## Venue-Specific POI Categories (from llia config)

The live Acuity Airport map uses these POI categories:

| Display Name | Category Key | Notes |
|--------------|--------------|-------|
| Restaurants | `eat` | Food & dining |
| Shop | `shop` | Retail stores |
| Relax | `relax` | Lounges, relaxation |
| Restroom | `restroom` | Facilities |
| Airlines | `checkin` | Check-in counters |
| Flight Status | `gate.departures` | Departure gates |
| Parking | (searchTerm: "parking") | Uses search term instead |

### Updated Category Filtering Strategy

Based on actual venue configuration:

```typescript
// Shop Tab
const shopCategories = ['shop'];

// Dine Tab
const dineCategories = ['eat'];

// Relax Tab
const relaxCategories = ['relax'];

// Additional useful categories
const restroomCategories = ['restroom'];
const airlineCategories = ['checkin'];
const gateCategories = ['gate.departures'];
```

**Note**: The actual categories are simpler than originally documented. Use exact matches rather than prefix matching for this venue.
