import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
import styles from './MapPoolElement.module.css';

interface MapPoolElementProps {
  element: StudioElement;
}

const MapPoolElement: React.FC<MapPoolElementProps> = ({ element }) => {
  // Defensive check removed
  // const { ... } = useDraftStore hook remains the same
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

  // Destructure other props directly from `element` prop
  const {
    size,
    backgroundColor,
    borderColor,
    textColor,
    fontFamily: ownFontFamily,
    scale: ownScale,
    isPivotLocked: ownIsPivotLocked,
    pivotInternalOffset: ownPivotInternalOffset,
    playerId,
    pairId,
    isPairMaster,
  } = element;

  // Logging for defaults removed

  let displayFontFamily = ownFontFamily || 'Arial, sans-serif';
  let displayIsPivotLocked = ownIsPivotLocked === undefined ? false : ownIsPivotLocked;
  let displayScale = ownScale === undefined ? 1 : ownScale;
  let displayPivotInternalOffset = ownPivotInternalOffset === undefined ? 0 : ownPivotInternalOffset;
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
      displayPivotInternalOffset = masterElement.pivotInternalOffset === undefined ? displayPivotInternalOffset : masterElement.pivotInternalOffset;
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

  const perspective = element.playerId === 'P1' ? 'P1' : 'P2'; // Ensure element.playerId is used

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

  const numMapsForThisView = maps.length; // Still useful for the "No maps available" check

  const baseSizeWidth = size.width || 300; // Retain for overall component sizing
  const baseSizeHeight = size.height || 200; // Retain for overall component sizing

  // scalerLayoutWidth and scalerLayoutHeight are used by mapPoolScalerStyle for scaling.
  const scalerLayoutWidth = baseSizeWidth;
  const scalerLayoutHeight = baseSizeHeight;

  // viewCols, viewRows, viewItemWidth, viewItemHeight, textHeightWithinItem are removed.
  // Font size calculations will now use size.width, size.height and maxRows directly.

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

  // Define prepareMapsForGrid helper function
  const prepareMapsForGrid = (
    originalMaps: any[], // TODO: Replace any[] with the actual type of map objects
    maxRowsPerColumn: number
  ): any[] => {
    const items = [...originalMaps]; // Shallow copy
    const orderedMaps: any[] = [];

    for (let i = 0; i < items.length; i += maxRowsPerColumn) {
      const chunk = items.slice(i, i + maxRowsPerColumn);
      orderedMaps.push(...chunk.reverse()); // Add reversed chunk to the final list
    }
    return orderedMaps;
  };

  const maxRows = perspective === 'P1' ? 4 : 3;
  const processedMaps = prepareMapsForGrid(maps, maxRows);

  const getMapItemClassName = (mapName: string) => {
    let itemClassName = styles['map-item-visual-content'];
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
        width: `${baseSizeWidth * displayScale}px`,
        height: `${baseSizeHeight * displayScale}px`,
        backgroundColor: displayBackgroundColor,
        border: `1px solid ${displayBorderColor}`,
        overflow: 'hidden',
        transform: rootTransform || undefined,
        transition: 'transform 0.2s ease-out',
      }}
    >
      <div
        className={styles['map-pool-scaler']} // This class handles the scaling
        style={mapPoolScalerStyle}
      >
        <div
          className={`${styles['player-map-grid']} ${perspective === 'P1' ? styles.player1MapGrid : styles.player2MapGrid}`}
          style={
            {
              // Inline styles (width, height, display, gridTemplateColumns,
              // gridTemplateRows, gap, padding, overflow) are now handled by CSS module.
            }
          }
        >
          {processedMaps.map(map => ( // Use processedMaps here
            <div
              key={`${element.playerId}-${map.id}`} // Use element.playerId for key consistency
              title={map.name}
              className={styles['map-item-grid-cell']} // Existing class for cell, if any specific styling needed
            >
              <div className={getMapItemClassName(map.name)}>
                <div className={styles['map-image-container']}>
                  <img
                    src={getMapImageSrc(map.name)}
                    alt={map.name}
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
                        // Adjusted font size calculation:
                        const conceptualItemWidth = size.width / 5; // 5 columns
                        const conceptualItemHeight = size.height / maxRows;
                        const textHeight = conceptualItemHeight * 0.2; // Text area is 20% of item height
                        // Font size is 70% of text area height, capped by width and an absolute max.
                        placeholder.style.fontSize = Math.min(textHeight * 0.7, conceptualItemWidth / (map.name.length * 0.55), 10) + 'px';
                        placeholder.style.color = displayTextColor || 'grey';
                        placeholder.style.textAlign = 'center';
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                </div>
                <p
                  className={styles['map-name']}
                  style={{
                    color: displayTextColor || '#f0f0f0',
                    fontFamily: displayFontFamily,
                    // Adjusted font size calculation:
                    // Font size is 70% of 20% of item height, capped by item width relative to name length, and absolute max.
                    fontSize: Math.min((size.height / maxRows) * 0.2 * 0.7, (size.width / 5) / (map.name.length * 0.5 + 2), 11.5) + 'px',
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
