// src/components/studio/MapPoolElement.tsx
import React from 'react';
import { StudioElement, Aoe2cmRawDraftData } from '../../types/draft';
import useDraftStore from '../../store/draftStore';
import styles from './MapPoolElement.module.css';

// ... (helper functions, MapData, DraftState, getMapItemStyleAndState as previously defined)
const formatMapNameForImagePath = (mapName: string): string => {
  if (!mapName) return 'random';
  return mapName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};
const getCleanMapName = (rawName: string): string => rawName;
type DraftState = 'picked_by_self' | 'banned_by_self' | 'picked_by_opponent' | 'banned_by_opponent' | 'picked_by_admin' | 'available';
interface MapData { id: string; name: string; image: string; }
const getMapItemStyleAndState = (mapName: string, playerPerspective: 'P1' | 'P2', mapPicksHost: string[], mapBansHost: string[], mapPicksGuest: string[], mapBansGuest: string[], mapPicksGlobal: string[], mapBansGlobal: string[]): { class: string, stateText?: string } => {
    let currentDraftState: DraftState = 'available';
    let classNames = styles.mapItemVisualContent;
    if (playerPerspective === 'P1') {
      if (mapPicksHost.includes(mapName)) currentDraftState = 'picked_by_self';
      else if (mapBansHost.includes(mapName)) currentDraftState = 'banned_by_self';
      else if (mapPicksGuest.includes(mapName)) currentDraftState = 'picked_by_opponent';
      else if (mapBansGuest.includes(mapName)) currentDraftState = 'banned_by_opponent';
      else if (mapPicksGlobal.includes(mapName) || mapBansGlobal.includes(mapName)) currentDraftState = 'picked_by_admin';
    } else {
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


interface MapPoolElementProps {
  element: StudioElement & {
    width?: number; // This will be the total width: (2 * playerGridWidth) + separationGap
    height?: number;
    lockPivotPoint?: boolean;
    numColumns?: number;
    fontFamily?: string;
    mapNameFontSize?: string;
    separationGap?: number;
    playerGridWidth?: number; // Added prop
  };
}

const MapPoolElement: React.FC<MapPoolElementProps> = ({ element }) => {
  const {
    width: totalWidth = 600, // This is the overall width, controlled by StudioInterface drag
    height = 220,
    lockPivotPoint = false,
    numColumns = 2,
    fontFamily = 'Arial, sans-serif',
    mapNameFontSize = '0.75em',
    separationGap = 0,
    playerGridWidth, // Default for playerGridWidth will be handled in calculation if not provided
  } = element;

  const actualPlayerGridWidth = playerGridWidth !== undefined ? playerGridWidth : ((totalWidth - separationGap) / 2);


  const {
    aoe2cmRawDraftOptions, mapPicksHost, mapBansHost, mapPicksGuest, mapBansGuest,
    mapPicksGlobal, mapBansGlobal,
   } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    mapPicksHost: state.mapPicksHost, mapBansHost: state.mapBansHost,
    mapPicksGuest: state.mapPicksGuest, mapBansGuest: state.mapBansGuest,
    mapPicksGlobal: state.mapPicksGlobal, mapBansGlobal: state.mapBansGlobal,
  }));

  const availableMaps: MapData[] = React.useMemo(() => {
    if (!aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.length === 0) return [];
    return aoe2cmRawDraftOptions
      .filter(option => option.id && !option.id.startsWith('aoe4.'))
      .map(option => {
        const cleanName = getCleanMapName(option.name || 'Unknown Map'); // Ensure name is not undefined
        return { id: option.id, name: cleanName, image: `/assets/maps/${formatMapNameForImagePath(cleanName)}.png`};
      });
  }, [aoe2cmRawDraftOptions]);

  const numRows = Math.ceil(availableMaps.length / numColumns);

  const renderGrid = (playerPerspective: 'P1' | 'P2') => {
    if (availableMaps.length === 0) return <p className={styles.noMapsMessage}>No maps available...</p>;
    if (numRows === 0 && availableMaps.length > 0) return <p className={styles.noMapsMessage}>Calculating layout...</p>; // Show if maps exist but rows are 0
    if (numRows === 0) return <p className={styles.noMapsMessage}>No maps to display.</p>; // Fallback if numRows is 0 for other reasons

    return (
      <div className={styles.playerMapGrid} style={{ gridTemplateColumns: `repeat(${numColumns}, 1fr)`, gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}>
        {availableMaps.map((map) => {
          const { class: itemStyleClass } = getMapItemStyleAndState(map.name, playerPerspective, mapPicksHost, mapBansHost, mapPicksGuest, mapBansGuest, mapPicksGlobal, mapBansGlobal);
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

  const calculatedTotalWidth = (2 * actualPlayerGridWidth) + separationGap;


  return (
    <div
      className={styles.mapPoolElementRoot}
      style={{
        width: `${calculatedTotalWidth}px`,
        height: `${height}px`,
        fontFamily: fontFamily,
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      <div
        className={styles.playerGridOuterContainer}
        style={{
          width: `${actualPlayerGridWidth}px`,
          height: '100%',
        }}
      >
        {renderGrid('P1')}
      </div>
      <div
        className={styles.separationSpacer}
        style={{
          width: `${separationGap}px`,
          flexShrink: 0,
        }}
      />
      <div
        className={styles.playerGridOuterContainer}
        style={{
          width: `${actualPlayerGridWidth}px`,
          height: '100%',
        }}
      >
        {renderGrid('P2')}
      </div>
    </div>
  );
};

export default MapPoolElement;
