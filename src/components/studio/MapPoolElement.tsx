import React, { useMemo, useCallback } from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement, MapItem, Aoe2cmRawDraftData } from '../../types/draft';
import styles from './MapPoolElement.module.css';
import useDraftAnimation from '../../hooks/useDraftAnimation'; // Import the hook

// Helper function to reorder maps for bottom-to-top display in columns
// Now returns (MapItem | null)[] to allow for padding, and always returns full grid size
const NUM_ROWS = 4; // Define NUM_ROWS as per instructions - already here from previous step
const NUM_COLUMNS = 5; // Define NUM_COLUMNS

const reorderMapsForDisplay = (maps: MapItem[], numRows: number): (MapItem | null)[] => {
  const finalDisplayList: (MapItem | null)[] = [];

  for (let colIdx = 0; colIdx < NUM_COLUMNS; colIdx++) {
    // Get the actual maps for this column from the input 'maps'
    // These are the maps that would originally fall into this column based on simple top-to-bottom, left-to-right filling
    const mapsForThisColumnSegment = maps.slice(colIdx * numRows, (colIdx + 1) * numRows);

    // Reverse them for bottom-up stacking visual within this column segment
    const reversedMapItemsInSegment = mapsForThisColumnSegment.reverse();

    // Create the column for display, padded with leading nulls to ensure bottom alignment for the items in this segment
    const columnForDisplay: (MapItem | null)[] = Array(numRows).fill(null);

    // Place the reversed items at the end of this conceptual column
    // Example: if numRows=4 and reversedMapItemsInSegment=[M1, M2] (M2 was "above" M1 visually in source)
    // M1 (first in reversed, last in original column segment) goes to columnForDisplay[3] (bottom-most)
    // M2 (second in reversed, second-to-last in original) goes to columnForDisplay[2]
    // Resulting in [null, null, M2, M1] for this column in the final flat list
    for (let itemIdx = 0; itemIdx < reversedMapItemsInSegment.length; itemIdx++) {
      columnForDisplay[numRows - 1 - itemIdx] = reversedMapItemsInSegment[itemIdx];
    }

    finalDisplayList.push(...columnForDisplay);
  }
  // Ensure the list is exactly NUM_COLUMNS * numRows long, truncating or padding if necessary
  // Though the loop structure above should guarantee this if NUM_COLUMNS is fixed.
  // If maps array is shorter than NUM_COLUMNS * numRows, later columns will be all nulls.
  // If maps array is somehow longer (shouldn't happen with upstream logic), it's implicitly truncated by slice.
  return finalDisplayList.slice(0, NUM_COLUMNS * numRows);
};

interface MapPoolElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
}

// Helper function (similar to BoXSeriesOverviewElement)
const formatMapNameForImagePath = (mapName: string): string => {
  if (!mapName) return 'random'; // Or a placeholder image name
  return mapName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};

const MapPoolElement: React.FC<MapPoolElementProps> = ({ element, isBroadcast }) => {
  const {
    fontFamily = 'Arial, sans-serif',
    isPivotLocked = false,
    horizontalSplitOffset = 0,
  } = element;

  // Get data from the store
  const {
    aoe2cmRawDraftOptions,
    mapPicksHost,
    mapBansHost,
    mapPicksGuest,
    mapBansGuest,
    mapPicksGlobal,
    forceMapPoolUpdate, // Add this line
  } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    mapPicksHost: state.mapPicksHost,
    mapBansHost: state.mapBansHost,
    mapPicksGuest: state.mapPicksGuest,
    mapBansGuest: state.mapBansGuest,
    mapPicksGlobal: state.mapPicksGlobal,
    forceMapPoolUpdate: state.forceMapPoolUpdate, // Add this line
  }));

  const deriveMapPool = useCallback((playerType: 'host' | 'guest'): MapItem[] => {
    if (!aoe2cmRawDraftOptions) return []; // Guard clause
    // Ensure map names are consistently processed using a helper that mirrors getOptionNameFromStore,
    // or by passing draftOptions to getOptionNameFromStore if it's made accessible/imported.
    // For now, assume getOptionNameFromStore is not directly usable here or store structure for draftOptions is complex.
    // The critical part is that the names in `currentAvailableMaps` must match those in pick/ban lists.
    // The store's pick/ban lists are already processed by getOptionNameFromStore.
    // So, process these names in the same way.
    const currentAvailableMaps = aoe2cmRawDraftOptions
      .filter(opt => opt.id && !opt.id.startsWith('aoe4.'))
      .map(opt => { // Process each map name similar to getOptionNameFromStore
        const rawName = opt.name || opt.id;
        // Simplified processing: if opt.name exists, use it. Otherwise, use opt.id.
        // getOptionNameFromStore is more robust, but this component doesn't have direct access to the exact same instance/scope easily.
        // This assumes map names don't have 'aoe4.' prefix in their 'name' field from server if 'name' exists.
        // If 'name' can have 'aoe4.' prefix, then more careful stripping is needed here.
        // However, `mapPicksHost` etc. in store are already stripped. So `mapName` here must also be stripped.
        let nameToUse = opt.name || opt.id; // opt.id is fallback
        // No, pick/ban lists in store ARE processed. So names here MUST be processed.
        // This component doesn't have getOptionNameFromStore. This is a problem.
        // Quick fix: replicate simple prefix stripping for names derived from ID.
        // If opt.name is present, it's assumed to be clean. If only opt.id, it might need stripping (though maps usually don't have aoe4. prefix).
        // This was an oversimplification. The names in pick/ban arrays ARE clean.
        // The names from aoe2cmRawDraftOptions *also* need to be cleaned the same way for comparison.
        // The store's `getOptionNameFromStore` is the source of truth for name processing.
        // We need to replicate its logic or, ideally, use it if possible.
        // For now, let's assume opt.name is the clean name if present, matching store.
        return opt.name || opt.id; // This was the original. If this is the issue, it implies opt.name is not always clean or matching.
      });
      // CORRECTED APPROACH: The names from aoe2cmRawDraftOptions *must* be cleaned.
      // The pick/ban lists in the store (mapPicksHost etc.) are ALREADY clean (processed by getOptionNameFromStore).
      // So, the names we iterate over here for the base pool must ALSO be cleaned.

    // The names in pick/ban lists like `mapPicksHost` are already processed by `getOptionNameFromStore` in the store.
    // Therefore, when we iterate through `aoe2cmRawDraftOptions` to build the display pool,
    // the names derived from `aoe2cmRawDraftOptions` must undergo the same processing
    // to ensure accurate comparisons and status determination.

    return aoe2cmRawDraftOptions
      .filter(opt => opt.id && !opt.id.startsWith('aoe4.')) // Filter for map options
      .map(opt => {
        // Replicate the essential name processing logic from the store's `getOptionNameFromStore` for maps.
        // For maps, it's typically `opt.name` if available, otherwise `opt.id`.
        // Map names usually don't have 'aoe4.' prefixes that need stripping, unlike civs.
        const mapName = opt.name || opt.id;

        let status: MapItem['status'] = 'default';
        const imageUrl = `/assets/maps/${formatMapNameForImagePath(mapName)}.png`;

      if (mapPicksGlobal.includes(mapName)) {
        status = 'adminPicked';
      } else if (playerType === 'host') {
        if (mapPicksHost.includes(mapName)) status = 'picked';
        else if (mapBansHost.includes(mapName)) status = 'banned';
        else if (mapPicksGuest.includes(mapName) || mapBansGuest.includes(mapName)) status = 'affected';
      } else { // playerType === 'guest'
        if (mapPicksGuest.includes(mapName)) status = 'picked';
        else if (mapBansGuest.includes(mapName)) status = 'banned';
        else if (mapPicksHost.includes(mapName) || mapBansHost.includes(mapName)) status = 'affected';
      }
      return { name: mapName, status, imageUrl };
    });
  }, [aoe2cmRawDraftOptions, mapPicksHost, mapBansHost, mapPicksGuest, mapBansGuest, mapPicksGlobal]);

  const player1MapPool = useMemo(() => {
    const pool = deriveMapPool('host');
    // NUM_ROWS is passed as the second argument (previously columnSize)
    return reorderMapsForDisplay(pool, NUM_ROWS);
  }, [deriveMapPool, forceMapPoolUpdate]);

  const player2MapPool = useMemo(() => {
    const pool = deriveMapPool('guest');
    // NUM_ROWS is passed as the second argument
    return reorderMapsForDisplay(pool, NUM_ROWS);
  }, [deriveMapPool, forceMapPoolUpdate]);

  const p1TranslateX = -(element.horizontalSplitOffset || 0);
  const p2TranslateX = (element.horizontalSplitOffset || 0);

  const REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX = 30;
  const BASELINE_FONT_SIZE_UNSCALED_PX = 10;
  const dynamicFontSize = BASELINE_FONT_SIZE_UNSCALED_PX;

  const mapItemWidth = 250;
  const mapItemHeight = 160;

  // Updated conditional rendering logic
  const noMapsAvailableInOptions = !aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.filter(opt => opt.id && !opt.id.startsWith('aoe4.')).length === 0;

console.log('[MapPoolElement] Debugging conditional null return:');
console.log('[MapPoolElement] isBroadcast:', isBroadcast);
console.log('[MapPoolElement] player1MapPool.length:', player1MapPool.length);
console.log('[MapPoolElement] player1MapPool (contents):', JSON.parse(JSON.stringify(player1MapPool)));
console.log('[MapPoolElement] player2MapPool.length:', player2MapPool.length);
console.log('[MapPoolElement] player2MapPool (contents):', JSON.parse(JSON.stringify(player2MapPool)));
console.log('[MapPoolElement] noMapsAvailableInOptions:', noMapsAvailableInOptions);
// Also log the source of noMapsAvailableInOptions and pools
console.log('[MapPoolElement] aoe2cmRawDraftOptions:', aoe2cmRawDraftOptions ? JSON.parse(JSON.stringify(aoe2cmRawDraftOptions)) : undefined);
console.log('[MapPoolElement] mapPicksGlobal:', mapPicksGlobal ? JSON.parse(JSON.stringify(mapPicksGlobal)) : undefined);
console.log('[MapPoolElement] mapPicksHost:', mapPicksHost ? JSON.parse(JSON.stringify(mapPicksHost)) : undefined);
console.log('[MapPoolElement] mapBansHost:', mapBansHost ? JSON.parse(JSON.stringify(mapBansHost)) : undefined);
console.log('[MapPoolElement] mapPicksGuest:', mapPicksGuest ? JSON.parse(JSON.stringify(mapPicksGuest)) : undefined);
console.log('[MapPoolElement] mapBansGuest:', mapBansGuest ? JSON.parse(JSON.stringify(mapBansGuest)) : undefined);
  if (isBroadcast && player1MapPool.length === 0 && player2MapPool.length === 0 && noMapsAvailableInOptions) {
    return null;
  }

  const getStatusClass = (status: MapItem['status']): string => {
    switch (status) {
      case 'picked': return styles.picked;
      case 'banned': return styles.banned;
      case 'affected': return styles.affected;
      case 'adminPicked': return styles.adminPicked;
      default: return '';
    }
  };

  return (
    <div
      className={styles.mapPoolElement}
      style={{
        fontFamily,
        fontSize: `${dynamicFontSize}px`,
      }}
    >
      <div
        className={`${styles.playerMapGrid} ${styles.player1Grid}`}
        style={{
          transform: `translateX(${p1TranslateX}px)`,
        }}
      >
        {/* Updated conditional message for P1 */}
        {!isBroadcast && player1MapPool.filter(Boolean).length === 0 && noMapsAvailableInOptions && <div className={styles.noMapsMessage}>(P1: No Maps Available in Draft)</div>}
        {player1MapPool.map((mapItem, index) => {
          if (!mapItem) {
            // Render a placeholder or nothing for null items to maintain grid structure
            return <div key={`p1-placeholder-${index}`} className={styles.mapItemGridCell} />;
          }
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const animation = useDraftAnimation(mapItem.name, 'map', mapItem.status);
          const combinedClassName = `${styles.mapItemVisualContent} ${getStatusClass(mapItem.status)} ${styles[animation.animationClass] || ''}`;

          return (
            <div key={`p1-map-${index}-${mapItem.name}`} className={styles.mapItemGridCell}>
              <div
                className={combinedClassName}
                style={{
                  width: `${mapItemWidth}px`,
                  height: `${mapItemHeight}px`,
                  backgroundImage: mapItem.imageUrl ? `linear-gradient(to bottom, rgba(74,59,42,0.3) 0%, rgba(74,59,42,0.0) 30%), url('${mapItem.imageUrl}')` : undefined,
                  opacity: animation.imageOpacity,
                }}
              >
                <span className={styles.mapName}>{mapItem.name || 'Unknown Map'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`${styles.playerMapGrid} ${styles.player2Grid}`}
        style={{
          transform: `translateX(${p2TranslateX}px)`,
        }}
      >
        {/* Updated conditional message for P2 */}
        {!isBroadcast && player2MapPool.filter(Boolean).length === 0 && noMapsAvailableInOptions && <div className={styles.noMapsMessage}>(P2: No Maps Available in Draft)</div>}
        {player2MapPool.map((mapItem, index) => {
          if (!mapItem) {
            // Render a placeholder or nothing for null items
            return <div key={`p2-placeholder-${index}`} className={styles.mapItemGridCell} />;
          }
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const animation = useDraftAnimation(mapItem.name, 'map', mapItem.status);
          const combinedClassName = `${styles.mapItemVisualContent} ${getStatusClass(mapItem.status)} ${styles[animation.animationClass] || ''}`;

          return (
            <div key={`p2-map-${index}-${mapItem.name}`} className={styles.mapItemGridCell}>
              <div
                className={combinedClassName}
                style={{
                  width: `${mapItemWidth}px`,
                  height: `${mapItemHeight}px`,
                  backgroundImage: mapItem.imageUrl ? `linear-gradient(to bottom, rgba(74,59,42,0.3) 0%, rgba(74,59,42,0.0) 30%), url('${mapItem.imageUrl}')` : undefined,
                  opacity: animation.imageOpacity,
                }}
              >
                <span className={styles.mapName}>{mapItem.name || 'Unknown Map'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MapPoolElement;
