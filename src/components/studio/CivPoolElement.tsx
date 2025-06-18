import React, { useMemo, useCallback } from 'react'; // Import useMemo
import useDraftStore from '../../store/draftStore';
import { StudioElement, Aoe2cmRawDraftData } from '../../types/draft'; // Added Aoe2cmRawDraftData
import styles from './CivPoolElement.module.css';

interface CivItem {
  id: string; // e.g., "aoe4.English"
  name: string; // e.g., "English"
  status: 'picked' | 'banned' | 'affected' | 'adminPicked' | 'default';
  imageUrl: string;
}

// Helper function to reorder civs for bottom-to-top display in columns
// Now returns (CivItem | null)[] to allow for padding, and always returns full grid size
const reorderCivsForDisplay = (civs: CivItem[], columns: number, rows: number): (CivItem | null)[] => {
  console.log('[CivPoolElement.reorderCivsForDisplay] Input:', { civs, columns, rows });
  const totalGridSize = columns * rows;
  const fullGridItems: (CivItem | null)[] = new Array(totalGridSize).fill(null);

  // Calculate items per column, and distribute remainder if any
  const baseItemsPerColumn = Math.floor(civs.length / columns);
  let remainderItems = civs.length % columns;

  let currentCivIndex = 0;
  for (let col = 0; col < columns; col++) {
    const itemsInThisColumn = baseItemsPerColumn + (remainderItems > 0 ? 1 : 0);
    if (remainderItems > 0) remainderItems--;

    // Get the segment of civs for this column
    const civsForThisColumnSegment = civs.slice(currentCivIndex, currentCivIndex + itemsInThisColumn);
    // Reverse this segment for bottom-to-top population
    const reversedCivItemsInSegment = civsForThisColumnSegment.reverse();

    for (let itemIndex = 0; itemIndex < reversedCivItemsInSegment.length; itemIndex++) {
      // Calculate the position in the 1D array representing the grid
      // Items are placed from bottom (row index 'rows - 1') upwards
      const gridRow = rows - 1 - itemIndex;
      const gridIndex = gridRow * columns + col;
      if (gridIndex < totalGridSize) { // Ensure we don't go out of bounds
        fullGridItems[gridIndex] = reversedCivItemsInSegment[itemIndex];
      }
    }
    currentCivIndex += itemsInThisColumn;
  }

  console.log('[CivPoolElement.reorderCivsForDisplay] Output fullGridItems:', fullGridItems);
  return fullGridItems;
};

// Helper function to format civ names for image paths
const formatCivNameForImagePath = (civName: string): string => {
  if (!civName) return 'random'; // Or a placeholder for missing name
  // Converts "English" to "english", "Delhi Sultanate" to "delhi_sultanate"
  const formattedName = civName.toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').replace(/'/g, '');
  return `/assets/civflags_normal/${formattedName}.png`;
};

interface CivPoolElementProps extends StudioElement {
  // No unique props needed for CivPoolElement yet
}

const CivPoolElement: React.FC<CivPoolElementProps> = ({
  elementId,
  elementType,
  positionX,
  positionY,
  width,
  height,
  opacity,
  rotation,
  scale,
  visible,
  locked,
  animation,
  customCss,
  isBroadcast,
  columns = 5, // Default to 5 columns
  rows = 2,    // Default to 2 rows
}) => {
  console.log('[CivPoolElement] Props:', { elementId, elementType, isBroadcast, columns, rows });
  const {
    aoe2cmRawDraftOptions,
    civPicksHost,
    civBansHost,
    civPicksGuest,
    civBansGuest,
  } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    civPicksHost: state.civPicksHost,
    civBansHost: state.civBansHost,
    civPicksGuest: state.civPicksGuest,
    civBansGuest: state.civBansGuest,
  }));
  console.log('[CivPoolElement] Store Data:', { aoe2cmRawDraftOptions, civPicksHost, civBansHost, civPicksGuest, civBansGuest });

  const deriveCivPool = useCallback((playerType: 'host' | 'guest'): CivItem[] => {
    console.log('[CivPoolElement.deriveCivPool] Called for playerType:', playerType);
    if (!aoe2cmRawDraftOptions) {
      console.log('[CivPoolElement.deriveCivPool] No aoe2cmRawDraftOptions, returning empty array.');
      return [];
    }
    const currentAvailableCivsData = aoe2cmRawDraftOptions
      .filter(opt => opt.id && opt.id.startsWith('aoe4.')); // Filter for civs
    console.log('[CivPoolElement.deriveCivPool] Filtered currentAvailableCivsData:', currentAvailableCivsData);

    const result = currentAvailableCivsData.map(opt => {
      const civId = opt.id; // e.g., "aoe4.English"
      // Clean name, e.g., "aoe4.English" -> "English"
      const displayName = (opt.name || opt.id).startsWith('aoe4.')
                       ? (opt.name || opt.id).substring(5)
                       : (opt.name || opt.id); // e.g., "English"

      let status: CivItem['status'] = 'default';
      const imageUrl = formatCivNameForImagePath(displayName); // CHANGED: Use displayName

      // Status checks use displayName, as that's what civPicksHost etc. store
      if (playerType === 'host') {
        if (civPicksHost.includes(displayName)) status = 'picked';
        else if (civBansHost.includes(displayName)) status = 'banned';
        else if (civPicksGuest.includes(displayName) || civBansGuest.includes(displayName)) status = 'affected';
      } else { // playerType === 'guest'
        if (civPicksGuest.includes(displayName)) status = 'picked';
        else if (civBansGuest.includes(displayName)) status = 'banned';
        else if (civPicksHost.includes(displayName) || civBansHost.includes(displayName)) status = 'affected';
      }
      // Global pick logic is removed for civs for now.
      return { id: civId, name: displayName, status, imageUrl };
    });
    console.log('[CivPoolElement.deriveCivPool] Returning processed civs:', result);
    return result;
  }, [aoe2cmRawDraftOptions, civPicksHost, civBansHost, civPicksGuest, civBansGuest]);

  const player1CivPool = useMemo(() => {
    const civs = deriveCivPool('host');
    return reorderCivsForDisplay(civs, columns, rows);
  }, [deriveCivPool, columns, rows]);
  console.log('[CivPoolElement] player1CivPool computed:', player1CivPool);

  const player2CivPool = useMemo(() => {
    const civs = deriveCivPool('guest');
    return reorderCivsForDisplay(civs, columns, rows);
  }, [deriveCivPool, columns, rows]);
  console.log('[CivPoolElement] player2CivPool computed:', player2CivPool);

  const civItemWidth = 80; // Fixed width for civ items
  const civItemHeight = 80; // Fixed height for civ items

  // Dynamic style for the element
  // const elementStyle: React.CSSProperties = {
  //   position: 'absolute',
  //   left: `${positionX}%`,
  //   top: `${positionY}%`,
  //   width: `${width}%`,
  //   height: `${height}%`,
  //   opacity: opacity,
  //   transform: `rotate(${rotation}deg) scale(${scale})`,
  //   visibility: visible ? 'visible' : 'hidden',
  //   // other styles as needed by StudioElement props
  // };

  // Check if there are any civs available in the draft options at all
  const noCivsAvailableInOptions = !aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.filter(opt => opt.id && opt.id.startsWith('aoe4.')).length === 0;

  // Render null if in broadcast mode and no civs are available AND no civs in options
  // This prevents showing an empty box if the draft hasn't started or has no civs.
  console.log('[CivPoolElement] Pre-render check:', { isBroadcast, p1PoolLength: player1CivPool.length, p2PoolLength: player2CivPool.length, noCivsAvailableInOptions });
  if (isBroadcast && player1CivPool.length === 0 && player2CivPool.length === 0 && noCivsAvailableInOptions) {
    console.log('[CivPoolElement] Rendering null due to broadcast mode and empty/unavailable civs.');
    return null;
  }

  return (
    <div
      id={elementId}
      style={{
        border: '5px solid red',
        background: 'yellow',
        padding: '20px',
        color: 'black',
        fontSize: '12px',
        width: '300px', // Fixed width for better visibility
        height: '200px', // Fixed height
        overflow: 'auto', // To see content if it overflows
        position: 'absolute', // Ensure it's positioned if props are missing
        left: '10px',
        top: '10px',
        zIndex: 10000 // Ensure it's on top
      }}
      // className={styles.civPoolElement} // DEBUG: Commented out
    >
      <div>CivPoolElement Debug Output (elementId: {elementId})</div>
      <div style={{ fontStyle: 'italic' }}>Position: X={positionX}%, Y={positionY}%, Width={width}%, Height={height}%</div>
      <div style={{ fontStyle: 'italic' }}>Scale: {scale}, Opacity: {opacity}, Rotation: {rotation}</div>
      <div style={{ fontStyle: 'italic' }}>Columns: {columns}, Rows: {rows}, isBroadcast: {String(isBroadcast)}</div>


      {/* Player 1 Grid */}
      <div
        // className={`${styles.playerCivGrid} ${styles.player1Grid}`} // DEBUG: Commented out
        style={{
          border: '1px dashed blue',
          padding: '5px',
          marginBottom: '5px',
          gridTemplateColumns: `repeat(${columns}, 1fr)` // Keep if columns prop is reliable
        }}
      >
        Player 1 Civs:
        {player1CivPool.length > 0 ? player1CivPool.map((civItem, index) => {
          console.log('[CivPoolElement] Rendering P1 CivItem:', civItem, 'at index:', index);
          if (!civItem) {
            return <div key={`p1-empty-${index}`} style={{ background: '#eee', padding: '2px', fontSize: '10px' }}>Empty Slot</div>;
          }
          return (
            <div
              key={`p1-civ-${index}-${civItem.id}`}
              style={{ border: '1px solid black', padding: '3px', margin: '2px', fontSize: '11px' }}
            >
              Name: {civItem.name || "N/A"}<br/>
              ID: {civItem.id || "N/A"}<br/>
              Status: {civItem.status || "N/A"}
            </div>
          );
        }) : (
          <div
            // className={styles.noCivsMessage} // DEBUG: Commented out
            style={{
              gridColumn: `span ${columns}`, // Keep if columns prop is reliable
              color: 'darkred',
              fontWeight: 'bold',
              padding: '10px',
              border: '1px solid darkred'
            }}
          >
            (P1: No Civs Available in Draft)
          </div>
        )}
      </div>

      {/* Player 2 Grid */}
      <div
        // className={`${styles.playerCivGrid} ${styles.player2Grid}`} // DEBUG: Commented out
        style={{
          border: '1px dashed blue',
          padding: '5px',
          marginBottom: '5px',
          gridTemplateColumns: `repeat(${columns}, 1fr)` // Keep if columns prop is reliable
        }}
      >
        Player 2 Civs:
        {player2CivPool.length > 0 ? player2CivPool.map((civItem, index) => {
          console.log('[CivPoolElement] Rendering P2 CivItem:', civItem, 'at index:', index);
          if (!civItem) {
            return <div key={`p2-empty-${index}`} style={{ background: '#eee', padding: '2px', fontSize: '10px' }}>Empty Slot</div>;
          }
          return (
            <div
              key={`p2-civ-${index}-${civItem.id}`}
              style={{ border: '1px solid black', padding: '3px', margin: '2px', fontSize: '11px' }}
            >
              Name: {civItem.name || "N/A"}<br/>
              ID: {civItem.id || "N/A"}<br/>
              Status: {civItem.status || "N/A"}
            </div>
          );
        }) : (
          <div
            // className={styles.noCivsMessage} // DEBUG: Commented out
            style={{
              gridColumn: `span ${columns}`, // Keep if columns prop is reliable
              color: 'darkred',
              fontWeight: 'bold',
              padding: '10px',
              border: '1px solid darkred'
            }}
          >
            (P2: No Civs Available in Draft)
          </div>
        )}
      </div>

      {/* Optional: Custom CSS block */}
      {customCss && <style>{customCss}</style>}
    </div>
  );
};

export default CivPoolElement;
