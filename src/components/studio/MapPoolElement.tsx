import React, { useMemo, useCallback } from 'react'; // Import useMemo
import useDraftStore from '../../store/draftStore';
import { StudioElement, MapItem, Aoe2cmRawDraftData } from '../../types/draft'; // Added Aoe2cmRawDraftData
import styles from './MapPoolElement.module.css';

// Helper function to reorder maps for bottom-to-top display in columns
// Now returns (MapItem | null)[] to allow for padding
const reorderMapsForDisplay = (maps: MapItem[], columnSize: number): (MapItem | null)[] => {
  if (!maps || !maps.length) return [];

  const reorderedAndPadded: (MapItem | null)[] = [];
  const numOriginalMaps = maps.length;
  const totalColumns = Math.ceil(numOriginalMaps / columnSize);

  let mapIndex = 0;
  for (let colIndex = 0; colIndex < totalColumns; colIndex++) {
    const columnActualItems: MapItem[] = [];
    for (let i = 0; i < columnSize; i++) {
      if (mapIndex < numOriginalMaps) {
        columnActualItems.push(maps[mapIndex++]);
      } else {
        break; // No more maps left
      }
    }

    // Reverse the actual items for this column to get bottom-up effect
    const reversedActualItems = columnActualItems.reverse();

    // Create a full column, padding with nulls at the start if column isn't full
    const finalColumnDisplay: (MapItem | null)[] = [];
    const numEmptySlots = columnSize - reversedActualItems.length;

    for (let i = 0; i < numEmptySlots; i++) {
      finalColumnDisplay.push(null); // Pad beginning of column
    }
    finalColumnDisplay.push(...reversedActualItems); // Add reversed items

    reorderedAndPadded.push(...finalColumnDisplay);
  }
  return reorderedAndPadded;
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

const NUM_ROWS = 4; // Define NUM_ROWS as per instructions

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
  } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    mapPicksHost: state.mapPicksHost,
    mapBansHost: state.mapBansHost,
    mapPicksGuest: state.mapPicksGuest,
    mapBansGuest: state.mapBansGuest,
    mapPicksGlobal: state.mapPicksGlobal,
  }));

  const deriveMapPool = useCallback((playerType: 'host' | 'guest'): MapItem[] => {
    if (!aoe2cmRawDraftOptions) return []; // Guard clause
    const currentAvailableMaps = aoe2cmRawDraftOptions
      .filter(opt => opt.id && !opt.id.startsWith('aoe4.'))
      .map(opt => opt.name || opt.id);

    return currentAvailableMaps.map(mapName => {
      let status: MapItem['status'] = 'default';
      // formatMapNameForImagePath is accessible from file scope
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
    return reorderMapsForDisplay(pool, NUM_ROWS);
  }, [deriveMapPool]);

  const player2MapPool = useMemo(() => {
    const pool = deriveMapPool('guest');
    return reorderMapsForDisplay(pool, NUM_ROWS);
  }, [deriveMapPool]);

  const p1TranslateX = -(element.horizontalSplitOffset || 0);
  const p2TranslateX = (element.horizontalSplitOffset || 0);

  const REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX = 30;
  const BASELINE_FONT_SIZE_UNSCALED_PX = 10;
  const dynamicFontSize = BASELINE_FONT_SIZE_UNSCALED_PX;

  const mapItemWidth = 250;
  const mapItemHeight = 160;

  // Updated conditional rendering logic
  const noMapsAvailableInOptions = !aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.filter(opt => opt.id && !opt.id.startsWith('aoe4.')).length === 0;

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
          return (
            <div key={`p1-map-${index}-${mapItem.name}`} className={styles.mapItemGridCell}>
              <div
                className={`${styles.mapItemVisualContent} ${getStatusClass(mapItem.status)}`}
                style={{
                  width: `${mapItemWidth}px`,
                  height: `${mapItemHeight}px`,
                  backgroundImage: mapItem.imageUrl ? `linear-gradient(to bottom, rgba(74,59,42,0.3) 0%, rgba(74,59,42,0.0) 30%), url('${mapItem.imageUrl}')` : undefined,
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
          return (
            <div key={`p2-map-${index}-${mapItem.name}`} className={styles.mapItemGridCell}>
              <div
                className={`${styles.mapItemVisualContent} ${getStatusClass(mapItem.status)}`}
                style={{
                  width: `${mapItemWidth}px`,
                  height: `${mapItemHeight}px`,
                  backgroundImage: mapItem.imageUrl ? `linear-gradient(to bottom, rgba(74,59,42,0.3) 0%, rgba(74,59,42,0.0) 30%), url('${mapItem.imageUrl}')` : undefined,
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
