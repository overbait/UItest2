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

  const deriveCivPool = useCallback((playerType: 'host' | 'guest'): CivItem[] => {
    if (!aoe2cmRawDraftOptions) return [];
    const currentAvailableCivsData = aoe2cmRawDraftOptions
      .filter(opt => opt.id && opt.id.startsWith('aoe4.')); // Filter for civs

    return currentAvailableCivsData.map(opt => {
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
  }, [aoe2cmRawDraftOptions, civPicksHost, civBansHost, civPicksGuest, civBansGuest]);

  const player1CivPool = useMemo(() => {
    const civs = deriveCivPool('host');
    return reorderCivsForDisplay(civs, columns, rows);
  }, [deriveCivPool, columns, rows]);

  const player2CivPool = useMemo(() => {
    const civs = deriveCivPool('guest');
    return reorderCivsForDisplay(civs, columns, rows);
  }, [deriveCivPool, columns, rows]);

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

  // Check if there are any civs available in the draft options at all
  const noCivsAvailableInOptions = !aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.filter(opt => opt.id && opt.id.startsWith('aoe4.')).length === 0;

  // Render null if in broadcast mode and no civs are available AND no civs in options
  // This prevents showing an empty box if the draft hasn't started or has no civs.
  if (isBroadcast && player1CivPool.length === 0 && player2CivPool.length === 0 && noCivsAvailableInOptions) {
    return null;
  }

  return (
    <div id={elementId} style={elementStyle} className={styles.civPoolElement}>
      {/* Player 1 Grid */}
      <div className={`${styles.playerCivGrid} ${styles.player1Grid}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {player1CivPool.length > 0 ? player1CivPool.map((civItem, index) => (
          <div key={`p1-civ-${index}-${civItem?.id || 'empty'}`} className={styles.civItemGridCell}>
            {civItem && (
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
            )}
          </div>
        )) : (
          <div className={styles.noCivsMessage} style={{ gridColumn: `span ${columns}` }}>(P1: No Civs Available in Draft)</div>
        )}
      </div>

      {/* Player 2 Grid */}
      <div className={`${styles.playerCivGrid} ${styles.player2Grid}`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {player2CivPool.length > 0 ? player2CivPool.map((civItem, index) => (
          <div key={`p2-civ-${index}-${civItem?.id || 'empty'}`} className={styles.civItemGridCell}>
            {civItem && (
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
            )}
          </div>
        )) : (
          <div className={styles.noCivsMessage} style={{ gridColumn: `span ${columns}` }}>(P2: No Civs Available in Draft)</div>
        )}
      </div>

      {/* Optional: Custom CSS block */}
      {customCss && <style>{customCss}</style>}
    </div>
  );
};

export default CivPoolElement;
