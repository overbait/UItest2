import React, { useMemo } from 'react'; // Import useMemo
import useDraftStore from '../../store/draftStore';
import { StudioElement, MapItem, Aoe2cmRawDraftData } from '../../types/draft'; // Added Aoe2cmRawDraftData
import styles from './MapPoolElement.module.css';

interface MapPoolElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
}

// Helper function (similar to BoXSeriesOverviewElement)
const formatMapNameForImagePath = (mapName: string): string => {
  if (!mapName) return 'random'; // Or a placeholder image name
  return mapName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};

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

  const availableMaps = useMemo(() => {
    if (!aoe2cmRawDraftOptions) return [];
    return aoe2cmRawDraftOptions
      .filter(opt => opt.id && !opt.id.startsWith('aoe4.')) // Filter for maps
      .map(opt => opt.name || opt.id); // Get map names
  }, [aoe2cmRawDraftOptions]);


  const deriveMapPool = (playerType: 'host' | 'guest'): MapItem[] => {
    return availableMaps.map(mapName => {
      let status: MapItem['status'] = 'default';
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
  };

  const player1MapPool = useMemo(() => deriveMapPool('host'), [availableMaps, mapPicksHost, mapBansHost, mapPicksGuest, mapBansGuest, mapPicksGlobal]);
  const player2MapPool = useMemo(() => deriveMapPool('guest'), [availableMaps, mapPicksGuest, mapBansGuest, mapPicksHost, mapBansHost, mapPicksGlobal]);

  // --- Temporary sample data REMOVED ---

  const p1TranslateX = -(element.horizontalSplitOffset || 0);
  const p2TranslateX = (element.horizontalSplitOffset || 0);

  const REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX = 30;
  const BASELINE_FONT_SIZE_UNSCALED_PX = 10;
  const dynamicFontSize = BASELINE_FONT_SIZE_UNSCALED_PX;

  const mapItemWidth = 100;
  const mapItemHeight = 60;

  if (isBroadcast && player1MapPool.length === 0 && player2MapPool.length === 0 && availableMaps.length === 0) {
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
        {!isBroadcast && availableMaps.length === 0 && <div className={styles.noMapsMessage}>(P1: No Maps Available in Draft)</div>}
        {player1MapPool.map((mapItem, index) => (
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
        ))}
      </div>

      <div
        className={`${styles.playerMapGrid} ${styles.player2Grid}`}
        style={{
          transform: `translateX(${p2TranslateX}px)`,
        }}
      >
        {!isBroadcast && availableMaps.length === 0 && <div className={styles.noMapsMessage}>(P2: No Maps Available in Draft)</div>}
        {player2MapPool.map((mapItem, index) => (
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
        ))}
      </div>
    </div>
  );
};

export default MapPoolElement;
