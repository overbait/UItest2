import React, { useMemo, useCallback } from 'react'; // Import useMemo
import useDraftStore from '../../store/draftStore';
import { StudioElement, MapItem, Aoe2cmRawDraftData } from '../../types/draft'; // Restored Aoe2cmRawDraftData
import styles from './MapPoolElement.module.css';

// Define a more specific type for draft options from Aoe2cmRawDraftData
type DraftOption = NonNullable<NonNullable<Aoe2cmRawDraftData['preset']>['draftOptions']>[number];

// Helper function to reorder maps for bottom-to-top display in columns
const NUM_ROWS = 4;
const NUM_COLUMNS = 5;

const reorderMapsForDisplay = (maps: MapItem[], numRows: number): (MapItem | null)[] => {
  const finalDisplayList: (MapItem | null)[] = [];
  for (let colIdx = 0; colIdx < NUM_COLUMNS; colIdx++) {
    const mapsForThisColumnSegment = maps.slice(colIdx * numRows, (colIdx + 1) * numRows);
    const reversedMapItemsInSegment = mapsForThisColumnSegment.reverse();
    const columnForDisplay: (MapItem | null)[] = Array(numRows).fill(null);
    for (let itemIdx = 0; itemIdx < reversedMapItemsInSegment.length; itemIdx++) {
      columnForDisplay[numRows - 1 - itemIdx] = reversedMapItemsInSegment[itemIdx];
    }
    finalDisplayList.push(...columnForDisplay);
  }
  return finalDisplayList.slice(0, NUM_COLUMNS * numRows);
};

interface MapPoolElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
}

const formatMapNameForImagePath = (mapName: string): string => {
  if (!mapName) return 'random';
  return mapName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};

const MapPoolElement: React.FC<MapPoolElementProps> = ({ element, isBroadcast }) => {
  const {
    fontFamily = 'Arial, sans-serif',
    // isPivotLocked = false, // Commented out as unused
    horizontalSplitOffset = 0,
  } = element;

  const {
    aoe2cmRawDraftOptions,
    mapPicksHost,
    mapBansHost,
    mapPicksGuest,
    mapBansGuest,
    mapPicksGlobal,
    forceMapPoolUpdate,
  } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    mapPicksHost: state.mapPicksHost,
    mapBansHost: state.mapBansHost,
    mapPicksGuest: state.mapPicksGuest,
    mapBansGuest: state.mapBansGuest,
    mapPicksGlobal: state.mapPicksGlobal,
    forceMapPoolUpdate: state.forceMapPoolUpdate,
  }));

  const deriveMapPool = useCallback((playerType: 'host' | 'guest'): MapItem[] => {
    if (!aoe2cmRawDraftOptions) return [];
    const currentAvailableMaps = aoe2cmRawDraftOptions
      .filter((opt: DraftOption) => opt.id && !opt.id.startsWith('aoe4.'))
      .map((opt: DraftOption) => opt.name || opt.id!); // Ensure opt.id is non-null if name is not present

    return currentAvailableMaps.map((mapName: string) => { // Added type for mapName
      let status: MapItem['status'] = 'default';
      const imageUrl = `/assets/maps/${formatMapNameForImagePath(mapName)}.png`;

      if (mapPicksGlobal.includes(mapName)) {
        status = 'adminPicked';
      } else if (playerType === 'host') {
        if (mapPicksHost.includes(mapName)) status = 'picked';
        else if (mapBansHost.includes(mapName)) status = 'banned';
        else if (mapPicksGuest.includes(mapName) || mapBansGuest.includes(mapName)) status = 'affected';
      } else {
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
  }, [deriveMapPool, forceMapPoolUpdate]);

  const player2MapPool = useMemo(() => {
    const pool = deriveMapPool('guest');
    return reorderMapsForDisplay(pool, NUM_ROWS);
  }, [deriveMapPool, forceMapPoolUpdate]);

  const p1TranslateX = -(element.horizontalSplitOffset || 0);
  const p2TranslateX = (element.horizontalSplitOffset || 0);

  // const REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX = 30; // Commented out as unused
  const BASELINE_FONT_SIZE_UNSCALED_PX = 10;
  const dynamicFontSize = BASELINE_FONT_SIZE_UNSCALED_PX;

  const mapItemWidth = 250;
  const mapItemHeight = 160;

  const noMapsAvailableInOptions = !aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.filter((opt: DraftOption) => opt.id && !opt.id.startsWith('aoe4.')).length === 0;

  // console.log('[MapPoolElement] Debugging conditional null return:');
  // console.log('[MapPoolElement] isBroadcast:', isBroadcast);
  // console.log('[MapPoolElement] player1MapPool.length:', player1MapPool.length);
  // console.log('[MapPoolElement] player1MapPool (contents):', JSON.parse(JSON.stringify(player1MapPool)));
  // console.log('[MapPoolElement] player2MapPool.length:', player2MapPool.length);
  // console.log('[MapPoolElement] player2MapPool (contents):', JSON.parse(JSON.stringify(player2MapPool)));
  // console.log('[MapPoolElement] noMapsAvailableInOptions:', noMapsAvailableInOptions);
  // console.log('[MapPoolElement] aoe2cmRawDraftOptions:', aoe2cmRawDraftOptions ? JSON.parse(JSON.stringify(aoe2cmRawDraftOptions)) : undefined);
  // console.log('[MapPoolElement] mapPicksGlobal:', mapPicksGlobal ? JSON.parse(JSON.stringify(mapPicksGlobal)) : undefined);
  // console.log('[MapPoolElement] mapPicksHost:', mapPicksHost ? JSON.parse(JSON.stringify(mapPicksHost)) : undefined);
  // console.log('[MapPoolElement] mapBansHost:', mapBansHost ? JSON.parse(JSON.stringify(mapBansHost)) : undefined);
  // console.log('[MapPoolElement] mapPicksGuest:', mapPicksGuest ? JSON.parse(JSON.stringify(mapPicksGuest)) : undefined);
  // console.log('[MapPoolElement] mapBansGuest:', mapBansGuest ? JSON.parse(JSON.stringify(mapBansGuest)) : undefined);
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
        {!isBroadcast && player1MapPool.filter(Boolean).length === 0 && noMapsAvailableInOptions && <div className={styles.noMapsMessage}>(P1: No Maps Available in Draft)</div>}
        {player1MapPool.map((mapItem, index) => {
          if (!mapItem) {
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
        {!isBroadcast && player2MapPool.filter(Boolean).length === 0 && noMapsAvailableInOptions && <div className={styles.noMapsMessage}>(P2: No Maps Available in Draft)</div>}
        {player2MapPool.map((mapItem, index) => {
          if (!mapItem) {
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
