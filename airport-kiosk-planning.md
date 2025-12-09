# Airport Kiosk Web App - Planning Document

## Project Status: Ready for Implementation

**Last Updated**: Post-Gemini review - Added Zustand, PWA, Electron
**Next Step**: Begin project scaffolding in terminal
**Current Phase**: Phase 1 - Foundation

## Project Overview

A single-page web application for airport wayfinding and navigation, designed to run on touch-screen kiosks with barcode scanner integration.

### Core Objectives
- Navigation and wayfinding within the airport
- Boarding pass scanning for gate lookup
- Directory of airport amenities (Shop, Dine, Relax)
- WCAG 2.2 compliant interface
- AI assistant integration (stubbed for future)

## What's Been Completed

✅ **Requirements Gathering**: Full understanding of project scope
✅ **Architecture Planning**: Complete technical architecture defined
✅ **API Documentation**: Full Atrius Wayfinder JS SDK API documented
✅ **Integration Strategy**: Dual-instance pattern (headless + fullscreen)
✅ **POI Category Strategy**: Category prefixes identified for Shop/Dine/Relax tabs
✅ **Service Layer Design**: Complete service architecture with code examples
✅ **Component Structure**: React component hierarchy planned
✅ **Tech Stack Review**: Gemini review completed, optimizations applied
✅ **State Management**: Zustand store design (replaced Context API)
✅ **PWA Strategy**: vite-plugin-pwa configuration with offline caching
✅ **Kiosk Shell**: Electron wrapper for full kiosk mode control
✅ **Error Recovery**: Global error handler with auto-reload  

## What Needs to Be Built

🔨 **Immediate Next Steps** (Phase 1):
1. Initialize React + TypeScript + Vite project
2. Set up project structure with folders
3. Install dependencies
4. Create base service layer (WayfinderService, DirectoryService, GateFinderService)
5. Set up routing with React Router
6. Create basic component structure

📋 **Detailed Guide Available**: See `wayfinder-integration-guide.md` for complete API reference and implementation examples

---

## For Opus: Implementation Context & Instructions

### Current State Summary
We have completed all planning and documentation. The Atrius Wayfinder JS SDK has been fully explored and documented. We understand:
- The SDK uses ES6 module imports from `https://maps.locuslabs.com/sdk/LocusMapsSDK.js`
- Two instances needed: headless (data fetching) + fullscreen (interactive map)
- POI categories use dot notation: `eat.bar`, `shop.retail`, etc.
- Complete API available in `wayfinder-integration-guide.md`

### Project Constraints & Requirements
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite (for speed and modern ESM support)
- **Styling**: Tailwind CSS (rapid WCAG-compliant styling)
- **State Management**: Zustand (lightweight, performant, avoids Context re-render issues)
- **Routing**: React Router v6 with hash routing
- **Offline/PWA**: vite-plugin-pwa with service worker caching
- **Kiosk Shell**: Electron wrapper for full kiosk control
- **Accessibility**: WCAG 2.2 Level AA compliance mandatory
- **Touch Targets**: Minimum 48×48px for all interactive elements
- **Inactivity Reset**: 60 second timeout to return to idle screen
- **Error Recovery**: Global error handler with auto-reload

### Immediate Tasks for Phase 1 (Foundation)

#### 1. Project Initialization
```bash
# Create new Vite + React + TypeScript project
npm create vite@latest airport-kiosk -- --template react-ts
cd airport-kiosk
npm install

# Install core dependencies
npm install react-router-dom zustand
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install PWA support
npm install -D vite-plugin-pwa workbox-window

# Install accessibility tools
npm install -D @axe-core/react eslint-plugin-jsx-a11y

# Install barcode scanner (PDF417 support for boarding passes)
npm install @zxing/library @zxing/browser

# Install i18n
npm install react-i18next i18next i18next-browser-languagedetector

# Install Electron (for kiosk shell)
npm install -D electron electron-builder concurrently wait-on
```

#### 2. Project Structure to Create
```
src/
├── components/
│   ├── WayfinderMap.tsx          # Map display component
│   ├── GateFinder.tsx             # Gate finder view
│   ├── Directory.tsx              # Directory with tabs
│   ├── POICard.tsx                # POI display card
│   ├── IdleScreen.tsx             # Attract loop screen
│   ├── BarcodeScannerInput.tsx    # Scanner input component
│   ├── AccessibilityToolbar.tsx   # A11y controls
│   └── ErrorBoundary.tsx          # Global error boundary
├── services/
│   ├── WayfinderService.ts        # SDK wrapper (dual instance)
│   ├── DirectoryService.ts        # POI fetching & filtering
│   ├── GateFinderService.ts       # Gate lookup logic
│   └── BarcodeScannerService.ts   # Scanner integration
├── hooks/
│   ├── useInactivityTimer.ts      # Auto-reset timer
│   ├── useWayfinder.ts            # Map instance hook
│   └── useGlobalErrorHandler.ts   # Uncaught error handling
├── store/
│   └── kioskStore.ts              # Zustand store
├── types/
│   └── wayfinder.ts               # TypeScript interfaces
├── App.tsx                        # Main app with routing
├── main.tsx                       # Entry point
└── sw.ts                          # Service worker (PWA)
electron/
├── main.ts                        # Electron main process
├── preload.ts                     # Preload script
└── electron-env.d.ts              # Electron type definitions
```

#### 3. Configuration Files to Set Up

**Environment Variables** (`.env`):
```env
VITE_VENUE_ID=your_airport_code
VITE_ACCOUNT_ID=your_account_id
VITE_KIOSK_LOCATION_POI_ID=kiosk-location-1
VITE_INACTIVITY_TIMEOUT_MS=60000
```

**Tailwind Config** (`tailwind.config.js`):
```js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Airport branding colors
      colors: {
        primary: '#...', // To be defined
        secondary: '#...',
      },
      // Touch-friendly sizes
      spacing: {
        'touch': '48px', // Minimum touch target
      },
    },
  },
  plugins: [],
}
```

#### 4. Key Files to Create First

**WayfinderService.ts** - See `wayfinder-integration-guide.md` for complete implementation
- Manages SDK initialization
- Creates both headless and fullscreen instances
- Handles event listeners
- Provides instance getters

**kioskStore.ts** - Zustand store for global state:
```typescript
import { create } from 'zustand';

interface KioskState {
  currentView: 'idle' | 'gate-finder' | 'directory' | 'map';
  selectedPOI: POI | null;
  lastInteraction: Date;
  language: 'en' | 'es' | 'fr';
  isNavigating: boolean;
  isOffline: boolean;

  // Actions
  setView: (view: KioskState['currentView']) => void;
  selectPOI: (poi: POI | null) => void;
  updateInteraction: () => void;
  setLanguage: (lang: KioskState['language']) => void;
  setNavigating: (navigating: boolean) => void;
  setOffline: (offline: boolean) => void;
  reset: () => void;
}

export const useKioskStore = create<KioskState>((set) => ({
  currentView: 'idle',
  selectedPOI: null,
  lastInteraction: new Date(),
  language: 'en',
  isNavigating: false,
  isOffline: false,

  setView: (view) => set({ currentView: view }),
  selectPOI: (poi) => set({ selectedPOI: poi }),
  updateInteraction: () => set({ lastInteraction: new Date() }),
  setLanguage: (language) => set({ language }),
  setNavigating: (isNavigating) => set({ isNavigating }),
  setOffline: (isOffline) => set({ isOffline }),
  reset: () => set({
    currentView: 'idle',
    selectedPOI: null,
    isNavigating: false,
  }),
}));
```

**App.tsx** - Main routing structure:
```typescript
// Hash routing for kiosk reliability
<HashRouter>
  <Routes>
    <Route path="/" element={<IdleScreen />} />
    <Route path="/gate-finder" element={<GateFinder />} />
    <Route path="/directory" element={<Directory />} />
  </Routes>
</HashRouter>
```

### SDK Integration Notes

**Important**: The Atrius Wayfinder SDK:
- Loads from CDN: `https://maps.locuslabs.com/sdk/LocusMapsSDK.js`
- Returns `LMInit` object with `newMap()` method
- Requires container with defined height for fullscreen mode
- Headless mode doesn't need container (pass `null`)
- Call `.destroy()` on unmount to prevent memory leaks

**Dual Instance Pattern**:
```typescript
// Initialize headless for data
const headless = await LMInit.newMap(null, {
  venueId: 'airport',
  accountId: 'id',
  headless: true
});

// Initialize fullscreen for UI
const fullscreen = await LMInit.newMap('.map-container', {
  venueId: 'airport',
  accountId: 'id',
  headless: false
});
```

### POI Category Mapping (Critical for Directory)

Based on the category schema, filter POIs like this:

**Shop Tab**:
```typescript
poi.category.startsWith('shop.') || 
poi.category.startsWith('retail.') || 
poi.category.startsWith('duty-free.')
```

**Dine Tab**:
```typescript
poi.category.startsWith('eat.') || 
poi.category.startsWith('food.') || 
poi.category.startsWith('restaurant.') || 
poi.category.startsWith('cafe.')
```

**Relax Tab**:
```typescript
poi.category.startsWith('services.lounge') || 
poi.category.startsWith('services.spa') || 
poi.category.startsWith('amenities.')
```

### Accessibility Requirements Checklist

Must implement for WCAG 2.2 Level AA:
- [ ] All touch targets minimum 48×48px
- [ ] Color contrast 4.5:1 for normal text, 3:1 for large text
- [ ] Proper ARIA labels on all interactive elements
- [ ] Keyboard navigation (even though touch-focused)
- [ ] Focus indicators clearly visible
- [ ] Tab navigation follows logical order
- [ ] Form inputs have associated labels
- [ ] Error messages announced to screen readers
- [ ] Timeout warnings before session reset
- [ ] Support for 200% text scaling

### Testing Strategy

**Phase 1 Testing**:
1. Verify SDK loads correctly
2. Test dual instance creation
3. Confirm map renders in container
4. Validate POI data fetching in headless mode
5. Check basic routing works

**Use This Command to Test**:
```bash
npm run dev
# Open http://localhost:5173
```

### Common Pitfalls to Avoid

1. **Container Height**: Map container MUST have explicit height (not 'auto')
2. **Memory Leaks**: Always call `map.destroy()` in cleanup
3. **Event Frequency**: `userMoving` fires rapidly - use throttling
4. **Category Matching**: Use case-insensitive prefix matching
5. **State Persistence**: Don't rely on map state between instances

### Success Criteria for Phase 1

You'll know Phase 1 is complete when:
- [ ] Project builds without errors
- [ ] Both map instances initialize successfully
- [ ] Basic routing navigates between views
- [ ] Directory can fetch and display POIs
- [ ] No console errors on any page
- [ ] TypeScript compilation succeeds

### Commands to Start

```bash
# 1. Create project
npm create vite@latest airport-kiosk -- --template react-ts

# 2. Navigate and install
cd airport-kiosk
npm install

# 3. Add dependencies
npm install react-router-dom zustand
npm install -D tailwindcss postcss autoprefixer @axe-core/react
npm install -D vite-plugin-pwa workbox-window
npm install -D electron electron-builder concurrently wait-on

# 4. Initialize Tailwind
npx tailwindcss init -p

# 5. Create folder structure
mkdir -p src/{components,services,hooks,types,store}
mkdir -p electron

# 6. Start implementing:
#    - vite.config.ts (with PWA plugin)
#    - kioskStore.ts (Zustand)
#    - electron/main.ts (Electron wrapper)
#    - WayfinderService.ts (from the guide)
```

### Reference Documents

All implementation details are in:
- **`wayfinder-integration-guide.md`** - Complete SDK API reference, code examples, service implementations
- **Current file** - Project structure and phase plan

### Questions to Answer During Implementation

1. What is the actual venue ID for your airport?
2. What is your Atrius account ID?
3. What should the kiosk location POI ID be?
4. Do we need to support multiple languages initially?
5. What are the specific security lane types at your airport?

---

## Application Architecture

### Core Pages/Views

#### 1. Home/Idle Screen
- Attract loop with airport branding
- Large touch targets: "Find Your Gate" and "Browse Directory"
- Barcode scanner ready state
- Timeout to return to idle after inactivity

#### 2. Gate Finder
- Barcode scanner integration for boarding pass
- Manual flight number search fallback
- Parse boarding pass data and query Wayfinder for gate location
- Display map with route to gate
- Show flight details (time, airline, gate number)

#### 3. Directory (Tabbed)
- Three tabs: Shop, Dine, Relax
- Use Wayfinder headless mode to fetch POIs by category
- Grid/list view of locations with key info
- Touch to see location on map + get directions
- Search/filter within each category

#### 4. Map View (Integrated)
- Wayfinder JS SDK map component
- Route display to selected destination
- "You are here" indicator
- Accessibility controls (zoom, contrast)

#### 5. AI Assistant (Stubbed)
- Modal/sidebar overlay
- Voice/text input placeholder
- Integration point for future conversational agent
- Natural language → Wayfinder query translation

---

## Technical Architecture

```
┌─────────────────────────────────────┐
│     React SPA (TypeScript)          │
├─────────────────────────────────────┤
│  Components:                        │
│  - IdleScreen                       │
│  - GateFinder                       │
│  - Directory (Shop/Dine/Relax)      │
│  - MapView                          │
│  - AIAssistantStub                  │
│  - AccessibilityControls            │
└─────────────────────────────────────┘
         │         │         │
         ▼         ▼         ▼
    ┌────────┬──────────┬────────┐
    │Barcode │Wayfinder │  AI    │
    │Scanner │  JS SDK  │Service │
    │Service │          │ Stub   │
    └────────┴──────────┴────────┘
```

---

## Key Technical Considerations

### 1. State Management (Zustand)
- Zustand store for performant global state (avoids Context re-render issues)
- Track: current view, selected POI, route, scanner status, accessibility preferences, offline status
- Session timeout management (auto-reset to idle)
- Simple hook-based API: `const { currentView, setView } = useKioskStore()`

### 2. Barcode Scanner Integration

```typescript
// Barcode scanner service
interface BoardingPassData {
  flightNumber: string;
  airline: string;
  gate?: string;
  departureTime: string;
  passengerName?: string;
}

class BarcodeScannerService {
  // Listen for USB/serial scanner input
  // Parse IATA/ICAO boarding pass formats
  // Return structured data
}
```

### 3. Wayfinder Integration

```typescript
// Headless mode for directory
const shopPOIs = await wayfinder.getPOIsByCategory('retail');
const dinePOIs = await wayfinder.getPOIsByCategory('food');
const relaxPOIs = await wayfinder.getPOIsByCategory('lounge');

// Route finding for gate/destination
const route = await wayfinder.getDirections({
  from: currentLocation,
  to: gateLocation
});
```

### 4. WCAG 2.2 Compliance Requirements

- **Touch targets**: Minimum 44×44px (ideally 48×48px)
- **Color contrast**: 4.5:1 for normal text, 3:1 for large text
- **Focus indicators**: Clear, visible focus states
- **Keyboard navigation**: Full keyboard support (even though primarily touch)
- **Screen reader support**: Proper ARIA labels and landmarks
- **Text scaling**: Support up to 200% zoom
- **Motion**: Respect prefers-reduced-motion
- **Timeout warnings**: Alert before session reset

### 5. AI Assistant Stub Architecture

```typescript
interface AIAssistantStub {
  // Future integration points
  processVoiceInput: (audio: Blob) => Promise<string>;
  processTextInput: (text: string) => Promise<string>;
  
  // Map to Wayfinder actions
  parseIntent: (query: string) => {
    action: 'findGate' | 'findPOI' | 'getDirections';
    parameters: Record<string, any>;
  };
}
```

---

## UI/UX Flow

```
[Idle Screen] ──┬──→ [Find Gate] ──→ [Scan Boarding Pass] ──→ [Map to Gate]
                │                          ↓
                │                    [Manual Entry]
                │
                └──→ [Directory] ──→ [Shop/Dine/Relax Tabs] ──→ [POI Detail] ──→ [Map to POI]
                         │
                         └──→ [AI Assistant (Stub)]
```

---

## Component Structure

```typescript
// Key components with accessibility
<App>
  <IdleScreen />
  <GateFinder>
    <BarcodeScannerInput />
    <FlightSearchInput />
    <MapDisplay />
  </GateFinder>
  <Directory>
    <TabPanel label="Shop" />
    <TabPanel label="Dine" />
    <TabPanel label="Relax" />
    <POIGrid />
    <POIDetail />
  </Directory>
  <AIAssistantModal isStub={true} />
  <AccessibilityToolbar />
</App>
```

---

## Recommended Tech Stack

- **Framework**: React 18+ with TypeScript
- **Routing**: React Router v6 (hash routing for kiosk reliability)
- **Styling**: Tailwind CSS (rapid WCAG-compliant styling)
- **State**: Zustand (lightweight, hook-based, avoids Context re-render issues)
- **Build**: Vite (fast, modern)
- **PWA**: vite-plugin-pwa + Workbox (offline support, asset caching)
- **Kiosk Shell**: Electron (full window/gesture control, kiosk mode)
- **Accessibility Testing**: axe-core, jest-axe
- **Barcode**: **@zxing/library** (supports PDF417 for IATA boarding passes)
  - ⚠️ Do NOT use QuaggaJS - it only supports 1D barcodes, not PDF417
- **i18n**: react-i18next (EN, ES, FR)

## Kiosk-Specific Requirements

### Stability & Recovery
- **Error Boundaries**: Wrap all routes in React error boundary
- **Global Error Handler**: Catch uncaught exceptions and unhandled rejections
- **Auto-reload**: On uncaught errors, auto-refresh after brief delay (3 seconds)
- **Touch Gesture Lock**: Disable pinch-zoom and other gestures that break UI
- **Memory Management**: Destroy map instances properly, monitor for leaks

### Global Error Handler Implementation
```typescript
// hooks/useGlobalErrorHandler.ts
import { useEffect } from 'react';

export function useGlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Uncaught error:', event.error);
      // Auto-reload after 3 seconds
      setTimeout(() => window.location.reload(), 3000);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection:', event.reason);
      // Auto-reload after 3 seconds
      setTimeout(() => window.location.reload(), 3000);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
}
```

### Electron Kiosk Wrapper

The app runs inside Electron for full kiosk control:

```typescript
// electron/main.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true,                    // True kiosk mode
    frame: false,                   // No window chrome
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Disable keyboard shortcuts that could exit kiosk
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Block Alt+F4, Ctrl+W, etc.
    if (input.alt && input.key === 'F4') event.preventDefault();
    if (input.control && input.key === 'w') event.preventDefault();
    if (input.control && input.key === 'q') event.preventDefault();
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

**Electron package.json scripts**:
```json
{
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "vite build && electron-builder",
    "electron:preview": "vite build && electron ."
  }
}
```

### PWA Configuration (Offline Support)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching for API calls
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/maps\.locuslabs\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'wayfinder-sdk-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Airport Wayfinder Kiosk',
        short_name: 'Wayfinder',
        description: 'Airport navigation and wayfinding kiosk',
        theme_color: '#ffffff',
        display: 'fullscreen',
        orientation: 'landscape',
      },
    }),
  ],
});
```

**Offline Status Detection**:
```typescript
// In main.tsx or App.tsx
import { useKioskStore } from './store/kioskStore';

// Monitor online/offline status
window.addEventListener('online', () => useKioskStore.getState().setOffline(false));
window.addEventListener('offline', () => useKioskStore.getState().setOffline(true));
```

### Browser Configuration (CSS for kiosk mode)
```css
/* Prevent text selection and context menus */
* {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

/* Disable pull-to-refresh */
html, body {
  overscroll-behavior: none;
}

/* Prevent pinch zoom */
html {
  touch-action: manipulation;
}
```

### Inactivity Timer Edge Cases
- Extend timeout during active navigation routes
- Show "Continue?" modal before auto-reset
- Cancel timer while camera is actively scanning

---

## Critical Features to Implement

1. **Inactivity Reset**: 30-60 second timer returns to idle screen
2. **Error Handling**: Graceful fallbacks if Wayfinder API fails
3. **Offline Capability**: Cache POI data, show cached map if network drops
4. **Analytics Stub**: Track usage patterns (gate searches, popular POIs)
5. **Admin Panel**: Content management for featured POIs, announcements
6. **Multi-language Support**: i18n setup (even if starting with English only)

---

## Development Phases

### Phase 1: Foundation (Week 1)
- React app scaffolding with TypeScript
- Routing structure
- Wayfinder SDK integration (headless mode)
- Basic idle screen and navigation

### Phase 2: Core Features (Week 2)
- Directory with POI fetching and display
- Tab navigation (Shop/Dine/Relax)
- Basic map integration

### Phase 3: Gate Finder (Week 3)
- Barcode scanner service
- Boarding pass parsing
- Gate lookup and routing

### Phase 4: Polish & Accessibility (Week 4)
- WCAG 2.2 audit and fixes
- Inactivity timeout
- Error states and edge cases
- AI assistant UI stub

### Phase 5: Testing & Deployment (Week 5)
- End-to-end testing on kiosk hardware
- Performance optimization
- Deployment setup

---

## Integration Points

### Atrius Wayfinder JS SDK
- Documentation: https://docs.atrius.com/docs/wayfinder-js-sdk#/
- Use headless mode for POI data retrieval
- Map component for visual navigation
- Route calculation and display

### Barcode Scanner
- Hardware: USB/Serial barcode scanner attached to kiosk
- Input: IATA/ICAO boarding pass format
- Output: Flight number, gate assignment, passenger details

### AI Assistant (Future)
- Stub interface for conversational input
- Natural language processing integration point
- Query translation to Wayfinder API calls

---

## Next Steps

Choose one to dive deeper:
1. Set up initial React project structure
2. Design barcode scanner integration
3. Create WCAG-compliant component templates
4. Plan AI assistant stub architecture
5. Define Wayfinder SDK integration patterns
