import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
import styles from './MapPoolElement.module.css'; // Import CSS module

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
  } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    mapDraftStatus: state.mapDraftStatus,
    mapPicksHost: state.mapPicksHost,
    mapBansHost: state.mapBansHost,
    mapPicksGuest: state.mapPicksGuest,
    mapBansGuest: state.mapBansGuest,
    mapPicksGlobal: state.mapPicksGlobal,
    mapBansGlobal: state.mapBansGlobal,
  }));

  // Function to transform map name to image filename
  const getMapImageSrc = (mapName: string): string => {
    const imageName = mapName
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[():]/g, ''); // Remove parentheses and colons
    return `assets/maps/${imageName}.png`;
  };

  const maps = React.useMemo(() => {
    if (!aoe2cmRawDraftOptions || aoe2cmRawDraftOptions.length === 0) {
      return [];
    }
    // Filter out civs (assuming civs have 'aoe4.' prefix in their ID)
    // and ensure name property exists
    return aoe2cmRawDraftOptions.filter(
      option => option.id && !option.id.startsWith('aoe4.') && option.name
    );
  }, [aoe2cmRawDraftOptions]);

  if (mapDraftStatus !== 'connected' && mapDraftStatus !== 'live') {
    return (
      <div
        style={{
          width: element.size.width,
          height: element.size.height,
          backgroundColor: element.backgroundColor || 'transparent',
          border: `1px solid ${element.borderColor || 'transparent'}`,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: element.textColor || 'white',
          fontFamily: element.fontFamily || 'Arial, sans-serif',
          fontSize: Math.min(element.size.width / 10, element.size.height / 3) + 'px', // Responsive font size
        }}
        className={styles['map-pool-element']} // Use CSS module class
      >
        <p>Connect to a map draft to see the map pool.</p>
      </div>
    );
  }

  if (maps.length === 0) {
    return (
      <div
        style={{
          width: element.size.width,
          height: element.size.height,
          backgroundColor: element.backgroundColor || 'transparent',
          border: `1px solid ${element.borderColor || 'transparent'}`,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: element.textColor || 'white',
          fontFamily: element.fontFamily || 'Arial, sans-serif',
          fontSize: Math.min(element.size.width / 10, element.size.height / 3) + 'px',
        }}
        className={styles['map-pool-element']} // Use CSS module class
      >
        <p>No maps found in the current draft options.</p>
      </div>
    );
  }

  // Calculate image and text size based on element dimensions and number of maps
  const numMaps = maps.length;
  // Try to arrange maps in a grid-like fashion
  const cols = Math.ceil(Math.sqrt(numMaps));
  const rows = Math.ceil(numMaps / cols);

  // const itemWidth = element.size.width / cols;
  // const itemHeight = element.size.height / rows;

  // // Determine if image or text is the limiting factor for size
  // const imageMaxHeight = itemHeight * 0.7; // Image takes 70% of item height
  // const textMaxHeight = itemHeight * 0.25; // Text takes 25% of item height

  // For dual view, calculate width for each player's view
  // const isPivotLocked = element.isPivotLocked !== undefined ? element.isPivotLocked : true; // Assuming true if not set
  // const pivotInternalOffset = element.pivotInternalOffset || 0; // Default to 0 if not set

  // Simplified initial calculation for side-by-side views
  // This will be refined when pivot lock and offset are fully integrated.
  // Destructure element props with defaults
  const {
    size,
    backgroundColor,
    borderColor,
    textColor,
    fontFamily,
    scale = 1,
    // isPivotLocked is not directly used for layout here yet, but good to have
    // isPivotLocked = element.isPivotLocked === undefined ? true : element.isPivotLocked,
    pivotInternalOffset = 10 // Default from store is 10
  } = element;

  // Calculate dimensions for player views based on pivotInternalOffset
  // pivotInternalOffset is treated as the central gap width
  const actualPivotOffset = Math.max(0, pivotInternalOffset); // Ensure offset is not negative for calculation
  const playerViewWidth = (size.width - actualPivotOffset) / 2;


  const renderMapView = (playerPerspective: 'P1' | 'P2') => {
    // Grid calculation per view
    const numMapsPerView = maps.length; // Both views show all maps for now
    if (numMapsPerView === 0) return null; // Should be caught by earlier checks, but good practice

    const viewCols = Math.ceil(Math.sqrt(numMapsPerView));
    const viewRows = Math.ceil(numMapsPerView / viewCols);

    const viewItemWidth = playerViewWidth / viewCols;
    // Height for items is based on the total element height, divided by rows per view
    const viewItemHeight = size.height / viewRows;

    const viewImageMaxHeight = viewItemHeight * 0.6; // Adjusted for rectangular images
    const viewTextMaxHeight = viewItemHeight * 0.2;  // Adjusted for rectangular images

    return (
      <div
        className={styles['player-map-grid']} // Style for the grid container within a player view
        style={{
          width: '100%', // Takes full width of its parent player-view container
          height: '100%', // Takes full height
          display: 'grid',
          gridTemplateColumns: `repeat(${viewCols}, 1fr)`,
          gridTemplateRows: `repeat(${viewRows}, 1fr)`,
          gap: '5px',
          padding: '5px',
          overflow: 'auto', // Allow scrolling within this view if maps overflow
        }}
      >
        {maps.map(map => {
          let itemClassName = styles['map-item'];
          const mapName = map.name; // Assuming map.name is the string to check

          if (playerPerspective === 'P1') {
            if (mapBansHost.includes(mapName)) {
              itemClassName += ` ${styles['map-item-banned-by-self']}`;
            } else if (mapPicksHost.includes(mapName)) {
              itemClassName += ` ${styles['map-item-picked-by-self']}`;
            } else if (mapBansGuest.includes(mapName) || mapPicksGuest.includes(mapName) || mapBansGlobal.includes(mapName) || mapPicksGlobal.includes(mapName)) {
              itemClassName += ` ${styles['map-item-affected-by-opponent']}`;
            }
          } else { // Player 2 Perspective
            if (mapBansGuest.includes(mapName)) {
              itemClassName += ` ${styles['map-item-banned-by-self']}`;
            } else if (mapPicksGuest.includes(mapName)) {
              itemClassName += ` ${styles['map-item-picked-by-self']}`;
            } else if (mapBansHost.includes(mapName) || mapPicksHost.includes(mapName) || mapBansGlobal.includes(mapName) || mapPicksGlobal.includes(mapName)) {
              itemClassName += ` ${styles['map-item-affected-by-opponent']}`;
            }
          }

          return (
            <div
              key={`${playerPerspective}-${map.id}`}
              title={map.name}
              className={itemClassName}
            >
              <div className={styles['map-image-container']}>
                <img
                  src={getMapImageSrc(map.name)}
                  alt={map.name}
                  // className={styles['map-image']} // map-image class is now on the container
                  style={{
                    // maxWidth and maxHeight are now controlled by map-image-container and its parent
                  }}
                  onError={(e) => {
                    const imgElement = e.target as HTMLImageElement;
                    imgElement.style.display = 'none';
                    const parent = imgElement.parentNode;
                    if (parent) {
                      const placeholder = document.createElement('span');
                      placeholder.textContent = `${map.name} (img err)`;
                      placeholder.style.fontSize = Math.min(viewTextMaxHeight, viewItemWidth / (map.name.length * 0.6), 10) + 'px';
                      placeholder.style.color = textColor || 'grey';
                      placeholder.style.textAlign = 'center';
                      parent.appendChild(placeholder);
                    }
                  }}
                />
              </div>
              <p
                className={styles['map-name']}
                style={{
                  color: textColor || 'white',
                  fontFamily: fontFamily || 'Arial, sans-serif',
                  fontSize: Math.min(viewTextMaxHeight, viewItemWidth / (map.name.length * 0.55), 14) + 'px',
                }}
              >
                {map.name}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // Main return for the component
  return (
    <div
      className={styles['map-pool-element']}
      style={{
        width: size.width,
        height: size.height,
        backgroundColor: backgroundColor || 'transparent',
        border: `1px solid ${borderColor || 'transparent'}`,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <div
        className={styles['map-pool-scaler']}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100/scale}%`, height: `${100/scale}%`, display: 'flex' }}
      >
        {/* Player 1 View (Left) */}
        <div
          className={styles['player-view']}
          style={{
            width: playerViewWidth,
            height: '100%', // Height of the scaled container
          }}
        >
          {renderMapView('P1')}
        </div>

        {/* Spacer Div */}
        <div style={{ width: actualPivotOffset, height: '100%', flexShrink: 0 }}></div>

        {/* Player 2 View (Right) */}
        <div
          className={styles['player-view']}
          style={{
            width: playerViewWidth,
            height: '100%', // Height of the scaled container
          }}
        >
          {renderMapView('P2')}
        </div>
      </div>
    </div>
  );
};

export default MapPoolElement;
