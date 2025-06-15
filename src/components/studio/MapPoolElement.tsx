// src/components/studio/MapPoolElement.tsx
import React from 'react';
// ... other imports ...
import { StudioElement, Aoe2cmRawDraftData } from '../../types/draft';
import useDraftStore from '../../store/draftStore';
import styles from './MapPoolElement.module.css';


// ... (helper functions formatMapNameForImagePath, getCleanMapName remain the same) ...
const formatMapNameForImagePath = (mapName: string): string => {
  if (!mapName) return 'random';
  return mapName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};
const getCleanMapName = (rawName: string): string => rawName;


interface MapPoolElementProps {
  element: StudioElement & {
    width?: number; // Will be primary width controller
    height?: number;
    lockPivotPoint?: boolean; // This will enable the special drag behavior
    // scale is handled by StudioElementWrapper
    // offset is removed
    numColumns?: number;
    fontFamily?: string;
    mapNameFontSize?: string;
    // internalGap?: number; // This might be introduced by drag, stored as a prop if needed
  };
}

const MapPoolElement: React.FC<MapPoolElementProps> = ({ element }) => {
  const {
    width = 600, // This width is the total width of the MapPoolElement
    height = 220,
    lockPivotPoint = false, // Renamed from isPivotLocked for clarity if needed, or use isPivotLocked
    // offset prop removed
    numColumns = 2,
    fontFamily = 'Arial, sans-serif',
    mapNameFontSize = '0.75em',
    // internalGap = 0, // If we store the dynamically created gap
  } = element;

  // ... (store fetching logic remains the same) ...
  const {
    aoe2cmRawDraftOptions, mapPicksHost, mapBansHost, mapPicksGuest, mapBansGuest,
    mapPicksGlobal, mapBansGlobal,
  } = useDraftStore(state => ({ /* ... selectors ... */
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    mapPicksHost: state.mapPicksHost, mapBansHost: state.mapBansHost,
    mapPicksGuest: state.mapPicksGuest, mapBansGuest: state.mapBansGuest,
    mapPicksGlobal: state.mapPicksGlobal, mapBansGlobal: state.mapBansGlobal,
  }));

  interface MapData { id: string; name: string; image: string; } // Moved MapData interface definition here
  const availableMaps: MapData[] = React.useMemo(() => { // MapData type assumed defined
    if (!aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.length === 0) return [];
    return aoe2cmRawDraftOptions
      .filter(option => option.id && !option.id.startsWith('aoe4.'))
      .map(option => {
        const cleanName = getCleanMapName(option.name);
        return { id: option.id, name: cleanName, image: `/assets/maps/${formatMapNameForImagePath(cleanName)}.png`};
      });
  }, [aoe2cmRawDraftOptions]);

  const numRows = Math.ceil(availableMaps.length / numColumns);

  // ... (getMapItemStyleAndState remains the same) ...
  type DraftState = 'picked_by_self' | 'banned_by_self' | 'picked_by_opponent' | 'banned_by_opponent' | 'picked_by_admin' | 'available';
  // interface MapData { id: string; name: string; image: string; } // Already defined above
  const getMapItemStyleAndState = (mapName: string, playerPerspective: 'P1' | 'P2'): { class: string, stateText?: string } => {
    let currentDraftState: DraftState = 'available';
    let classNames = styles.mapItemVisualContent;

    if (playerPerspective === 'P1') { // Host's perspective
      if (mapPicksHost.includes(mapName)) currentDraftState = 'picked_by_self';
      else if (mapBansHost.includes(mapName)) currentDraftState = 'banned_by_self';
      else if (mapPicksGuest.includes(mapName)) currentDraftState = 'picked_by_opponent';
      else if (mapBansGuest.includes(mapName)) currentDraftState = 'banned_by_opponent';
      else if (mapPicksGlobal.includes(mapName) || mapBansGlobal.includes(mapName)) currentDraftState = 'picked_by_admin';
    } else { // Player 2 (Guest's) perspective
      if (mapPicksGuest.includes(mapName)) currentDraftState = 'picked_by_self';
      else if (mapBansGuest.includes(mapName)) currentDraftState = 'banned_by_self';
      else if (mapPicksHost.includes(mapName)) currentDraftState = 'picked_by_opponent';
      else if (mapBansHost.includes(mapName)) currentDraftState = 'banned_by_opponent';
      else if (mapPicksGlobal.includes(mapName) || mapBansGlobal.includes(mapName)) currentDraftState = 'picked_by_admin';
    }

    switch (currentDraftState) {
      case 'picked_by_self': classNames += ` ${styles.pickedBySelf}`; break;
      case 'banned_by_self': classNames += ` ${styles.bannedBySelf}`; break;
      case 'picked_by_admin': classNames += ` ${styles.pickedByAdmin}`; break;
      case 'picked_by_opponent': case 'banned_by_opponent': classNames += ` ${styles.affectedByOpponent}`; break;
      default: break;
    }
    return { class: classNames };
  };


  const renderGrid = (playerPerspective: 'P1' | 'P2') => {
    // ... (renderGrid logic remains the same) ...
    if (availableMaps.length === 0) return <p className={styles.noMapsMessage}>No maps available...</p>;
    if (numRows === 0) return <p className={styles.noMapsMessage}>Calculating layout...</p>;
    return (
      <div className={styles.playerMapGrid} style={{ gridTemplateColumns: `repeat(${numColumns}, 1fr)`, gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}>
        {availableMaps.map((map) => {
          const { class: itemStyleClass } = getMapItemStyleAndState(map.name, playerPerspective);
          return (
            <div key={`${playerPerspective}-${map.id}`} className={styles.mapItemGridCell}>
              <div className={itemStyleClass}>
                <div className={styles.mapImageContainer}><img src={map.image} alt={map.name} className={styles.mapImage} onError={(e) => { (e.target as HTMLImageElement).src = '/assets/maps/random.png'; }}/></div>
                <div className={styles.mapName} style={{ fontFamily: fontFamily, fontSize: mapNameFontSize }}>{map.name}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // The internalGap prop would be calculated in StudioInterface during drag and passed down if this model is chosen.
  // Or, the MapPoolElement simply renders its two grids, and StudioInterface adjusts MapPoolElement's total width.
  // For now, assume MapPoolElement's width prop is the source of truth for its total span.
  // The playerGridOuterContainers will just be 50% of this.
  // The "gap" will be part of the parent's (MapPoolElement) width.

  return (
    <div
      className={styles.mapPoolElement}
      style={{
        width: `${width}px`, // This width will be dynamically adjusted by drag in StudioInterface
        height: `${height}px`,
        fontFamily: fontFamily,
        // overflow: 'visible', // May be needed depending on how drag is implemented
      }}
    >
      <div
        className={styles.playerGridOuterContainer}
        style={{
          width: '50%', // Each player grid container is 50% of the MapPoolElement width
          // transform: lockPivotPoint ? `translateX(${-Math.abs(offset)}px)` : 'none', // OLD logic with offset
          // No transform here initially, they will be side-by-side.
          // The parent's width will expand/contract, and these will flow.
          // Or, if parent's center is pivot, these will be translated based on parent width.
          // For now, let's assume they are simply 50% each of current 'width'.
          // The drag logic in StudioInterface will modify 'width' of MapPoolElement.
        }}
      >
        {renderGrid('P1')}
      </div>
      <div
        className={styles.playerGridOuterContainer}
        style={{
          width: '50%',
          // transform: lockPivotPoint ? `translateX(${Math.abs(offset)}px)` : 'none', // OLD logic with offset
        }}
      >
        {renderGrid('P2')}
      </div>
    </div>
  );
};

export default MapPoolElement;
