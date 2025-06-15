import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
import styles from './MapPoolElement.module.css';

interface MapPoolElementProps {
  element: StudioElement;
}

const MapPoolElement: React.FC<MapPoolElementProps> = ({ element }) => {
  const {
    aoe2cmRawDraftOptions,
    mapDraftStatus,
    mapPicksHost, mapBansHost,
    mapPicksGuest, mapBansGuest,
    mapPicksGlobal, mapBansGlobal,
    currentCanvases, // For finding master element
    activeCanvasId,  // For finding master element
  } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    mapDraftStatus: state.mapDraftStatus,
    mapPicksHost: state.mapPicksHost,
    mapBansHost: state.mapBansHost,
    mapPicksGuest: state.mapPicksGuest,
    mapBansGuest: state.mapBansGuest,
    mapPicksGlobal: state.mapPicksGlobal,
    mapBansGlobal: state.mapBansGlobal,
    currentCanvases: state.currentCanvases,
    activeCanvasId: state.activeCanvasId,
  }));

  const {
    size,
    backgroundColor,
    borderColor,
    textColor,
    fontFamily: ownFontFamily, // Renamed to avoid conflict
    scale = 1,
    isPivotLocked: ownIsPivotLocked, // Renamed
    playerId, // 'P1' or 'P2', crucial for paired elements
    pairId,
    isPairMaster,
  } = element;

  // Determine effective fontFamily and isPivotLocked (from master if this is secondary)
  let displayFontFamily = ownFontFamily || 'Arial, sans-serif';
  let displayIsPivotLocked = ownIsPivotLocked === undefined ? false : ownIsPivotLocked;

  if (isPairMaster === false && pairId) {
    const activeLayout = currentCanvases.find(c => c.id === activeCanvasId)?.layout || [];
    const masterElement = activeLayout.find(el => el.pairId === pairId && el.isPairMaster === true);
    if (masterElement) {
      displayFontFamily = masterElement.fontFamily || displayFontFamily;
      displayIsPivotLocked = masterElement.isPivotLocked === undefined ? displayIsPivotLocked : masterElement.isPivotLocked;
    }
  }

  const getMapImageSrc = (mapName: string): string => {
    const imageName = mapName.toLowerCase().replace(/\s+/g, '-').replace(/[():]/g, '');
    return `assets/maps/${imageName}.png`;
  };

  const maps = React.useMemo(() => {
    if (!aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.length === 0) return [];
    return aoe2cmRawDraftOptions.filter(
      option => option.id && !option.id.startsWith('aoe4.') && option.name
    );
  }, [aoe2cmRawDraftOptions]);

  // Conditional messages
  if (mapDraftStatus !== 'connected' && mapDraftStatus !== 'live') {
    return (
      <div
        style={{
          width: size.width, height: size.height, backgroundColor: backgroundColor || 'transparent',
          border: `1px solid ${borderColor || 'transparent'}`, overflow: 'hidden', display: 'flex',
          justifyContent: 'center', alignItems: 'center', color: textColor || 'white',
          fontFamily: displayFontFamily, fontSize: Math.min(size.width / 10, size.height / 3) + 'px',
        }}
        className={styles['map-pool-element']}
      >
        <p>Connect to a map draft to see the map pool.</p>
      </div>
    );
  }

  if (maps.length === 0) {
    return (
      <div
        style={{
          width: size.width, height: size.height, backgroundColor: backgroundColor || 'transparent',
          border: `1px solid ${borderColor || 'transparent'}`, overflow: 'hidden', display: 'flex',
          justifyContent: 'center', alignItems: 'center', color: textColor || 'white',
          fontFamily: displayFontFamily, fontSize: Math.min(size.width / 10, size.height / 3) + 'px',
        }}
        className={styles['map-pool-element']}
      >
        <p>No maps available for {playerId}.</p>
      </div>
    );
  }

  // Grid calculation for the single view this component now renders
  const numMapsForThisView = maps.length;
  const viewCols = Math.ceil(Math.sqrt(numMapsForThisView));
  const viewRows = Math.ceil(numMapsForThisView / viewCols);

  const unscaledOwnWidth = size.width / scale;
  const unscaledOwnHeight = size.height / scale;

  const viewItemWidth = unscaledOwnWidth / viewCols;
  const viewItemHeight = unscaledOwnHeight / viewRows;

  const textHeightWithinItem = viewItemHeight * 0.2; // Example: text takes 20% of item height

  const scalerTransformOrigin: React.CSSProperties['transformOrigin'] = displayIsPivotLocked ? 'center center' : 'top left';

  const getMapItemClassName = (mapName: string) => {
    let itemClassName = styles['map-item'];
    const perspective = playerId; // Use the element's own playerId

    if (perspective === 'P1') {
      if (mapBansHost.includes(mapName)) itemClassName += ` ${styles['map-item-banned-by-self']}`;
      else if (mapPicksHost.includes(mapName)) itemClassName += ` ${styles['map-item-picked-by-self']}`;
      else if (mapBansGuest.includes(mapName) || mapPicksGuest.includes(mapName) || mapBansGlobal.includes(mapName) || mapPicksGlobal.includes(mapName))
        itemClassName += ` ${styles['map-item-affected-by-opponent']}`;
    } else { // Perspective === 'P2'
      if (mapBansGuest.includes(mapName)) itemClassName += ` ${styles['map-item-banned-by-self']}`;
      else if (mapPicksGuest.includes(mapName)) itemClassName += ` ${styles['map-item-picked-by-self']}`;
      else if (mapBansHost.includes(mapName) || mapPicksHost.includes(mapName) || mapBansGlobal.includes(mapName) || mapPicksGlobal.includes(mapName))
        itemClassName += ` ${styles['map-item-affected-by-opponent']}`;
    }
    return itemClassName;
  };

  return (
    <div
      className={styles['map-pool-element']}
      style={{
        width: size.width, height: size.height,
        backgroundColor: backgroundColor || 'transparent',
        border: `1px solid ${borderColor || 'transparent'}`,
        overflow: 'hidden',
      }}
    >
      <div
        className={styles['map-pool-scaler']}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: scalerTransformOrigin,
          width: `${unscaledOwnWidth}px`,
          height: `${unscaledOwnHeight}px`,
        }}
      >
        <div
          className={styles['player-map-grid']}
          style={{
            width: '100%', height: '100%', display: 'grid',
            gridTemplateColumns: `repeat(${viewCols}, 1fr)`,
            gridTemplateRows: `repeat(${viewRows}, 1fr)`,
            gap: '3px', // Reduced gap slightly for tighter packing
            padding: '3px', // Reduced padding
            overflow: 'auto',
          }}
        >
          {maps.map(map => (
            <div
              key={`${playerId}-${map.id}`} // Use element's playerId for key
              title={map.name}
              className={getMapItemClassName(map.name)}
            >
              <div className={styles['map-image-container']}>
                <img
                  src={getMapImageSrc(map.name)}
                  alt={map.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    const imgElement = e.target as HTMLImageElement;
                    imgElement.style.display = 'none';
                    const parent = imgElement.parentNode as HTMLElement | null;
                    if (parent) {
                      const existingPlaceholder = parent.querySelector('.map-image-placeholder');
                      if (existingPlaceholder) parent.removeChild(existingPlaceholder);
                      const placeholder = document.createElement('span');
                      placeholder.className = 'map-image-placeholder';
                      placeholder.textContent = `${map.name} (err)`;
                      placeholder.style.fontSize = Math.min(textHeightWithinItem * 0.7, viewItemWidth / (map.name.length * 0.55), 10) + 'px';
                      placeholder.style.color = textColor || 'grey';
                      placeholder.style.textAlign = 'center';
                      parent.appendChild(placeholder);
                    }
                  }}
                />
                <p
                  className={styles['map-name']}
                  style={{
                    color: textColor || '#f0f0f0', // Default to BoX off-white
                    fontFamily: displayFontFamily, // Use derived font family
                    fontSize: Math.min(textHeightWithinItem * 0.75, viewItemWidth / (map.name.length * 0.5 + 2), parseFloat(styles.mapName?.fontSize || '13px') * 0.9) + 'px',
                  }}
                >
                  {map.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapPoolElement;
