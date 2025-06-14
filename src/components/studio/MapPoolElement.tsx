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
    isPivotLocked = false, // Default from store is now false
    pivotInternalOffset = 10
  } = element;

  // Calculate dimensions for player views
  const unscaledWidth = size.width; // Total unscaled width of the element
  const actualPivotOffset = Math.max(0, pivotInternalOffset); // Ensure non-negative

  let p1ViewWidth = (unscaledWidth - actualPivotOffset) / 2;
  let p2ViewWidth = p1ViewWidth;
  let p1Transform = '';
  let p2Transform = '';
  let scalerTransformOrigin = 'top left'; // Default for non-locked pivot

  if (isPivotLocked) {
    // When pivot is locked, views might adjust width and position to simulate expanding from center.
    // This interpretation means the `pivotInternalOffset` is the fixed space, and views expand/contract around it.
    // The visual center of the content (midpoint of pivotInternalOffset) should remain stable relative to the element's center.
    // For now, the behavior when locked is the same as unlocked in terms of width calculation,
    // as the "mirroring drag" is complex and depends on external drag handlers updating size.width.
    // Transforms might be needed if the *content* within the views needs to mirror (not the case here).
    // If the goal is that the visual center of the *entire element* is the pivot for scaling:
    scalerTransformOrigin = 'center center';
    // The player view widths remain the same, the entire scaled block just positions differently.
    // No specific translateX needed on player views for this interpretation of locked pivot,
    // as the flex layout within the scaler handles their positioning around the spacer.
  }
  const playerViewUnscaledWidth = (unscaledWidth / scale - actualPivotOffset) / 2;


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
                    color: textColor || 'white', // Use element's textcolor prop for map names too
                    fontFamily: fontFamily || 'Arial, sans-serif', // Use element's font prop
                    // Font size is now primarily controlled by CSS, but dynamic part can be added if needed
                    // fontSize: Math.min(viewTextMaxHeight, viewItemWidth / (map.name.length * 0.55), 14) + 'px',
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
          width: `${unscaledWidth / scale}px`, // Scaler takes up unscaled dimensions
          height: `${size.height / scale}px`,
          display: 'flex',
          justifyContent: 'center', // Center the player views and spacer within the scaler
        }}
      >
        {/* Player 1 View (Left) */}
        <div
          className={styles['player-view']}
          style={{
            width: playerViewUnscaledWidth, // Use unscaled width
            height: '100%',
            transform: p1Transform, // Apply transform if needed for locked pivot
          }}
        >
          {renderMapView('P1', playerViewUnscaledWidth)}
        </div>

        {/* Spacer Div (Unscaled) */}
        <div style={{ width: actualPivotOffset, height: '100%', flexShrink: 0 }}></div>

        {/* Player 2 View (Right) */}
        <div
          className={styles['player-view']}
          style={{
            width: playerViewUnscaledWidth, // Use unscaled width
            height: '100%',
            transform: p2Transform, // Apply transform if needed for locked pivot
          }}
        >
          {renderMapView('P2', playerViewUnscaledWidth)}
        </div>
      </div>
    </div>
  );
};

export default MapPoolElement;
