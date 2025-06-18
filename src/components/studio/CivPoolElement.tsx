import React, { useMemo, useCallback, useEffect } from 'react'; // Import useMemo
import useDraftStore from '../../store/draftStore';
import { StudioElement, Aoe2cmRawDraftData } from '../../types/draft'; // Added Aoe2cmRawDraftData
import styles from './CivPoolElement.module.css';

const DEFAULT_CIV_POOL = [
  { id: 'aoe4.AbbasidDynasty', name: 'AbbasidDynasty' },
  { id: 'aoe4.Ayyubids', name: 'Ayyubids' },
  { id: 'aoe4.Byzantines', name: 'Byzantines' },
  { id: 'aoe4.Chinese', name: 'Chinese' },
  { id: 'aoe4.DelhiSultanate', name: 'DelhiSultanate' },
  { id: 'aoe4.English', name: 'English' },
  { id: 'aoe4.French', name: 'French' },
  { id: 'aoe4.HolyRomanEmpire', name: 'HolyRomanEmpire' },
  { id: 'aoe4.HouseOfLancaster', name: 'HouseOfLancaster' },
  { id: 'aoe4.Japanese', name: 'Japanese' },
  { id: 'aoe4.JeanneDArc', name: 'JeanneDArc' },
  { id: 'aoe4.KnightsTemplar', name: 'KnightsTemplar' },
  { id: 'aoe4.Malians', name: 'Malians' },
  { id: 'aoe4.Mongols', name: 'Mongols' },
  { id: 'aoe4.OrderOfTheDragon', name: 'OrderOfTheDragon' },
  { id: 'aoe4.Ottomans', name: 'Ottomans' },
  { id: 'aoe4.Rus', name: 'Rus' },
  { id: 'aoe4.ZhuXisLegacy', name: 'ZhuXisLegacy' }
];

interface CivItem {
  id: string; // e.g., "aoe4.English"
  name: string; // e.g., "English"
  status: 'picked' | 'banned' | 'affected' | 'adminPicked' | 'default';
  imageUrl: string;
}

// Helper function to reorder civs for bottom-to-top display in columns
// Now returns (CivItem | null)[] to allow for padding, and always returns full grid size
const reorderCivsForDisplay = (civs: CivItem[], columns: number, rows: number): (CivItem | null)[] => {
  // console.log('[CivPoolElement.reorderCivsForDisplay] Input:', { civs, columns, rows }); // DEBUG: Remove/comment
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

  // console.log('[CivPoolElement.reorderCivsForDisplay] Output fullGridItems:', fullGridItems); // DEBUG: Remove/comment
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
  // console.log('[CivPoolElement] Props:', { elementId, elementType, isBroadcast, columns, rows }); // DEBUG: Remove/comment
  const {
    // aoe2cmRawDraftOptions, // No longer needed directly for DEFAULT_CIV_POOL
    civPicksHost,
    civBansHost,
    civPicksGuest,
    civBansGuest,
  } = useDraftStore(state => ({
    // aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions, // No longer needed
    civPicksHost: state.civPicksHost,
    civBansHost: state.civBansHost,
    civPicksGuest: state.civPicksGuest,
    civBansGuest: state.civBansGuest,
  }));
  // console.log('[CivPoolElement] Store Data (relevant):', { civPicksHost, civBansHost, civPicksGuest, civBansGuest }); // DEBUG: Remove/comment

  // useEffect for aoe2cmRawDraftOptions can be removed as we use DEFAULT_CIV_POOL
  // useEffect(() => {
  //   console.log('[CivPoolElement] useEffect detected change in aoe2cmRawDraftOptions. New value:', aoe2cmRawDraftOptions);
  // }, [aoe2cmRawDraftOptions]);

  const deriveCivPool = useCallback((playerType: 'host' | 'guest'): CivItem[] => {
    // console.log('[CivPoolElement.deriveCivPool] Called for playerType:', playerType, 'Using DEFAULT_CIV_POOL.'); // DEBUG: Keep if desired, or remove

    return DEFAULT_CIV_POOL.map(defaultCiv => {
      const civId = defaultCiv.id;
      const displayName = defaultCiv.name;

      let status: CivItem['status'] = 'default';
      const imageUrl = formatCivNameForImagePath(displayName);

      if (playerType === 'host') {
        if (civPicksHost.includes(displayName)) status = 'picked';
        else if (civBansHost.includes(displayName)) status = 'banned';
        else if (civPicksGuest.includes(displayName) || civBansGuest.includes(displayName)) status = 'affected';
      } else { // playerType === 'guest'
        if (civPicksGuest.includes(displayName)) status = 'picked';
        else if (civBansGuest.includes(displayName)) status = 'banned';
        else if (civPicksHost.includes(displayName) || civBansHost.includes(displayName)) status = 'affected';
      }

      return { id: civId, name: displayName, status, imageUrl };
    });
  }, [civPicksHost, civBansHost, civPicksGuest, civBansGuest]);

  const player1CivPool = useMemo(() => {
    const civs = deriveCivPool('host');
    return reorderCivsForDisplay(civs, columns, rows);
  }, [deriveCivPool, columns, rows]);
  // console.log('[CivPoolElement] player1CivPool computed:', player1CivPool); // DEBUG: Remove/comment

  const player2CivPool = useMemo(() => {
    const civs = deriveCivPool('guest');
    return reorderCivsForDisplay(civs, columns, rows);
  }, [deriveCivPool, columns, rows]);
  // console.log('[CivPoolElement] player2CivPool computed:', player2CivPool); // DEBUG: Remove/comment

  const civItemWidth = 80; // Fixed width for civ items
  const civItemHeight = 80; // Fixed height for civ items

  // Dynamic style for the element
  const elementStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${positionX}%`,
    top: `${positionY}%`,
    width: `${width}%`,
    height: `${height}%`,
    opacity: opacity,
    transform: `rotate(${rotation}deg) scale(${scale})`,
    visibility: visible ? 'visible' : 'hidden',
    // other styles as needed by StudioElement props
  };

  // Render null if in broadcast mode and if both filtered pools are empty
  // console.log('[CivPoolElement] Pre-render check:', { isBroadcast, p1PoolLength: player1CivPool.filter(Boolean).length, p2PoolLength: player2CivPool.filter(Boolean).length }); // DEBUG: Remove/comment
  if (isBroadcast && player1CivPool.filter(Boolean).length === 0 && player2CivPool.filter(Boolean).length === 0) {
    // console.log('[CivPoolElement] Rendering null due to broadcast mode and empty/unavailable civs (after filtering nulls).'); // DEBUG: Remove/comment
    return null;
  }

  return (
    <div id={elementId} style={elementStyle} className={styles.civPoolElement}>
      {/* Player 1 Grid */}
      <div className={`${styles.playerCivGrid} ${styles.player1Grid}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {player1CivPool.map((civItem, index) => {
          // console.log('[CivPoolElement] Rendering P1 CivItem:', civItem, 'at index:', index); // DEBUG: Remove/comment
          if (!civItem) {
            return <div key={`p1-placeholder-${index}`} className={styles.civItemGridCell} />;
          }
          return (
            <div key={`p1-civ-${index}-${civItem.id}`} className={styles.civItemGridCell}>
              <div
                className={`${styles.civItemVisualContent} ${styles[civItem.status] || ''}`}
                style={{
                  width: `${civItemWidth}px`,
                  height: `${civItemHeight}px`,
                  backgroundImage: `url('${civItem.imageUrl}')`,
                }}
              >
                <span className={styles.civName}>{civItem.name || 'Unknown Civ'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Player 2 Grid */}
      <div className={`${styles.playerCivGrid} ${styles.player2Grid}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {player2CivPool.map((civItem, index) => {
          // console.log('[CivPoolElement] Rendering P2 CivItem:', civItem, 'at index:', index); // DEBUG: Remove/comment
          if (!civItem) {
            return <div key={`p2-placeholder-${index}`} className={styles.civItemGridCell} />;
          }
          return (
            <div key={`p2-civ-${index}-${civItem.id}`} className={styles.civItemGridCell}>
              <div
                className={`${styles.civItemVisualContent} ${styles[civItem.status] || ''}`}
                style={{
                  width: `${civItemWidth}px`,
                  height: `${civItemHeight}px`,
                  backgroundImage: `url('${civItem.imageUrl}')`,
                }}
              >
                <span className={styles.civName}>{civItem.name || 'Unknown Civ'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional: Custom CSS block */}
      {customCss && <style>{customCss}</style>}
    </div>
  );
};

export default CivPoolElement;
