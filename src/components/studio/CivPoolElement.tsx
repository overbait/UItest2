import React, { useMemo, useCallback } from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement, Aoe2cmRawDraftData } from '../../types/draft';
import useDraftAnimation from '../../hooks/useDraftAnimation'; // Import the hook

// Define a basic CivItem interface if it doesn't exist elsewhere
interface CivItem {
  name: string;
  status: 'default' | 'picked' | 'banned' | 'affected' | 'adminPicked';
  imageUrl: string;
}

import styles from './CivPoolElement.module.css';

// Helper function to reorder civs for bottom-to-top display in columns
// Now returns (CivItem | null)[] to allow for padding, and always returns full grid size
const NUM_ROWS = 3; // Define NUM_ROWS as per instructions
const NUM_COLUMNS = 6; // Define NUM_COLUMNS

const reorderCivsForDisplay = (civs: CivItem[], numRows: number): (CivItem | null)[] => {
  const finalDisplayList: (CivItem | null)[] = [];

  for (let colIdx = 0; colIdx < NUM_COLUMNS; colIdx++) {
    // Get the actual civs for this column from the input 'civs'
    // These are the civs that would originally fall into this column based on simple top-to-bottom, left-to-right filling
    const civsForThisColumnSegment = civs.slice(colIdx * numRows, (colIdx + 1) * numRows);

    // Reverse them for bottom-up stacking visual within this column segment
    const reversedCivItemsInSegment = civsForThisColumnSegment.reverse();

    // Create the column for display, padded with leading nulls to ensure bottom alignment for the items in this segment
    const columnForDisplay: (CivItem | null)[] = Array(numRows).fill(null);

    // Place the reversed items at the end of this conceptual column
    // Example: if numRows=4 and reversedCivItemsInSegment=[C1, C2] (C2 was "above" C1 visually in source)
    // C1 (first in reversed, last in original column segment) goes to columnForDisplay[3] (bottom-most)
    // C2 (second in reversed, second-to-last in original) goes to columnForDisplay[2]
    // Resulting in [null, null, C2, C1] for this column in the final flat list
    for (let itemIdx = 0; itemIdx < reversedCivItemsInSegment.length; itemIdx++) {
      columnForDisplay[numRows - 1 - itemIdx] = reversedCivItemsInSegment[itemIdx];
    }

    finalDisplayList.push(...columnForDisplay);
  }
  // Ensure the list is exactly NUM_COLUMNS * numRows long, truncating or padding if necessary
  // Though the loop structure above should guarantee this if NUM_COLUMNS is fixed.
  // If civs array is shorter than NUM_COLUMNS * numRows, later columns will be all nulls.
  // If civs array is somehow longer (shouldn't happen with upstream logic), it's implicitly truncated by slice.
  return finalDisplayList.slice(0, NUM_COLUMNS * numRows);
};

interface CivPoolElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
}

// Helper function (similar to BoXSeriesOverviewElement)
const formatCivNameForImagePath = (civNameWithPrefix: string): string => {
  if (!civNameWithPrefix) return 'random'; // Or a placeholder image name
  // Remove 'aoe4.' prefix if present
  const civName = civNameWithPrefix.startsWith('aoe4.') ? civNameWithPrefix.substring(5) : civNameWithPrefix;
  return civName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};

const PREDEFINED_CIV_POOL: string[] = [
  'aoe4.AbbasidDynasty', 'aoe4.Ayyubids', 'aoe4.Byzantines', 'aoe4.Chinese',
  'aoe4.DelhiSultanate', 'aoe4.English', 'aoe4.French', 'aoe4.HolyRomanEmpire',
  'aoe4.HouseOfLancaster', 'aoe4.Japanese', 'aoe4.JeanneDArc', 'aoe4.KnightsTemplar',
  'aoe4.Malians', 'aoe4.Mongols', 'aoe4.OrderOfTheDragon', 'aoe4.Ottomans',
  'aoe4.Rus', 'aoe4.ZhuXiLegacy'
];

const CivPoolElement: React.FC<CivPoolElementProps> = ({ element, isBroadcast }) => {
  const {
    fontFamily = 'Arial, sans-serif',
    isPivotLocked = false,
    horizontalSplitOffset = 0,
  } = element;

  // Get data from the store
  const {
    aoe2cmRawDraftOptions,
    civPicksHost,
    civBansHost,
    civPicksGuest,
    civBansGuest,
    civPicksGlobal,
  } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    civPicksHost: state.civPicksHost,
    civBansHost: state.civBansHost,
    civPicksGuest: state.civPicksGuest,
    civBansGuest: state.civBansGuest,
    civPicksGlobal: state.civPicksGlobal,
  }));

  const deriveCivPool = useCallback((playerType: 'host' | 'guest'): CivItem[] => {
    let availableCivsData: { id: string; name: string }[];
    const draftHasCivs = aoe2cmRawDraftOptions && aoe2cmRawDraftOptions.some(opt => opt.id && opt.id.startsWith('aoe4.'));

    if (draftHasCivs) {
      availableCivsData = aoe2cmRawDraftOptions!
        .filter(opt => opt.id && opt.id.startsWith('aoe4.'))
        .map(opt => ({
          id: opt.id!, // id is guaranteed by filter
          name: (opt.name || opt.id!).startsWith('aoe4.') ? (opt.name || opt.id!).substring(5) : (opt.name || opt.id!)
        }));
    } else {
      availableCivsData = PREDEFINED_CIV_POOL.map(id => ({
        id: id,
        name: id.substring(5) // Remove 'aoe4.' prefix
      }));
    }

    return availableCivsData.map(civData => {
      const displayName = civData.name; // Name without 'aoe4.' prefix
      let status: CivItem['status'] = 'default';
      const imageUrl = `/assets/civflags_normal/${formatCivNameForImagePath(civData.id)}.png`;

      // Use displayName (without prefix) for pick/ban checks
      if ((civPicksGlobal || []).includes(displayName)) {
        status = 'adminPicked';
      } else if (playerType === 'host') {
        if ((civPicksHost || []).includes(displayName)) status = 'picked';
        else if ((civBansHost || []).includes(displayName)) status = 'banned';
        else if ((civPicksGuest || []).includes(displayName) || (civBansGuest || []).includes(displayName)) status = 'affected';
      } else { // playerType === 'guest'
        if ((civPicksGuest || []).includes(displayName)) status = 'picked';
        else if ((civBansGuest || []).includes(displayName)) status = 'banned';
        else if ((civPicksHost || []).includes(displayName) || (civBansHost || []).includes(displayName)) status = 'affected';
      }
      return { name: displayName, status, imageUrl };
    });
  }, [aoe2cmRawDraftOptions, civPicksHost, civBansHost, civPicksGuest, civBansGuest, civPicksGlobal]);

  // const player1CivPool = useMemo(() => { // Original useMemo declaration - REMOVED
  //   const pool = deriveCivPool('host');
  //   return reorderCivsForDisplay(pool, NUM_ROWS);
  // }, [deriveCivPool, forceMapPoolUpdate]);

  // Direct calculation (temporary for debugging, or permanent if useMemo was problematic)
  const hostCivPoolData = deriveCivPool('host');
  const player1CivPool = reorderCivsForDisplay(hostCivPoolData, NUM_ROWS);

  const guestCivPoolData = deriveCivPool('guest');
  const player2CivPool = reorderCivsForDisplay(guestCivPoolData, NUM_ROWS);

  const p1TranslateX = -(element.horizontalSplitOffset || 0);
  const p2TranslateX = (element.horizontalSplitOffset || 0);

  const REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX = 30;
  const BASELINE_FONT_SIZE_UNSCALED_PX = 10;
  const dynamicFontSize = BASELINE_FONT_SIZE_UNSCALED_PX;

  const civItemWidth = 120; // Adjust as needed
  const civItemHeight = 100; // Adjust as needed

  // Condition for when to show "No Civs Available" message.
  // This is true if the draft options specifically lack 'aoe4.' items,
  // AND we are not falling back to the predefined list (though deriveCivPool handles fallback).
  // The primary check for rendering the message will be if the processed pool for a player is empty.
  const noCivsAvailableFromDraft = !aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.filter(opt => opt.id && opt.id.startsWith('aoe4.')).length === 0;

  // Determine if the final displayed pools are empty.
  const player1DisplayPoolIsEmpty = player1CivPool.filter(Boolean).length === 0;
  const player2DisplayPoolIsEmpty = player2CivPool.filter(Boolean).length === 0;

  // Overall condition for returning null if in broadcast mode and no civs to show from any source.
  // This means if draft is empty AND predefined list also results in empty (which shouldn't happen with current predefined list).
  // More accurately, if both player display pools are empty.

console.log('[CivPoolElement] Debugging conditional null return:');
console.log('[CivPoolElement] isBroadcast:', isBroadcast);
console.log('[CivPoolElement] player1DisplayPoolIsEmpty:', player1DisplayPoolIsEmpty);
console.log('[CivPoolElement] player1CivPool.length:', player1CivPool.length);
console.log('[CivPoolElement] player1CivPool (contents):', player1CivPool ? JSON.parse(JSON.stringify(player1CivPool)) : undefined);
console.log('[CivPoolElement] player2DisplayPoolIsEmpty:', player2DisplayPoolIsEmpty);
console.log('[CivPoolElement] player2CivPool.length:', player2CivPool.length);
console.log('[CivPoolElement] player2CivPool (contents):', player2CivPool ? JSON.parse(JSON.stringify(player2CivPool)) : undefined);
console.log('[CivPoolElement] noCivsAvailableFromDraft:', noCivsAvailableFromDraft); // existing variable
console.log('[CivPoolElement] aoe2cmRawDraftOptions:', aoe2cmRawDraftOptions ? JSON.parse(JSON.stringify(aoe2cmRawDraftOptions)) : undefined);
console.log('[CivPoolElement] civPicksGlobal:', civPicksGlobal ? JSON.parse(JSON.stringify(civPicksGlobal)) : undefined);
console.log('[CivPoolElement] civPicksHost:', civPicksHost ? JSON.parse(JSON.stringify(civPicksHost)) : undefined);
console.log('[CivPoolElement] civBansHost:', civBansHost ? JSON.parse(JSON.stringify(civBansHost)) : undefined);
console.log('[CivPoolElement] civPicksGuest:', civPicksGuest ? JSON.parse(JSON.stringify(civPicksGuest)) : undefined);
console.log('[CivPoolElement] civBansGuest:', civBansGuest ? JSON.parse(JSON.stringify(civBansGuest)) : undefined);
  if (isBroadcast && player1DisplayPoolIsEmpty && player2DisplayPoolIsEmpty) {
    // If there were no civs from draft, and we assume predefined list would always show something unless filtered to empty
    // this implies a more fundamental issue or an empty state desired.
    // If PREDEFINED_CIV_POOL was empty, this would be the primary trigger.
    // Given PREDEFINED_CIV_POOL is not empty, this condition implies all civs were banned/picked resulting in empty display for both.
    // Or if deriveCivPool somehow returned empty for both players.
    return null;
  }

  const getStatusClass = (status: CivItem['status']): string => {
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
      className={styles.civPoolElement}
      style={{
        fontFamily,
        fontSize: `${dynamicFontSize}px`,
      }}
    >
      <div
        className={`${styles.playerCivGrid} ${styles.player1CivGrid}`}
        style={{
          transform: `translateX(${p1TranslateX}px)`,
        }}
      >
        {/* Updated conditional message for P1 */}
        {!isBroadcast && player1DisplayPoolIsEmpty && <div className={styles.noCivsMessage}>(P1: No Civs Available)</div>}
        {player1CivPool.map((civItem, index) => {
          if (!civItem) {
            // Render a placeholder or nothing for null items to maintain grid structure
            return <div key={`p1-placeholder-${index}`} className={styles.civItemGridCell} />;
          }
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const animation = useDraftAnimation(civItem.name, 'civ', civItem.status);
          const combinedClassName = `${styles.civItemVisualContent} ${getStatusClass(civItem.status)} ${styles[animation.animationClass] || ''}`;

          return (
            <div key={`p1-civ-${index}-${civItem.name}`} className={styles.civItemGridCell}>
              <div
                className={combinedClassName}
                style={{
                  width: `${civItemWidth}px`,
                  height: `${civItemHeight}px`,
                  backgroundImage: civItem.imageUrl ? `linear-gradient(to bottom, rgba(74,59,42,0.3) 0%, rgba(74,59,42,0.0) 30%), url('${civItem.imageUrl}')` : undefined,
                  opacity: animation.imageOpacity,
                }}
              >
                <span className={styles.civName}>{civItem.name || 'Unknown Civ'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`${styles.playerCivGrid} ${styles.player2CivGrid}`}
        style={{
          transform: `translateX(${p2TranslateX}px)`,
        }}
      >
        {/* Updated conditional message for P2 */}
        {!isBroadcast && player2DisplayPoolIsEmpty && <div className={styles.noCivsMessage}>(P2: No Civs Available)</div>}
        {player2CivPool.map((civItem, index) => {
          if (!civItem) {
            // Render a placeholder or nothing for null items
            return <div key={`p2-placeholder-${index}`} className={styles.civItemGridCell} />;
          }
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const animation = useDraftAnimation(civItem.name, 'civ', civItem.status);
          const combinedClassName = `${styles.civItemVisualContent} ${getStatusClass(civItem.status)} ${styles[animation.animationClass] || ''}`;

          return (
            <div key={`p2-civ-${index}-${civItem.name}`} className={styles.civItemGridCell}>
              <div
                className={combinedClassName}
                style={{
                  width: `${civItemWidth}px`,
                  height: `${civItemHeight}px`,
                  backgroundImage: civItem.imageUrl ? `linear-gradient(to bottom, rgba(74,59,42,0.3) 0%, rgba(74,59,42,0.0) 30%), url('${civItem.imageUrl}')` : undefined,
                  opacity: animation.imageOpacity,
                }}
              >
                <span className={styles.civName}>{civItem.name || 'Unknown Civ'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CivPoolElement;
