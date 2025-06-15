import React from 'react';
import styles from './MapPoolElement.module.css';
import { StudioElement, Aoe2cmRawDraftData } from '../../types/draft'; // Added Aoe2cmRawDraftData
import useDraftStore from '../../store/draftStore'; // Import the store

// Define draft state types for clarity (can remain as is)
type DraftState = 'picked_by_self' | 'banned_by_self' |
                  'picked_by_opponent' | 'banned_by_opponent' |
                  'picked_by_admin' | 'available';

interface MapData {
  id: string; // Original ID from draft options
  name: string; // Cleaned name
  image: string;
}

// Helper function to format map names for image paths (similar to BoXSeriesOverviewElement)
const formatMapNameForImagePath = (mapName: string): string => {
  if (!mapName) return 'random'; // Default or placeholder image name
  return mapName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};

// Helper to get clean map name (if necessary, though store might provide clean names)
const getCleanMapName = (rawName: string): string => {
  // Example: remove potential prefixes if store data is raw
  // For now, assume names from store are relatively clean or handled by store's transformers
  return rawName;
};

interface MapPoolElementProps {
  element: StudioElement & {
    width?: number;
    height?: number;
    lockPivotPoint?: boolean;
    scale?: number;
    offset?: number;
    numColumns?: number;
    fontFamily?: string;
    mapNameFontSize?: string;
    // Add a prop to distinguish player perspectives if needed, e.g. for a single player view
    // For now, we render two distinct grids for P1 (host) and P2 (guest)
  };
}

const MapPoolElement: React.FC<MapPoolElementProps> = ({ element }) => {
  const {
    width = 600,
    height = 200,
    lockPivotPoint = false,
    offset = 0,
    numColumns = 2,
    fontFamily = 'Arial, sans-serif',
    mapNameFontSize = '0.75em',
  } = element;

  // Get data from the Zustand store
  const {
    aoe2cmRawDraftOptions,
    mapPicksHost, mapBansHost,
    mapPicksGuest, mapBansGuest,
    mapPicksGlobal, mapBansGlobal,
    // hostName, guestName, // Available if needed later
  } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    mapPicksHost: state.mapPicksHost,
    mapBansHost: state.mapBansHost,
    mapPicksGuest: state.mapPicksGuest,
    mapBansGuest: state.mapBansGuest,
    mapPicksGlobal: state.mapPicksGlobal,
    mapBansGlobal: state.mapBansGlobal,
    hostName: state.hostName,
    guestName: state.guestName,
  }));

  // Prepare map list from store data
  const availableMaps: MapData[] = React.useMemo(() => {
    if (!aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.length === 0) {
      // Fallback to mock maps if store is empty, or return empty array
      // For now, returning empty to clearly show store dependency
      return [];
    }
    return aoe2cmRawDraftOptions
      .filter(option => {
        // Heuristic to identify maps: not starting with 'aoe4.' (civ prefix)
        // This might need refinement based on actual data structure/IDs in aoe2cmRawDraftOptions
        return option.id && !option.id.startsWith('aoe4.');
      })
      .map(option => {
        const cleanName = getCleanMapName(option.name);
        return {
          id: option.id,
          name: cleanName,
          image: `/assets/maps/${formatMapNameForImagePath(cleanName)}.png`,
        };
      });
  }, [aoe2cmRawDraftOptions]);

  const numRows = Math.ceil(availableMaps.length / numColumns);

  const getMapItemStyleAndState = (mapName: string, playerPerspective: 'P1' | 'P2'): { class: string, stateText?: string } => {
    let currentDraftState: DraftState = 'available';
    let classNames = styles.mapItemVisualContent;

    if (playerPerspective === 'P1') { // Host's perspective
      if (mapPicksHost.includes(mapName)) currentDraftState = 'picked_by_self';
      else if (mapBansHost.includes(mapName)) currentDraftState = 'banned_by_self';
      else if (mapPicksGuest.includes(mapName)) currentDraftState = 'picked_by_opponent';
      else if (mapBansGuest.includes(mapName)) currentDraftState = 'banned_by_opponent';
      else if (mapPicksGlobal.includes(mapName)) currentDraftState = 'picked_by_admin'; // Assuming global picks are admin picks
      else if (mapBansGlobal.includes(mapName)) currentDraftState = 'picked_by_admin'; // Or treat global bans differently if needed
    } else { // Player 2 (Guest's) perspective
      if (mapPicksGuest.includes(mapName)) currentDraftState = 'picked_by_self';
      else if (mapBansGuest.includes(mapName)) currentDraftState = 'banned_by_self';
      else if (mapPicksHost.includes(mapName)) currentDraftState = 'picked_by_opponent';
      else if (mapBansHost.includes(mapName)) currentDraftState = 'banned_by_opponent';
      else if (mapPicksGlobal.includes(mapName)) currentDraftState = 'picked_by_admin';
      else if (mapBansGlobal.includes(mapName)) currentDraftState = 'picked_by_admin';
    }

    switch (currentDraftState) {
      case 'picked_by_self': classNames += ` ${styles.pickedBySelf}`; break;
      case 'banned_by_self': classNames += ` ${styles.bannedBySelf}`; break;
      case 'picked_by_admin': classNames += ` ${styles.pickedByAdmin}`; break;
      case 'picked_by_opponent':
      case 'banned_by_opponent':
        classNames += ` ${styles.affectedByOpponent}`; break;
      default: break; // 'available' state uses base class
    }
    return { class: classNames };
  };

  const renderGrid = (playerPerspective: 'P1' | 'P2') => {
    if (availableMaps.length === 0) {
      return <p className={styles.noMapsMessage}>No maps available in the current draft pool.</p>;
    }
    if (numRows === 0) {
        return <p className={styles.noMapsMessage}>Calculating map layout...</p>;
    }

    return (
      <div
        className={styles.playerMapGrid}
        style={{
          gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
          gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
        }}
      >
        {availableMaps.map((map) => {
          const { class: itemStyleClass } = getMapItemStyleAndState(map.name, playerPerspective);
          return (
            <div
              key={`${playerPerspective}-${map.id}`}
              className={styles.mapItemGridCell}
            >
              <div className={itemStyleClass}>
                <div className={styles.mapImageContainer}>
                  <img
                    src={map.image}
                    alt={map.name}
                    className={styles.mapImage}
                    onError={(e) => {
                      console.warn(`Failed to load image: ${map.image}`);
                      (e.target as HTMLImageElement).src = '/assets/maps/random.png'; // Fallback image
                    }}
                  />
                </div>
                <div
                  className={styles.mapName}
                  style={{ fontFamily: fontFamily, fontSize: mapNameFontSize }}
                >
                  {map.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={styles.mapPoolElement}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        fontFamily: fontFamily,
      }}
    >
      <div
        className={styles.playerGridOuterContainer}
        style={{
          width: '50%',
          transform: lockPivotPoint ? `translateX(${-Math.abs(offset)}px)` : 'none',
        }}
      >
        {renderGrid('P1')}
      </div>
      <div
        className={styles.playerGridOuterContainer}
        style={{
          width: '50%',
          transform: lockPivotPoint ? `translateX(${Math.abs(offset)}px)` : 'none',
        }}
      >
        {renderGrid('P2')}
      </div>
    </div>
  );
};

export default MapPoolElement;
