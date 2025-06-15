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
    currentCanvases,
    activeCanvasId: currentActiveCanvasId,
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
    fontFamily: ownFontFamily,
    scale: ownScale,
    isPivotLocked: ownIsPivotLocked,
    pivotInternalOffset: ownPivotInternalOffset, // Added
    playerId,
    pairId,
    isPairMaster,
  } = element;

  let displayFontFamily = ownFontFamily || 'Arial, sans-serif';
  let displayIsPivotLocked = ownIsPivotLocked === undefined ? false : ownIsPivotLocked;
  let displayScale = ownScale === undefined ? 1 : ownScale;
  let displayPivotInternalOffset = ownPivotInternalOffset === undefined ? 0 : ownPivotInternalOffset; // Added
  let displayBackgroundColor = backgroundColor || 'transparent';
  let displayBorderColor = borderColor || 'transparent';
  let displayTextColor = textColor || 'white';

  if (isPairMaster === false && pairId) {
    const activeLayout = currentCanvases.find(c => c.id === currentActiveCanvasId)?.layout || [];
    const masterElement = activeLayout.find(el => el.pairId === pairId && el.isPairMaster === true);
    if (masterElement) {
      displayFontFamily = masterElement.fontFamily || displayFontFamily;
      displayIsPivotLocked = masterElement.isPivotLocked === undefined ? displayIsPivotLocked : masterElement.isPivotLocked;
      displayScale = masterElement.scale === undefined ? displayScale : masterElement.scale;
      displayPivotInternalOffset = masterElement.pivotInternalOffset === undefined ? displayPivotInternalOffset : masterElement.pivotInternalOffset; // Added
      displayBackgroundColor = masterElement.backgroundColor || displayBackgroundColor;
      displayBorderColor = masterElement.borderColor || displayBorderColor;
      displayTextColor = masterElement.textColor || displayTextColor;
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

  const perspective = playerId === 'P1' ? 'P1' : 'P2';

  if (mapDraftStatus !== 'connected' && mapDraftStatus !== 'live') {
    return (
      <div
        style={{
          width: size.width, height: size.height, backgroundColor: displayBackgroundColor,
          border: `1px solid ${displayBorderColor}`, overflow: 'hidden', display: 'flex',
          justifyContent: 'center', alignItems: 'center', color: displayTextColor,
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
          width: size.width, height: size.height, backgroundColor: displayBackgroundColor,
          border: `1px solid ${displayBorderColor}`, overflow: 'hidden', display: 'flex',
          justifyContent: 'center', alignItems: 'center', color: displayTextColor,
          fontFamily: displayFontFamily, fontSize: Math.min(size.width / 10, size.height / 3) + 'px',
        }}
        className={styles['map-pool-element']}
      >
        <p>No maps available for {perspective}.</p>
      </div>
    );
  }

  const numMapsForThisView = maps.length;
  const viewCols = Math.ceil(Math.sqrt(numMapsForThisView));
  const viewRows = Math.ceil(numMapsForThisView / viewCols);

  // Define base layout dimensions (at scale = 1)
  const baseSizeWidth = size.width || 300; // Default if size.width is undefined
  const baseSizeHeight = size.height || 200; // Default if size.height is undefined

  // Scaler layout dimensions are the base dimensions
  const scalerLayoutWidth = baseSizeWidth;
  const scalerLayoutHeight = baseSizeHeight;

  // viewItem dimensions are calculated based on the scaler's layout dimensions
  const viewItemWidth = scalerLayoutWidth / viewCols;
  const viewItemHeight = scalerLayoutHeight / viewRows;

  const textHeightWithinItem = viewItemHeight * 0.2;

  // const scalerTransformOrigin: React.CSSProperties['transformOrigin'] = displayIsPivotLocked ? 'center center' : 'top left'; // Will be part of mapPoolScalerStyle

  const mapPoolScalerStyle: React.CSSProperties = {
    width: `${scalerLayoutWidth}px`,
    height: `${scalerLayoutHeight}px`,
    position: 'relative',
  };

  if (displayIsPivotLocked) {
    mapPoolScalerStyle.left = '50%';
    mapPoolScalerStyle.top = '50%';
    mapPoolScalerStyle.transform = `translate(-50%, -50%) scale(${displayScale})`;
    mapPoolScalerStyle.transformOrigin = 'center center';
  } else {
    mapPoolScalerStyle.left = '0%';
    mapPoolScalerStyle.top = '0%';
    mapPoolScalerStyle.transform = `scale(${displayScale})`;
    mapPoolScalerStyle.transformOrigin = 'top left';
  }

  const getMapItemClassName = (mapName: string) => {
    let itemClassName = styles['map-item-visual-content']; // Base class is now visual-content
    if (perspective === 'P1') {
      if (mapBansHost.includes(mapName)) itemClassName += ` ${styles['map-item-banned-by-self']}`;
      else if (mapPicksHost.includes(mapName)) itemClassName += ` ${styles['map-item-picked-by-self']}`;
      else if (mapBansGuest.includes(mapName) || mapPicksGuest.includes(mapName) || mapBansGlobal.includes(mapName) || mapPicksGlobal.includes(mapName))
        itemClassName += ` ${styles['map-item-affected-by-opponent']}`;
    } else {
      if (mapBansGuest.includes(mapName)) itemClassName += ` ${styles['map-item-banned-by-self']}`;
      else if (mapPicksGuest.includes(mapName)) itemClassName += ` ${styles['map-item-picked-by-self']}`;
      else if (mapBansHost.includes(mapName) || mapPicksHost.includes(mapName) || mapBansGlobal.includes(mapName) || mapPicksGlobal.includes(mapName))
        itemClassName += ` ${styles['map-item-affected-by-opponent']}`;
    }
    return itemClassName;
  };

  let rootTransform = '';
  if (displayIsPivotLocked && displayPivotInternalOffset !== 0) {
    if (element.playerId === 'P1') {
      rootTransform = `translateX(-${displayPivotInternalOffset}px)`;
    } else if (element.playerId === 'P2') {
      rootTransform = `translateX(${displayPivotInternalOffset}px)`;
    }
  }

  return (
    <div
      className={styles['map-pool-element']}
      style={{
        width: `${baseSizeWidth * displayScale}px`, // Viewport is scaled size
        height: `${baseSizeHeight * displayScale}px`, // Viewport is scaled size
        backgroundColor: displayBackgroundColor,
        border: `1px solid ${displayBorderColor}`,
        overflow: 'hidden',
        transform: rootTransform || undefined, // Added
        transition: 'transform 0.2s ease-out', // Added
      }}
    >
      <div
        className={styles['map-pool-scaler']}
      style={mapPoolScalerStyle}
      >
        <div
          className={styles['player-map-grid']}
          style={{
            width: '100%', height: '100%', display: 'grid',
            gridTemplateColumns: `repeat(${viewCols}, 1fr)`,
            gridTemplateRows: `repeat(${viewRows}, 1fr)`,
            gap: '1px', // MODIFIED
            padding: '2px', // MODIFIED
            overflow: 'auto',
          }}
        >
          {maps.map(map => (
            <div
              key={`${playerId}-${map.id}`}
              title={map.name}
              className={styles['map-item-grid-cell']} // Outer div is now the grid cell
            >
              <div className={getMapItemClassName(map.name)}> {/* Inner div for visual content & state classes */}
                <div className={styles['map-image-container']}>
                  <img
                    src={getMapImageSrc(map.name)}
                    alt={map.name}
                    // Removed inline styles to rely on CSS module
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
                        placeholder.style.color = displayTextColor || 'grey'; // Use displayTextColor
                        placeholder.style.textAlign = 'center';
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                  {/* Map name is now a sibling of map-image-container, within map-item-visual-content */}
                </div>
                <p
                  className={styles['map-name']}
                  style={{
                    color: displayTextColor || '#f0f0f0', // Use displayTextColor
                    fontFamily: displayFontFamily,
                    fontSize: Math.min(textHeightWithinItem * 0.7, viewItemWidth / (map.name.length * 0.5 + 2), 11.5) + 'px', // MODIFIED
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
