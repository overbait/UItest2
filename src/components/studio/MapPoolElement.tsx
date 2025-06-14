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
    isPivotLocked = false,
    pivotInternalOffset // No default here, rely on store or undefined
  } = element;

  // Calculate dimensions for player views
  const unscaledWidth = size.width;

  // Define a small, fixed internal gap when isPivotLocked is false
  const FIXED_GAP_WHEN_UNLOCKED = 10; // Unscaled pixels

  let viewContainerJustifyContent: React.CSSProperties['justifyContent'] = 'center';
  let gapWidth = 0; // This will be the actual gap used in layout (unscaled)

  if (isPivotLocked) {
    scalerTransformOrigin = 'center center';
    // When locked, the views are pushed apart by available space.
    // The 'space-between' will act on the player views directly.
    // No explicit gap div needed if player views are direct children of the flex container.
    viewContainerJustifyContent = 'space-between';
    gapWidth = 0; // Space is handled by justify-content
  } else {
    scalerTransformOrigin = 'top left';
    // When not locked, they are a fixed block. Use a small fixed gap.
    viewContainerJustifyContent = 'flex-start';
    gapWidth = FIXED_GAP_WHEN_UNLOCKED / scale; // Scale the gap as it's part of the unscaled layout
  }

  // Each player view takes up available space minus the gap, divided by two.
  // This width is *within the scaled container*.
  const playerViewUnscaledWidth = ( (unscaledWidth / scale) - gapWidth ) / 2;
  let scalerTransformOrigin = 'top left'; // Default for non-locked pivot

  if (isPivotLocked) {
    scalerTransformOrigin = 'center center';
  }


  const renderMapView = (playerPerspective: 'P1' | 'P2', viewSpecificWidth: number) => {
    // Grid calculation per view
    const numMapsPerView = maps.length; // Both views show all maps for now
    if (numMapsPerView === 0) return null; // Should be caught by earlier checks, but good practice

    const viewCols = Math.ceil(Math.sqrt(numMapsPerView));
    const viewRows = Math.ceil(numMapsPerView / viewCols);

    // Use the viewSpecificWidth (which is unscaled) for item width calculation
    const viewItemWidth = viewSpecificWidth / viewCols;
    // Height for items is based on the total UN SCALED element height, divided by rows per view
    const viewItemHeight = (size.height / scale) / viewRows;

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
              {/* Map Image Container now also serves as the direct parent for absolute positioning of map name */}
              <div className={styles['map-image-container']}>
                <img
                  src={getMapImageSrc(map.name)}
                  alt={map.name}
                  style={{
                    maxWidth: '100%', // Ensure image scales down if container is smaller
                    maxHeight: '100%',
                    objectFit: 'cover' // This is now explicitly set here, was in CSS
                  }}
                  onError={(e) => {
                    const imgElement = e.target as HTMLImageElement;
                    imgElement.style.display = 'none';
                    const parent = imgElement.parentNode as HTMLElement | null; // Type assertion
                    if (parent) {
                      // Remove any existing placeholder before adding a new one
                      const existingPlaceholder = parent.querySelector('.map-image-placeholder');
                      if (existingPlaceholder) {
                        parent.removeChild(existingPlaceholder);
                      }
                      const placeholder = document.createElement('span');
                      placeholder.className = 'map-image-placeholder'; // Add a class for potential styling
                      placeholder.textContent = `${map.name} (img err)`;
                      placeholder.style.fontSize = Math.min(viewTextMaxHeight, viewItemWidth / (map.name.length * 0.6), 10) + 'px';
                      placeholder.style.color = textColor || 'grey';
                      placeholder.style.textAlign = 'center';
                      parent.appendChild(placeholder);
                    }
                  }}
                />
                {/* Map Name is now inside map-image-container for positioning */}
                <p
                  className={styles['map-name']}
                  style={{
                    color: textColor || 'white',
                    fontFamily: fontFamily || 'Arial, sans-serif',
                    fontSize: Math.min(viewTextMaxHeight * 0.8, viewItemWidth / (map.name.length * 0.45), 12) + 'px', // Adjusted font size calculation
                  }}
                >
                  {map.name}
                </p>
              </div>
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
        style={{
          transform: `scale(${scale})`,
          transformOrigin: scalerTransformOrigin,
          width: `${unscaledWidth / scale}px`,
          height: `${size.height / scale}px`,
          display: 'flex',
          justifyContent: viewContainerJustifyContent,
          alignItems: 'stretch', // Ensure player views take full height of scaler
        }}
      >
        {/* Player 1 View (Left) */}
        <div
          className={styles['player-view']}
          style={{
            width: playerViewUnscaledWidth,
            height: '100%',
          }}
        >
          {renderMapView('P1', playerViewUnscaledWidth)}
        </div>

        {/* Conditional Spacer Div for when not locked and a fixed gap is desired */}
        {!isPivotLocked && gapWidth > 0 && (
          <div style={{ width: gapWidth, height: '100%', flexShrink: 0 }}></div>
        )}

        {/* Player 2 View (Right) */}
        <div
          className={styles['player-view']}
          style={{
            width: playerViewUnscaledWidth,
            height: '100%',
          }}
        >
          {renderMapView('P2', playerViewUnscaledWidth)}
        </div>
      </div>
    </div>
  );
};

export default MapPoolElement;
