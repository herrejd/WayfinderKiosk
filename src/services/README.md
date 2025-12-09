# Airport Wayfinder Kiosk - Service Layer

## Overview

This directory contains the service layer that integrates with the Atrius Wayfinder JS SDK and provides barcode scanning functionality.

## Services

### WayfinderService

**File**: `WayfinderService.ts`

Singleton wrapper for the Atrius Wayfinder JS SDK. Manages SDK loading and maintains both fullscreen and headless map instances.

**Key Methods**:
- `loadSDK()` - Dynamically loads the SDK script from CDN
- `initHeadless()` - Creates headless instance for data fetching operations
- `initFullscreen(container: string)` - Creates fullscreen map instance for display
- `getHeadless()` - Returns headless map instance
- `getFullscreen()` - Returns fullscreen map instance
- `destroy()` - Cleans up all map instances
- `getKioskLocation()` - Returns kiosk coordinates

**Configuration**:
- Account ID: `A18L64IIIUQX7L`
- Venue ID: `llia`
- Kiosk Location: `36.08516393497611, -115.15065662098584`
- Floor ID: `llia-terminal1-departures`

---

### DirectoryService

**File**: `DirectoryService.ts`

Fetches and filters POIs from the headless SDK instance. Implements caching to reduce redundant API calls.

**Key Methods**:
- `getShopPOIs()` - Returns all shopping POIs (shop, retail, duty-free categories)
- `getDinePOIs()` - Returns all dining POIs (eat, food, restaurant, cafe categories)
- `getRelaxPOIs()` - Returns all relaxation POIs (lounges, spas, amenities)
- `searchPOIs(query: string)` - Text search for POIs
- `getPOIById(id: string)` - Get detailed POI information
- `clearCache()` - Clears cached POI data

**Category Filters**:
- Shop: `shop.`, `retail.`, `duty-free.`
- Dine: `eat.`, `food.`, `restaurant.`, `cafe.`
- Relax: `services.lounge`, `services.spa`, `amenities.`

**Features**:
- 5-minute cache TTL
- Alphabetically sorted results
- Security status filtering (pre/post security)
- Navigable POI filtering

---

### GateFinderService

**File**: `GateFinderService.ts`

Handles gate lookup, route calculation, and flight number parsing.

**Key Methods**:
- `findGate(gateNumber: string)` - Searches for a gate by number
- `getRouteToGate(gateId: string, accessible?: boolean)` - Gets route with ETA and distance
- `showNavigationToGate(gateId: string, accessible?: boolean)` - Displays navigation on map
- `parseFlightNumber(input: string)` - Normalizes flight numbers (handles various formats)
- `findGateByFlightNumber(flightNumber: string)` - Finds gate by flight (requires API integration)
- `getAllGates()` - Returns all gates in venue
- `calculateWalkingTime(meters: number, accessible?: boolean)` - Estimates walking time
- `formatWalkingTime(seconds: number)` - Formats time for display
- `formatDistance(meters: number)` - Formats distance (feet/miles)

**Features**:
- Multiple gate number format support (A12, Gate 42, B-5, etc.)
- Accessible route calculation (slower walking speed)
- Walking speed: 1.4 m/s (standard), 0.9 m/s (accessible)

---

### BarcodeScannerService

**File**: `BarcodeScannerService.ts`

Camera barcode scanning with PDF417 support using @zxing/library. Parses IATA Bar Coded Boarding Pass (BCBP) format.

**Key Methods**:
- `startScanning(videoElement, onResult, onError?)` - Starts camera scanning
- `stopScanning()` - Stops scanning and releases camera
- `isActive()` - Check if scanner is running
- `reset()` - Stop and cleanup
- `getCameraDevices()` - Lists available cameras
- `parseBoardingPass(rawData: string)` - Parses BCBP data without camera

**Supported Barcode Formats**:
- PDF417 (primary format for boarding passes)
- QR Code (some airlines)
- Aztec (alternative format)

**Parsed Boarding Pass Fields**:
- Flight number (airline + number)
- Passenger name
- Gate (if available)
- Seat number
- Boarding group
- Departure time
- Confirmation code
- Raw barcode data

**Features**:
- Automatically prefers back camera on mobile
- Continuous scanning mode
- Auto-stop after successful scan
- IATA BCBP format parser with Julian date conversion

---

## Usage Example

```typescript
import {
  wayfinderService,
  directoryService,
  gateFinderService,
  barcodeScannerService,
} from '@/services';

// Initialize SDK
await wayfinderService.loadSDK();
await wayfinderService.initHeadless();
await wayfinderService.initFullscreen('#map-container');

// Fetch directory POIs
const shops = await directoryService.getShopPOIs();
const restaurants = await directoryService.getDinePOIs();

// Find and navigate to gate
const gate = await gateFinderService.findGate('A12');
if (gate) {
  await gateFinderService.showNavigationToGate(gate.poiId);
}

// Scan boarding pass
const videoElement = document.getElementById('scanner-video') as HTMLVideoElement;
await barcodeScannerService.startScanning(
  videoElement,
  (boardingPass) => {
    console.log('Scanned:', boardingPass.flightNumber);
    console.log('Gate:', boardingPass.gate);
  },
  (error) => {
    console.error('Scan error:', error);
  }
);

// Cleanup
wayfinderService.destroy();
barcodeScannerService.stopScanning();
```

## Type Definitions

Type definitions are located in:
- `@/types/wayfinder-sdk.ts` - SDK interfaces and types
- `@/types/wayfinder.ts` - Application-level types

## Dependencies

- **@zxing/browser** - Browser barcode scanning
- **@zxing/library** - Barcode format support (PDF417, QR, Aztec)
- **Atrius Wayfinder JS SDK** - Indoor mapping and wayfinding (loaded dynamically)

## Notes

- All services are exported as singleton instances
- Services use TypeScript for type safety
- Headless map instance is used for data fetching to reduce overhead
- Fullscreen map instance is used for interactive display
- Services implement caching where appropriate to reduce API calls
- Error handling is built into all services with detailed console logging
