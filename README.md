# WayfinderKiosk

An interactive wayfinding system for airport terminals. Helps travelers navigate, find amenities, and locate departure gates using a touch-based kiosk interface.

## Features

### Navigation & Wayfinding
- **Interactive Floor Maps** - Visual navigation with real-time routing to destinations
- **Directory** - Browse shops, restaurants, and relaxation areas by floor and category
- **Gate Finder** - Look up flight gates and get turn-by-turn directions
- **Search** - Find specific locations by name, category, or keyword

### Accessibility
- **High Contrast Mode** - WCAG AAA compliant color palette (21:1 contrast ratio)
- **Large Text** - Text scaling up to 200% for improved readability
- **Audio Feedback** - Optional sound effects for all interactions
- **Screen Reader Support** - Full semantic HTML and ARIA labels
- **Keyboard Navigation** - Complete keyboard support without requiring a mouse

### Internationalization
- English, Spanish, and French support
- Automatic language detection with manual override

### Kiosk Mode
- Electron-based deployment for controlled kiosk environments
- Fullscreen lockdown with keyboard shortcut blocking
- Auto-recovery from errors with automatic reloads

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
# Start the dev server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build
```

### Running as Kiosk (Electron)

```bash
# Development mode
npm run dev:electron

# Build Electron app
npm run build:electron
```

## Architecture

### Project Structure

```
src/
├── components/        # UI components (IdleScreen, Directory, MapView, etc)
├── services/          # Business logic (Wayfinder SDK wrapper, directory lookups, etc)
├── hooks/             # Custom React hooks (inactivity timer, error handling)
├── store/             # Zustand state management
├── types/             # TypeScript interfaces
├── i18n/              # Internationalization
└── utils/             # Helper functions

electron/             # Electron main and preload scripts
public/               # Static assets and audio files
```

### Key Services

- **WayfinderService** - Wrapper around the Wayfinder SDK for map rendering and navigation
- **DirectoryService** - Fetches and caches POI data with 24-hour TTL
- **GateFinderService** - Flight gate lookup and route calculation
- **BarcodeScannerService** - Barcode parsing for boarding pass scanning
- **AudioService** - Audio playback with browser autoplay handling

### State Management

Uses Zustand for global state including:
- Current view (idle, directory, map, gate finder)
- Selected POI and navigation state
- Language and accessibility preferences
- Loading and error states

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in your values. Do not commit `.env` to version control.

**Wayfinder SDK Credentials:**
```
VITE_WAYFINDER_ACCOUNT_ID=your_account_id
VITE_WAYFINDER_VENUE_ID=your_venue_id
```

**Kiosk Location:**
```
VITE_KIOSK_PIN_TITLE=You Are Here
VITE_KIOSK_LATITUDE=your_latitude
VITE_KIOSK_LONGITUDE=your_longitude
VITE_KIOSK_FLOOR_ID=your_floor_id
VITE_KIOSK_STRUCTURE_ID=your_structure_id
```

**Map QR Code:**
```
VITE_MAP_QR_BASE_URL=https://your-venue.maps.atrius.com/
```

**Optional Flight Status Integration:**
```
VITE_FLIGHT_STATUS_ENABLED=false
VITE_FLIGHT_STATUS_API_KEY=
```

**POI Categories** (customizable quick actions on map):
```
VITE_POI_CATEGORIES={"poiCategories":[...]}
```

**Application Settings:**
```
VITE_INACTIVITY_TIMEOUT=60000
VITE_APP_NAME=Atrius Airport
```

See `.env.example` for complete details and default values.

### SDK Integration

The app integrates with the Wayfinder SDK for map rendering and navigation. The SDK is initialized once at app startup using a singleton pattern to ensure stability.

## Browser Support

- Chrome/Chromium 90+
- Safari 14+
- Edge 90+

Electron builds use Chromium, so browser compatibility is built-in.

## Audio Files

The app includes audio feedback for all interactions. Place MP3 files in `public/audio/`:

- `click.mp3` - Button and keyboard interactions
- `success.mp3` - Success actions (flight search results)
- `error.mp3` - Error states
- `notification.mp3` - Notifications and alerts

Users can toggle audio feedback in the accessibility settings.

## Accessibility

Complies with WCAG 2.2 AA/AAA standards:

- 48x48px minimum touch targets
- Semantic HTML with ARIA labels
- Keyboard navigation throughout
- High contrast mode with 21:1 contrast ratio
- Screen reader compatible
- Text scaling support (up to 200%)
- Focus indicators on all interactive elements

## Development Notes

### Common Issues

**Dev server port conflicts:**
```bash
pkill -f "vite" 2>/dev/null
npm run dev
```

**TypeScript errors:**
```bash
npm run type-check
```

### Bundle Size

Current production build is approximately 760 KB. Consider code-splitting if this grows significantly.

### Map SDK Notes

The Wayfinder map SDK can only be initialized once. The MapView component stays mounted and visibility is toggled via CSS to prevent reinitialization issues.

## Status

- **Core Navigation** - Complete
- **Accessibility** - WCAG 2.2 improvements implemented
- **Audio Feedback** - System integrated, audio files pending
- **Gate Finder** - Service layer ready, UI completion in progress
- **Translations** - Framework ready, full localization pending
- **Electron Deployment** - Configured and ready for testing

## License

This project is licensed under the MIT License - see the LICENSE file for details.

The MIT License allows customers and partners to freely use, modify, and distribute this software in their own implementations, both open-source and commercial, with minimal restrictions. See [MIT License](https://opensource.org/licenses/MIT) for full terms.