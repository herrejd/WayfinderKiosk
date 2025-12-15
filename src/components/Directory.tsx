/**
 * Directory View Component
 *
 * Displays categorized POIs (Shop, Dine, Relax) with tabs, search, and grid layout.
 * Allows users to browse and select POIs for navigation.
 */

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useKioskStore } from '@/store/kioskStore';
import { directoryService, DirectoryPOI } from '@/services';
import { parseFloorId } from '@/utils/floorParser';
import { useKeyboard } from '@/context/KeyboardContext';
import type { POI } from '@/types/wayfinder';

type TabType = 'shop' | 'dine' | 'relax';

// Virtualization constants
const ROW_HEIGHT = 364; // Card height (340px) + gap (24px)

/**
 * Calculate column count based on container width
 * Matches Tailwind breakpoints: 1 col (default), 2 col (md: 768px), 3 col (lg: 1024px)
 */
function getColumnCount(width: number): number {
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

/**
 * Custom props passed to each virtual row via rowProps
 */
interface VirtualRowCustomProps {
  items: DirectoryPOI[];
  columnCount: number;
  onSelect: (poi: DirectoryPOI) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

/**
 * Full props for virtual row (custom props + react-window injected props)
 */
interface VirtualRowProps extends VirtualRowCustomProps {
  index: number;
  style: React.CSSProperties;
}

// Map UI tab names to POI category names
const TAB_CATEGORY_MAP: Record<TabType, POI['category']> = {
  shop: 'shop',
  dine: 'eat',
  relax: 'relax',
};

interface POICardProps {
  poi: DirectoryPOI;
  onSelect: (poi: DirectoryPOI) => void;
  walkingTimeText: string | null;
}

/**
 * Calculate walking time in minutes from distance
 * @param distanceMeters - Distance in meters
 * @returns Walking time in minutes
 */
function getWalkingTimeMinutes(distanceMeters: number): number {
  // Convert meters to feet: 1 meter = 3.28084 feet
  const distanceFeet = distanceMeters * 3.28084;
  // Walking speed: 3 feet per second
  const walkingSpeedFPS = 3;
  // Calculate time in seconds, then convert to minutes
  const timeSeconds = distanceFeet / walkingSpeedFPS;
  return Math.ceil(timeSeconds / 60);
}

/**
 * POI Card Component (Memoized)
 * Displays a single POI with image, name, category, and description
 * Memoized to prevent unnecessary re-renders when parent updates
 */
const POICard = memo(function POICard({ poi, onSelect, walkingTimeText }: POICardProps) {
  const imageUrl = poi.images && poi.images.length > 0 ? poi.images[0] : null;
  const displayCategory = poi.category
    ? poi.category.split('.').pop()?.replace(/-/g, ' ') || 'Location'
    : 'Location';

  return (
    <button
      onClick={() => onSelect(poi)}
      className="w-full bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden text-left group focus:outline-none focus:ring-4 focus:ring-blue-500 relative"
    >
      {/* Walking Time Badge */}
      {walkingTimeText && (
        <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-md flex items-center gap-1 z-10">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          {walkingTimeText}
        </div>
      )}

      {/* Image */}
      <div className="w-full h-48 bg-gray-200 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={poi.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
            <svg
              className="w-20 h-20 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
          {poi.name}
        </h3>
        <p className="text-sm font-medium text-blue-600 uppercase tracking-wide mb-2">
          {displayCategory}
        </p>
        {poi.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{poi.description}</p>
        )}
        {poi.operationHours && (
          <p className="text-xs text-gray-500 mt-2">
            <span className="font-medium">Hours:</span> {poi.operationHours}
          </p>
        )}
      </div>
    </button>
  );
});

/**
 * Virtual Row Component
 * Renders a row of POI cards for virtualized list
 * Each row contains 1-3 cards depending on screen width
 */
const VirtualRow = memo(function VirtualRow({
  index,
  style,
  items,
  columnCount,
  onSelect,
  t,
}: VirtualRowProps) {
  const startIndex = index * columnCount;
  const rowItems = items.slice(startIndex, startIndex + columnCount);

  return (
    <div style={style} className="flex gap-6 px-0.5">
      {rowItems.map((poi: DirectoryPOI) => {
        const walkingMinutes = poi.distanceFromKiosk
          ? getWalkingTimeMinutes(poi.distanceFromKiosk)
          : null;
        const walkingTimeText = walkingMinutes
          ? t('directory.walkTime', { minutes: walkingMinutes })
          : null;
        return (
          <div key={poi.poiId} className="flex-1 min-w-0">
            <POICard poi={poi} onSelect={onSelect} walkingTimeText={walkingTimeText} />
          </div>
        );
      })}
      {/* Fill empty slots to maintain grid alignment */}
      {rowItems.length < columnCount &&
        Array.from({ length: columnCount - rowItems.length }).map((_, i) => (
          <div key={`empty-${i}`} className="flex-1 min-w-0" />
        ))}
    </div>
  );
});

/**
 * Directory Component
 * Main view for browsing categorized POIs
 */
export default function Directory() {
  const { t } = useTranslation();
  const selectPOI = useKioskStore((state) => state.selectPOI);
  const setErrorMessage = useKioskStore((state) => state.setErrorMessage);
  const updateInteraction = useKioskStore((state) => state.updateInteraction);
  const setView = useKioskStore((state) => state.setView);

  const [activeTab, setActiveTab] = useState<TabType>('shop');
  const [pois, setPois] = useState<DirectoryPOI[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<DirectoryPOI | null>(null);

  // Virtual keyboard integration
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { showKeyboard } = useKeyboard();

  /**
   * Load POIs when active tab changes
   * DirectoryService is initialized at app startup with cached data
   */
  useEffect(() => {

    async function loadPOIs() {
      setIsLoadingPOIs(true);
      setError(null);
      updateInteraction();

      try {
        let results: DirectoryPOI[] = [];

        switch (activeTab) {
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
        setErrorMessage(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load locations';
        setError(errorMsg);
        setErrorMessage(errorMsg);
        console.error('Error loading POIs:', err);
      } finally {
        setIsLoadingPOIs(false);
      }
    }

    loadPOIs();
  }, [activeTab, updateInteraction, setErrorMessage]);

  /**
   * Filter POIs based on search query
   * Searches name, category, description, and keywords
   */
  const filteredPOIs = useMemo(() => {
    if (!searchQuery.trim()) {
      return pois;
    }

    const query = searchQuery.toLowerCase();
    return pois.filter(
      (poi) =>
        poi.name.toLowerCase().includes(query) ||
        poi.category?.toLowerCase().includes(query) ||
        poi.description?.toLowerCase().includes(query) ||
        poi.keywords?.some(
          (keyword) =>
            keyword.isUserSearchable &&
            keyword.name.toLowerCase().includes(query)
        )
    );
  }, [pois, searchQuery]);

  /**
   * Handle tab change
   */
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSelectedPOI(null);
    updateInteraction();
  };

  /**
   * Handle POI selection (memoized for stable reference)
   */
  const handlePOIClick = useCallback((poi: DirectoryPOI) => {
    setSelectedPOI(poi);
    updateInteraction();
  }, [updateInteraction]);

  /**
   * Handle "Get Directions" action
   */
  const handleGetDirections = () => {
    if (selectedPOI) {
      // Convert SDKPOI to POI format for store
      const storePOI: POI = {
        id: selectedPOI.id || selectedPOI.poiId || selectedPOI.name,
        name: selectedPOI.name,
        category: TAB_CATEGORY_MAP[activeTab],
        description: selectedPOI.description || '',
        position: {
          lat: selectedPOI.position.latitude,
          lng: selectedPOI.position.longitude,
          floor: selectedPOI.position.floorId,
        },
        floor: selectedPOI.position.floorId,
        imageUrl: selectedPOI.images?.[0],
        phone: selectedPOI.phone,
        hours: selectedPOI.operationHours,
      };

      selectPOI(storePOI);
      // navigation to map is now handled by the selectPOI action
    }
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    setView('idle');
    updateInteraction();
  };

  /**
   * Clear search
   */
  const handleClearSearch = () => {
    setSearchQuery('');
    updateInteraction();
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-lg font-medium">{t('common.back')}</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-900">{t('directory.title')}</h1>

          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 py-3">
            <button
              onClick={() => handleTabChange('shop')}
              className={`flex-1 min-h-[56px] px-6 py-3 rounded-lg font-semibold text-lg transition-all focus:outline-none focus:ring-4 focus:ring-blue-500 ${
                activeTab === 'shop'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('directory.shop')}
            </button>
            <button
              onClick={() => handleTabChange('dine')}
              className={`flex-1 min-h-[56px] px-6 py-3 rounded-lg font-semibold text-lg transition-all focus:outline-none focus:ring-4 focus:ring-blue-500 ${
                activeTab === 'dine'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('directory.dine')}
            </button>
            <button
              onClick={() => handleTabChange('relax')}
              className={`flex-1 min-h-[56px] px-6 py-3 rounded-lg font-semibold text-lg transition-all focus:outline-none focus:ring-4 focus:ring-blue-500 ${
                activeTab === 'relax'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('directory.relax')}
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                updateInteraction();
              }}
              onFocus={() => {
                if (searchInputRef.current) {
                  showKeyboard(searchInputRef.current, searchQuery);
                }
              }}
              placeholder={t('directory.searchPlaceholder')}
              className="w-full h-14 pl-12 pr-12 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              readOnly
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Clear search"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col min-h-0 overflow-hidden">
        {/* Loading State */}
        {isLoadingPOIs && !error && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-xl text-gray-600">{t('common.loading')}</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoadingPOIs && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-red-900 mb-2">{t('common.error')}</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-4 focus:ring-red-300"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingPOIs && !error && filteredPOIs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg
              className="w-20 h-20 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">{t('common.noResults')}</h3>
            <p className="text-gray-500">
              {searchQuery
                ? t('common.noResults')
                : t('common.noResults')}
            </p>
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                {t('common.search')}
              </button>
            )}
          </div>
        )}

        {/* Results Count (above grid) */}
        {!isLoadingPOIs && !error && filteredPOIs.length > 0 && (
          <div className="mb-4 text-center text-gray-600">
            Showing {filteredPOIs.length} {filteredPOIs.length === 1 ? 'location' : 'locations'}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        )}

        {/* POI Grid - Virtualized */}
        {!isLoadingPOIs && !error && filteredPOIs.length > 0 && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <AutoSizer>
              {({ height, width }) => {
                const columnCount = getColumnCount(width);
                const rowCount = Math.ceil(filteredPOIs.length / columnCount);
                return (
                  <div style={{ height, width }}>
                    <List<VirtualRowCustomProps>
                      rowCount={rowCount}
                      rowHeight={ROW_HEIGHT}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      rowComponent={VirtualRow as any}
                      rowProps={{
                        items: filteredPOIs,
                        columnCount,
                        onSelect: handlePOIClick,
                        t,
                      }}
                      style={{ height, width }}
                    />
                  </div>
                );
              }}
            </AutoSizer>
          </div>
        )}
      </main>

      {/* POI Detail Panel */}
      {selectedPOI && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50"
          onClick={() => setSelectedPOI(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Detail Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{selectedPOI.name}</h2>
              <button
                onClick={() => setSelectedPOI(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                aria-label="Close details"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Detail Content */}
            <div className="p-6">
              {/* Image */}
              {selectedPOI.images && selectedPOI.images.length > 0 && (
                <img
                  src={selectedPOI.images[0]}
                  alt={selectedPOI.name}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
              )}

              {/* Category */}
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
                {selectedPOI.category?.split('.').pop()?.replace(/-/g, ' ') || 'Location'}
              </p>

              {/* Description */}
              {selectedPOI.description && (
                <p className="text-gray-700 mb-4">{selectedPOI.description}</p>
              )}

              {/* Hours */}
              {selectedPOI.operationHours && (
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 mb-1">Hours</h3>
                  <p className="text-gray-600">{selectedPOI.operationHours}</p>
                </div>
              )}

              {/* Phone */}
              {selectedPOI.phone && (
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                  <a
                    href={`tel:${selectedPOI.phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {selectedPOI.phone}
                  </a>
                </div>
              )}

              {/* Floor */}
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 mb-1">Location</h3>
                <p className="text-gray-600">
                  {parseFloorId(selectedPOI.position.floorId)}
                  {selectedPOI.nearbyLandmark && ` - Near ${selectedPOI.nearbyLandmark}`}
                </p>
              </div>

              {/* Get Directions Button */}
              <button
                onClick={handleGetDirections}
                className="w-full mt-6 h-14 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg"
              >
                {t('directory.getDirections')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
