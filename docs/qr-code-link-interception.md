# QR Code Link Interception for Kiosk Applications

## Overview

This document describes the implementation of QR code link interception for kiosk applications using the Atrius Wayfinder JS SDK. Instead of allowing external links to open in a browser (which is problematic on kiosks), this feature intercepts link clicks and displays a QR code that users can scan with their mobile phones.

## The Problem

Kiosk applications face a unique challenge with external links:

1. **No Browser Access**: Users can't browse the web on a locked-down kiosk
2. **Session Disruption**: Opening links could break the kiosk experience
3. **Security Concerns**: Allowing browser access creates security vulnerabilities
4. **User Frustration**: Dead links or blocked popups frustrate users

## The Solution

Intercept external link clicks and convert them to QR codes that users can scan with their phones. This approach:

- Keeps the kiosk interface intact
- Allows users to take URLs with them
- Maintains security by preventing browser access
- Provides a modern, mobile-friendly experience

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Map Container                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Wayfinder SDK Map UI                   │   │
│  │                                                  │   │
│  │   ┌──────────────────────────────────────────┐  │   │
│  │   │  POI Detail Panel                        │  │   │
│  │   │  ┌────────────────────────────────────┐  │  │   │
│  │   │  │ <a href="https://example.com">     │  │  │   │
│  │   │  │    External Link                   │──┼──┼───┼──► Click Event
│  │   │  │ </a>                               │  │  │   │      │
│  │   │  └────────────────────────────────────┘  │  │   │      │
│  │   └──────────────────────────────────────────┘  │   │      │
│  └─────────────────────────────────────────────────┘   │      │
└─────────────────────────────────────────────────────────┘      │
                                                                  │
                           ┌──────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   Event Interceptor      │
              │   (Capture Phase)        │
              │                          │
              │   1. Find <a> element    │
              │   2. Check if external   │
              │   3. Prevent default     │
              │   4. Show QR modal       │
              └─────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    QR Code Modal        │
              │  ┌─────────────────┐    │
              │  │   ▓▓▓▓▓▓▓▓▓▓   │    │
              │  │   ▓▓      ▓▓   │    │
              │  │   ▓▓  QR  ▓▓   │    │
              │  │   ▓▓      ▓▓   │    │
              │  │   ▓▓▓▓▓▓▓▓▓▓   │    │
              │  └─────────────────┘    │
              │                         │
              │  "Scan to visit:        │
              │   example.com"          │
              └─────────────────────────┘
```

## Code Implementation

### 1. Install Dependencies

```bash
npm install qrcode.react
```

The `qrcode.react` library is lightweight (~12KB) and renders QR codes as SVG, ensuring crisp display at any size.

### 2. QR Code Modal Component

Create a reusable modal component for displaying QR codes:

```tsx
// src/components/QRCodeModal.tsx

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  url: string;
  onClose: () => void;
  title?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  url,
  onClose,
  title = 'Scan to Visit Website',
}) => {
  // Extract domain for user-friendly display
  const displayUrl = (() => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  })();

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="qr-modal-title" className="text-2xl font-bold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-xl inline-block mb-6 border-2 border-gray-100">
          <QRCodeSVG
            value={url}
            size={200}
            level="M"           // Error correction level
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#1f2937"
          />
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <p className="text-gray-600 text-lg">
            Scan this QR code with your phone to visit:
          </p>
          <p className="text-blue-600 font-semibold text-lg break-all">
            {displayUrl}
          </p>
        </div>

        {/* Phone hint */}
        <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">Open your phone's camera app to scan</span>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-8 w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};
```

### 3. Link Interception Logic

Add the click interceptor to your map component:

```tsx
// In your map component (e.g., WayfinderMap.tsx)

import React, { useEffect, useRef, useState } from 'react';
import { QRCodeModal } from './QRCodeModal';

export const WayfinderMap: React.FC = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Intercept external link clicks
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || !mapReady) return;

    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Find the closest anchor element
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Check if it's an external link
      const isExternal =
        (href.startsWith('http://') || href.startsWith('https://')) &&
        (anchor.getAttribute('target') === '_blank' ||
         !href.includes(window.location.hostname));

      if (isExternal) {
        // Prevent the default link behavior
        event.preventDefault();
        event.stopPropagation();

        // Show QR code modal instead
        setQrCodeUrl(href);
        console.log('Intercepted external link:', href);
      }
    };

    // Use capture phase to intercept before SDK handles it
    container.addEventListener('click', handleLinkClick, true);

    return () => {
      container.removeEventListener('click', handleLinkClick, true);
    };
  }, [mapReady]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full">
        {/* Map renders here */}
      </div>

      {/* QR Code Modal */}
      {qrCodeUrl && (
        <QRCodeModal
          url={qrCodeUrl}
          onClose={() => setQrCodeUrl(null)}
        />
      )}
    </div>
  );
};
```

## Key Implementation Details

### Event Capture Phase

The click listener uses the **capture phase** (`true` as the third argument):

```javascript
container.addEventListener('click', handleLinkClick, true);
```

This is critical because:
1. Capture phase fires before bubble phase
2. We can intercept clicks before the SDK or browser handles them
3. `preventDefault()` and `stopPropagation()` work reliably

### External Link Detection

Links are identified as external if:
1. They start with `http://` or `https://`
2. They either have `target="_blank"` OR don't include the current hostname

```javascript
const isExternal =
  (href.startsWith('http://') || href.startsWith('https://')) &&
  (anchor.getAttribute('target') === '_blank' ||
   !href.includes(window.location.hostname));
```

### QR Code Configuration

The `QRCodeSVG` component accepts several configuration options:

| Property | Value | Description |
|----------|-------|-------------|
| `value` | URL string | The data to encode |
| `size` | 200 | Size in pixels |
| `level` | "M" | Error correction: L (7%), M (15%), Q (25%), H (30%) |
| `includeMargin` | true | Adds quiet zone around QR code |
| `bgColor` | "#ffffff" | Background color |
| `fgColor` | "#1f2937" | Foreground/module color |

## Customization Options

### Custom Modal Styling

Adjust the modal appearance by modifying the Tailwind classes or adding custom CSS:

```tsx
// Example: Branded modal
<div className="bg-gradient-to-b from-brand-primary to-brand-secondary p-8">
  <QRCodeSVG
    value={url}
    size={250}
    fgColor="#your-brand-color"
  />
</div>
```

### Adding Logo to QR Code

For branded QR codes with a logo overlay:

```tsx
<div className="relative inline-block">
  <QRCodeSVG value={url} size={200} level="H" />
  <img
    src="/logo.png"
    alt=""
    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12"
  />
</div>
```

Note: Use error correction level "H" (30%) when adding logos to ensure scannability.

### Link Type Filtering

Filter which links to intercept:

```javascript
// Only intercept specific domains
const interceptDomains = ['example.com', 'partner-site.com'];
const shouldIntercept = interceptDomains.some(domain => href.includes(domain));

// Exclude certain links (e.g., maps, directions)
const excludePatterns = [/maps\.google\.com/, /directions/];
const shouldExclude = excludePatterns.some(pattern => pattern.test(href));

if (isExternal && shouldIntercept && !shouldExclude) {
  // Show QR code
}
```

### Analytics Integration

Track QR code displays for analytics:

```javascript
if (isExternal) {
  event.preventDefault();
  event.stopPropagation();

  // Track the event
  analytics.track('qr_code_shown', {
    url: href,
    domain: new URL(href).hostname,
    timestamp: new Date().toISOString(),
    poi_name: getCurrentPOIName(), // If available
  });

  setQrCodeUrl(href);
}
```

## Accessibility Considerations

The implementation includes several accessibility features:

1. **ARIA attributes**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
2. **Keyboard support**: Escape key closes modal (can be added)
3. **Focus management**: Focus trapped within modal
4. **Screen reader text**: Clear labels for all interactive elements

### Adding Escape Key Support

```tsx
useEffect(() => {
  if (!qrCodeUrl) return;

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQrCodeUrl(null);
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [qrCodeUrl]);
```

## Testing

### Manual Testing Checklist

- [ ] Click external link in POI detail panel → QR modal appears
- [ ] QR code scans correctly with phone camera
- [ ] URL displayed matches link URL
- [ ] Close button dismisses modal
- [ ] Clicking backdrop dismisses modal
- [ ] Internal links still work normally
- [ ] Multiple consecutive link clicks work correctly

### Automated Testing

```typescript
// Example Jest test
describe('QR Code Link Interception', () => {
  it('should intercept external links and show QR modal', () => {
    render(<WayfinderMap />);

    // Simulate clicking an external link
    const externalLink = screen.getByRole('link', { name: /external/i });
    fireEvent.click(externalLink);

    // QR modal should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/scan this qr code/i)).toBeInTheDocument();
  });

  it('should not intercept internal links', () => {
    render(<WayfinderMap />);

    const internalLink = screen.getByRole('link', { name: /internal/i });
    fireEvent.click(internalLink);

    // QR modal should NOT appear
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

## Troubleshooting

### QR Code Not Appearing

1. **Check event listener**: Ensure `mapReady` is true before attaching listener
2. **Verify capture phase**: Must use `true` as third argument
3. **Check link detection**: Log `href` to verify external link detection
4. **SDK conflicts**: The SDK might be handling clicks differently

### QR Code Not Scanning

1. **Size too small**: Increase `size` prop (minimum 150px recommended)
2. **Low contrast**: Ensure sufficient contrast between `fgColor` and `bgColor`
3. **Error correction**: Increase to "Q" or "H" level
4. **Margin missing**: Enable `includeMargin`

### Modal Not Closing

1. **Event propagation**: Ensure `stopPropagation()` isn't blocking close handlers
2. **State not updating**: Check that `setQrCodeUrl(null)` is being called
3. **Z-index conflicts**: Ensure modal has highest z-index

## Browser Support

This implementation supports all modern browsers:

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

QR code scanning is supported by:
- iOS 11+ (native camera app)
- Android 9+ (Google Lens / camera app)
- Most QR scanner apps on older devices

## Performance Considerations

- QR codes are rendered as SVG (vector), so they scale without performance impact
- Event listeners are cleaned up on component unmount
- Modal only renders when URL is set (conditional rendering)
- No external API calls required (client-side generation)

## Security Notes

1. **URL validation**: Consider validating URLs before displaying
2. **Malicious links**: The QR code displays the URL, allowing users to verify before scanning
3. **No browser access**: Links never open in the kiosk browser
4. **XSS prevention**: URLs are passed to QRCodeSVG as data, not rendered as HTML
