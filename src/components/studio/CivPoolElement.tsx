import React, { useMemo, useCallback } from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement, MapItem, Aoe2cmRawDraftData } from '../../types/draft'; // MapItem might be renamed to CivItem or PoolItem later
import styles from './CivPoolElement.module.css';

// Helper function to reorder items for bottom-to-top display in columns
const NUM_ROWS = 4;
const NUM_COLUMNS = 5;

// RENAMED: reorderMapsForDisplay to reorderItemsForDisplay
// RENAMED: maps to items, mapsForThisColumnSegment to itemsForThisColumnSegment, reversedMapItemsInSegment to reversedItemsInSegment
const reorderItemsForDisplay = (items: MapItem[], numRows: number): (MapItem | null)[] => {
  const finalDisplayList: (MapItem | null)[] = [];

  for (let colIdx = 0; colIdx < NUM_COLUMNS; colIdx++) {
    const itemsForThisColumnSegment = items.slice(colIdx * numRows, (colIdx + 1) * numRows);
    const reversedItemsInSegment = itemsForThisColumnSegment.reverse();
    const columnForDisplay: (MapItem | null)[] = Array(numRows).fill(null);
    for (let itemIdx = 0; itemIdx < reversedItemsInSegment.length; itemIdx++) {
      columnForDisplay[numRows - 1 - itemIdx] = reversedItemsInSegment[itemIdx];
    }
    finalDisplayList.push(...columnForDisplay);
  }
  return finalDisplayList.slice(0, NUM_COLUMNS * numRows);
};

interface CivPoolElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
}

// RENAMED: formatMapNameForImagePath to formatCivNameForImagePath
// UPDATED: Logic for civ flag filenames to parse ID strings
const formatCivNameForImagePath = (civIdOrNameFromOpt: string): string => {
  if (!civIdOrNameFromOpt) {
    return "RandomCiv"; // Fallback for missing name/ID
  }
  // Check if the input is an ID string starting with "aoe4."
  if (civIdOrNameFromOpt.startsWith('aoe4.')) {
    // Extract the base name part (e.g., "AbbasidDynasty" from "aoe4.AbbasidDynasty")
    // This base name is used directly in the simplified filenames (e.g., aoe4-AbbasidDynasty.png)
    return civIdOrNameFromOpt.substring(5); // Remove "aoe4." prefix
  }

  // Fallback for unexpected formats (e.g., if it's a display name directly, though logs indicate IDs are used)
  // This path is less likely given current data structure shown in logs.
  // A warning can help identify if the data structure changes or if this path is hit unexpectedly.
  console.warn(`CivPoolElement: formatCivNameForImagePath received unexpected format that does not start with 'aoe4.': "${civIdOrNameFromOpt}". Attempting basic cleanup.`);
  // Basic cleanup for a raw name: remove apostrophes and spaces.
  // This is a fallback and might not perfectly match all filenames if the input isn't an ID.
  return civIdOrNameFromOpt.replace(/'/g, "").replace(/\s+/g, "");
};

const CivPoolElement: React.FC<CivPoolElementProps> = ({ element, isBroadcast }) => {
  const {
    fontFamily = 'Arial, sans-serif',
    isPivotLocked = false,
    horizontalSplitOffset = 0,
  } = element;

  const {
    aoe2cmRawDraftOptions,
    // RENAMED: mapPicksHost to civPicksHost, etc. Assumes store provides these.
    civPicksHost,
    civBansHost,
    civPicksGuest,
    civBansGuest,
    civPicksGlobal,
  } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    // Assumes store has civPicksHost, etc.
    civPicksHost: state.civPicksHost,
    civBansHost: state.civBansHost,
    civPicksGuest: state.civPicksGuest,
    civBansGuest: state.civBansGuest,
    civPicksGlobal: state.civPicksGlobal,
  }));

  // RENAMED: deriveMapPool to deriveCivPool
  const deriveCivPool = useCallback((playerType: 'host' | 'guest'): MapItem[] => { // MapItem might change to CivItem
    if (!aoe2cmRawDraftOptions) return [];
    // UPDATED: Filter logic for civs
    const currentAvailableCivsFromOpts = aoe2cmRawDraftOptions // Renamed for clarity from currentAvailableCivs
      .filter(opt => opt.id && opt.id.startsWith('aoe4.'))
      .map(opt => opt.name || opt.id);

    // Default pick/ban arrays to empty if undefined from store
    const safeCivPicksHost = civPicksHost || [];
    const safeCivBansHost = civBansHost || [];
    const safeCivPicksGuest = civPicksGuest || [];
    const safeCivBansGuest = civBansGuest || [];
    const safeCivPicksGlobal = civPicksGlobal || [];

    // RENAMED: mapName to civName (already done, but civName is the loop variable here)
    return currentAvailableCivsFromOpts.map(civNameString => { // Use a distinct loop variable name
      let status: MapItem['status'] = 'default';
      // UPDATED: Image path and function call for simplified civ flags
      const formattedNamePart = formatCivNameForImagePath(civNameString);
      const imageUrl = `/assets/civflags_simplified/aoe4-${formattedNamePart}.png`;

      // Use safe arrays for .includes() checks
      if (safeCivPicksGlobal.includes(civNameString)) {
        status = 'adminPicked';
      } else if (playerType === 'host') {
        if (safeCivPicksHost.includes(civNameString)) status = 'picked';
        else if (safeCivBansHost.includes(civNameString)) status = 'banned';
        else if (safeCivPicksGuest.includes(civNameString) || safeCivBansGuest.includes(civNameString)) status = 'affected';
      } else { // playerType === 'guest'
        if (safeCivPicksGuest.includes(civNameString)) status = 'picked';
        else if (safeCivBansGuest.includes(civNameString)) status = 'banned';
        else if (safeCivPicksHost.includes(civNameString) || safeCivBansHost.includes(civNameString)) status = 'affected';
      }
      return { name: civNameString, status, imageUrl };
    });
  }, [aoe2cmRawDraftOptions, civPicksHost, civBansHost, civPicksGuest, civBansGuest, civPicksGlobal]);

  // RENAMED: player1MapPool to player1CivPool, player2MapPool to player2CivPool
  // RENAMED: deriveMapPool to deriveCivPool
  // RENAMED: reorderMapsForDisplay to reorderItemsForDisplay
  const player1CivPool = useMemo(() => {
    const pool = deriveCivPool('host');
    return reorderItemsForDisplay(pool, NUM_ROWS);
  }, [deriveCivPool]);

  const player2CivPool = useMemo(() => {
    const pool = deriveCivPool('guest');
    return reorderItemsForDisplay(pool, NUM_ROWS);
  }, [deriveCivPool]);

  const p1TranslateX = -(element.horizontalSplitOffset || 0);
  const p2TranslateX = (element.horizontalSplitOffset || 0);

  const REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX = 30;
  const BASELINE_FONT_SIZE_UNSCALED_PX = 10;
  const dynamicFontSize = BASELINE_FONT_SIZE_UNSCALED_PX;

  // RENAMED: mapItemWidth to civItemWidth, mapItemHeight to civItemHeight
  const civItemWidth = 250;
  const civItemHeight = 160;

  // Step 1: Create a memoized list of available civ options
  const availableCivOptions = useMemo(() => {
    if (!aoe2cmRawDraftOptions) return [];
    return aoe2cmRawDraftOptions.filter(opt => opt.id && opt.id.startsWith('aoe4.'));
  }, [aoe2cmRawDraftOptions]);

  // Step 4: Update early return logic
  if (isBroadcast &&
      player1CivPool.filter(Boolean).length === 0 &&
      player2CivPool.filter(Boolean).length === 0 &&
      availableCivOptions.length === 0) {
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
      className={styles.mapPoolElement} // This class name might be better as styles.civPoolElement if CSS is also refactored
      style={{
        fontFamily,
        fontSize: `${dynamicFontSize}px`,
      }}
    >
      <div
        className={`${styles.playerMapGrid} ${styles.player1Grid}`} // CSS classes might be renamed too
        style={{
          transform: `translateX(${p1TranslateX}px)`,
        }}
      >
        {/* Step 3: Correct "No Civs Available" message condition for P1 */}
        {!isBroadcast && player1CivPool.filter(Boolean).length === 0 && <div className={styles.noMapsMessage}>(P1: No Civs Available in Draft)</div>}
        {/* RENAMED: player1MapPool to player1CivPool, mapItem to civItem, mapItemWidth/Height to civItemWidth/Height, keys updated */}
        {player1CivPool.map((civItem, index) => {
          if (!civItem) {
            return <div key={`p1-placeholder-${index}`} className={styles.mapItemGridCell} />;
          }
          return (
            <div key={`p1-civ-${index}-${civItem.name}`} className={styles.mapItemGridCell}>
              <div
                className={`${styles.mapItemVisualContent} ${getStatusClass(civItem.status)}`}
                style={{
                  width: `${civItemWidth}px`,
                  height: `${civItemHeight}px`,
                  backgroundImage: civItem.imageUrl ? `linear-gradient(to bottom, rgba(74,59,42,0.3) 0%, rgba(74,59,42,0.0) 30%), url('${civItem.imageUrl}')` : undefined,
                }}
              >
                <span className={styles.mapName}>{civItem.name || 'Unknown Civ'}</span>
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
        {/* Step 3: Correct "No Civs Available" message condition for P2 */}
        {!isBroadcast && player2CivPool.filter(Boolean).length === 0 && <div className={styles.noMapsMessage}>(P2: No Civs Available in Draft)</div>}
        {/* RENAMED: player2MapPool to player2CivPool, mapItem to civItem, mapItemWidth/Height to civItemWidth/Height, keys updated */}
        {player2CivPool.map((civItem, index) => {
          if (!civItem) {
            return <div key={`p2-placeholder-${index}`} className={styles.mapItemGridCell} />;
          }
          return (
            <div key={`p2-civ-${index}-${civItem.name}`} className={styles.mapItemGridCell}>
              <div
                className={`${styles.mapItemVisualContent} ${getStatusClass(civItem.status)}`}
                style={{
                  width: `${civItemWidth}px`,
                  height: `${civItemHeight}px`,
                  backgroundImage: civItem.imageUrl ? `linear-gradient(to bottom, rgba(74,59,42,0.3) 0%, rgba(74,59,42,0.0) 30%), url('${civItem.imageUrl}')` : undefined,
                }}
              >
                <span className={styles.mapName}>{civItem.name || 'Unknown Civ'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CivPoolElement;
