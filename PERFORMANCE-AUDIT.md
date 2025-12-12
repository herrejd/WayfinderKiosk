# Performance & Efficiency Audit

**Date:** 2025-12-11
**Auditor:** Claude Code

---

## Summary

This audit identified 14 performance and efficiency issues across the WayfinderKiosk codebase. Issues are prioritized by impact and grouped into High, Medium, and Low priority categories.

---

## High Priority Issues

### 1. POICard Missing Memoization + Inline Handlers
**File:** `src/components/Directory.tsx:50-124, 460-475`
**Status:** [x] Completed (2025-12-11)

**Problem:**
The `POICard` component was a plain function (not memoized). Combined with inline `onClick` handlers:
```tsx
<POICard key={poi.poiId} poi={poi} onClick={() => handlePOIClick(poi)} />
```
Every parent re-render created new function references for all cards, causing unnecessary re-renders of the entire POI list.

**Solution Implemented:**
1. Wrapped `POICard` with `React.memo()`
2. Changed `onClick: () => void` to `onSelect: (poi: DirectoryPOI) => void` for stable prop
3. Added `walkingTimeText: string | null` prop to move i18n out of POICard (prevents memo from blocking language changes)
4. Memoized `handlePOIClick` with `useCallback`
5. Moved walking time text computation to parent (ensures language changes propagate correctly)

**Why walkingTimeText prop was needed:**
If POICard had `useTranslation()` inside with memo, language changes would NOT re-render the component (memo blocks based on props, but i18n state is internal). By computing the translated text in the parent and passing as a prop, language changes correctly trigger re-renders.

---

### 2. Inactivity Timer Event Listener Overhead
**File:** `src/hooks/useInactivityTimer.ts:86-93`
**Status:** [x] Completed (2025-12-11)

**Problem:**
Four global event listeners were attached:
```ts
const events = ['touchstart', 'click', 'keydown', 'mousemove'];
```
`mousemove` fires extremely frequently (hundreds of times per second during cursor movement). Each event triggered `handleInteraction()` which cleared and created a new timeout.

**Solution Implemented:**
Removed `mousemove` from the events array. Rationale:
- Production kiosks don't have mice (touch-only)
- `touchstart` covers all touch interactions
- `click` covers button/link clicks (works for touch and mouse)
- `keydown` covers keyboard input
- Mouse movement alone (without clicking) isn't meaningful "interaction" on a kiosk

Added a comment explaining the intentional exclusion.

---

### 3. DirectoryService Polling Pattern
**File:** `src/services/DirectoryService.ts:103-110`, `src/services/WayfinderService.ts:183-224`
**Status:** [x] Completed (2025-12-11)

**Problem:**
```ts
const checkInstance = () => {
  const instance = wayfinderService.getInstance();
  if (instance) { resolve(instance); }
  else {
    elapsedTime += interval;
    setTimeout(checkInstance, 100); // Polls every 100ms for up to 30 seconds
  }
};
```
This polling approach created up to 300 setTimeout calls while waiting for the map.

**Solution Implemented:**
Added a deferred promise pattern to WayfinderService:

1. New `waitForInstance()` method that:
   - Returns immediately if map already initialized
   - Otherwise returns a promise that resolves when `init()` completes

2. `init()` now resolves the deferred promise on success, rejects on failure

3. `destroy()` resets the deferred for clean re-initialization

4. DirectoryService's `getMapInstance()` now simply calls `wayfinderService.waitForInstance()`

**Benefits:**
- Zero polling - pure promise-based notification
- Multiple callers share the same promise (efficient)
- Proper error handling if init fails
- Clean re-initialization support

---

### 4. No List Virtualization for POI Grid
**File:** `src/components/Directory.tsx:459-463`
**Status:** [ ] Not Started

**Problem:**
All POIs render at once in the grid:
```tsx
{filteredPOIs.map((poi) => (
  <POICard key={poi.poiId} poi={poi} onClick={() => handlePOIClick(poi)} />
))}
```
For large directories (100+ items), this causes:
- Initial render lag
- Memory pressure from DOM nodes
- Slower scroll performance

**Solution:**
- Implement `react-window` or `react-virtualized` for the grid
- Only render items visible in the viewport plus a small buffer
- Consider if the POI count warrants this complexity (if typically <50, may not be needed)

---

## Medium Priority Issues

### 5. Duplicate Body Class Logic
**File:** `src/components/AccessibilityToolbar.tsx:29-50`
**Status:** [ ] Not Started

**Problem:**
The toggle handlers manually manipulate `document.body.classList`:
```ts
if (newValue) {
  document.body.classList.add('high-contrast');
} else {
  document.body.classList.remove('high-contrast');
}
```
But `App.tsx:69-72` already handles this via useEffect:
```ts
useEffect(() => {
  document.body.classList.toggle('high-contrast', userPreferences.accessibility.highContrast);
  document.body.classList.toggle('large-text', userPreferences.accessibility.largeText);
}, [userPreferences.accessibility...]);
```
This is redundant and can cause race conditions.

**Solution:**
Remove the manual `classList` manipulation from AccessibilityToolbar handlers—the App.tsx effect already handles synchronization.

---

### 6. Distance Recalculated on Every Category Switch
**File:** `src/services/DirectoryService.ts:243-262`
**Status:** [ ] Not Started

**Problem:**
Every time `getPOIsByCategory()` is called, distances are recalculated for all POIs:
```ts
const poisWithDistance = filtered.map((poi) => {
  const distance = getDistanceM(kioskLocation.lat, kioskLocation.lng, poi.position.latitude, poi.position.longitude);
  return { ...poi, distanceFromKiosk: distance };
});
```
Since kiosk location never changes during a session, this is wasted computation (Haversine formula is relatively expensive).

**Solution:**
Calculate distances once when `allPOIsCache` is populated, storing `distanceFromKiosk` on each POI. Category filtering can then skip recalculation entirely.

---

### 7. WayfinderMap Callback Ref Dependencies
**File:** `src/components/WayfinderMap.tsx:38-68`
**Status:** [ ] Not Started

**Problem:**
```ts
const mapContainerRef = useCallback(
  (node: HTMLDivElement | null) => { ... },
  [onMapReady, onError]  // These change on every render of MapView
);
```
`onMapReady` and `onError` are inline functions from MapView, recreated every render. This causes the callback ref to be recreated unnecessarily.

**Solution:**
- Remove these from the dependency array since `initStartedRef` already prevents re-initialization
- Add an eslint-disable comment explaining why
- OR memoize the callbacks in MapView with useCallback

---

### 8. Missing Image Lazy Loading
**File:** `src/components/Directory.tsx:74-79`
**Status:** [ ] Not Started

**Problem:**
POI images load eagerly:
```tsx
<img src={imageUrl} alt={poi.name} className="..." />
```
Off-screen images load unnecessarily, increasing initial page load time and bandwidth.

**Solution:**
Add `loading="lazy"` attribute:
```tsx
<img src={imageUrl} alt={poi.name} loading="lazy" className="..." />
```

---

### 9. QRCodeModal URL Parsing on Every Render
**File:** `src/components/QRCodeModal.tsx:25-32`
**Status:** [ ] Not Started

**Problem:**
```ts
const displayUrl = (() => {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
})();
```
This IIFE runs on every render of the modal, parsing the URL repeatedly.

**Solution:**
```ts
const displayUrl = useMemo(() => {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}, [url]);
```

---

### 10. Duplicate Loading State Management
**File:** `src/components/Directory.tsx:133-134, 141, 152-154`
**Status:** [ ] Not Started

**Problem:**
Both global and local loading states are maintained in parallel:
```ts
const setLoading = useKioskStore((state) => state.setLoading); // global
const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);     // local
```
They're updated together but serve the same purpose, adding complexity.

**Solution:**
Use only one:
- Local state if only Directory needs loading indication
- Global state if loading indicator should appear elsewhere (e.g., in a global loading overlay)

---

## Low Priority / Code Quality

### 11. Console Statements in Production
**Files:** `WayfinderService.ts`, `DirectoryService.ts`, `GateFinderService.ts`, others
**Status:** [ ] Not Started

**Problem:**
Numerous `console.log` statements execute in production:
- `console.log('Wayfinder map initialized successfully');`
- `console.log('DirectoryService: Cached ${...} POIs');`

These add minor overhead and pollute production logs.

**Solution:**
Wrap in development check:
```ts
if (import.meta.env.DEV) {
  console.log('...');
}
```
Or remove entirely for production.

---

### 12. GateFinderService Sequential Search Queries
**File:** `src/services/GateFinderService.ts:28-58`
**Status:** [ ] Not Started

**Problem:**
```ts
const queries = [`Gate ${gateNumber}`, `Gate ${normalizedGate}`, gateNumber, normalizedGate];
for (const query of queries) {
  const results = await map.search(query, true); // Sequential API calls
  ...
}
```
This can make up to 4 sequential API calls to find a gate, adding latency.

**Solution:**
- Use a single, more flexible search query
- OR run queries in parallel with `Promise.any()` to return first successful result

---

### 13. BarcodeScannerService Hints Map in Constructor
**File:** `src/services/BarcodeScannerService.ts:166-174`
**Status:** [ ] Not Started

**Problem:**
The hints Map is created in the constructor each time (though as a singleton, it only runs once):
```ts
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [...]);
```

**Solution:**
Move hints to a module-level constant:
```ts
const BARCODE_HINTS = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417, ...]],
  [DecodeHintType.TRY_HARDER, true],
]);
```

---

### 14. SecurityWaitTimes Component Not Memoized
**File:** `src/components/IdleScreen.tsx:15-147`
**Status:** [ ] Not Started

**Problem:**
`SecurityWaitTimes` is a function component that fetches data independently. When IdleScreen re-renders (e.g., from language change), this component re-renders even though its output is the same.

**Solution:**
Wrap with `React.memo`:
```tsx
const SecurityWaitTimes = React.memo(function SecurityWaitTimes() {
  // existing implementation
});
```

---

## Quick Reference Table

| # | Priority | Issue | File | Effort |
|---|----------|-------|------|--------|
| 1 | ~~High~~ | ~~POICard not memoized~~ | Directory.tsx | ✅ Done |
| 2 | ~~High~~ | ~~mousemove event listener~~ | useInactivityTimer.ts | ✅ Done |
| 3 | ~~High~~ | ~~Polling for map instance~~ | DirectoryService.ts | ✅ Done |
| 4 | High | No list virtualization | Directory.tsx | High |
| 5 | Medium | Duplicate body class logic | AccessibilityToolbar.tsx | Low |
| 6 | Medium | Distance recalculated | DirectoryService.ts | Medium |
| 7 | Medium | Callback ref dependencies | WayfinderMap.tsx | Low |
| 8 | Medium | No image lazy loading | Directory.tsx | Low |
| 9 | Medium | URL parsing every render | QRCodeModal.tsx | Low |
| 10 | Medium | Duplicate loading state | Directory.tsx | Low |
| 11 | Low | Console logs in production | Multiple | Low |
| 12 | Low | Sequential gate searches | GateFinderService.ts | Medium |
| 13 | Low | Hints Map in constructor | BarcodeScannerService.ts | Low |
| 14 | Low | SecurityWaitTimes not memoized | IdleScreen.tsx | Low |

---

## Progress Tracking

- [x] Issue 1 - POICard memoization (Completed 2025-12-11)
- [x] Issue 2 - Inactivity timer events (Completed 2025-12-11)
- [x] Issue 3 - DirectoryService polling (Completed 2025-12-11)
- [ ] Issue 4 - List virtualization
- [ ] Issue 5 - Duplicate body class logic
- [ ] Issue 6 - Distance caching
- [ ] Issue 7 - Callback ref dependencies
- [ ] Issue 8 - Image lazy loading
- [ ] Issue 9 - QRCodeModal useMemo
- [ ] Issue 10 - Loading state consolidation
- [ ] Issue 11 - Console log cleanup
- [ ] Issue 12 - Parallel gate searches
- [ ] Issue 13 - Static hints Map
- [ ] Issue 14 - SecurityWaitTimes memo
