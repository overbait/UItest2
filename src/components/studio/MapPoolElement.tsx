import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
import styles from './MapPoolElement.module.css'; // Import CSS module

interface MapPoolElementProps {
  element: StudioElement;
}

const MapPoolElement: React.FC<MapPoolElementProps> = ({ element }) => {
  const { aoe2cmRawDraftOptions, mapDraftStatus } = useDraftStore(state => ({
    aoe2cmRawDraftOptions: state.aoe2cmRawDraftOptions,
    mapDraftStatus: state.mapDraftStatus,
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

  const itemWidth = element.size.width / cols;
  const itemHeight = element.size.height / rows;

  // Determine if image or text is the limiting factor for size
  const imageMaxHeight = itemHeight * 0.7; // Image takes 70% of item height
  const textMaxHeight = itemHeight * 0.25; // Text takes 25% of item height

  return (
    <div
      style={{
        width: element.size.width,
        height: element.size.height,
        backgroundColor: element.backgroundColor || 'transparent',
        border: `1px solid ${element.borderColor || 'transparent'}`,
        overflow: 'auto', // Changed to auto to allow scrolling if content overflows
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: '5px', // Small gap between items
        padding: '5px', // Padding around the grid
        // boxSizing: 'border-box', // Handled by CSS module
      }}
      className={styles['map-pool-element']} // Use CSS module class
    >
      {maps.map(map => (
        <div
          key={map.id}
          title={map.name}
          className={styles['map-item']} // Use CSS module class for map items
          // Inline styles for dynamic grid layout are still needed here
          style={{
            // width: '100%', // These are implicitly handled by grid
            // height: '100%',
          }}
        >
          <img
            src={getMapImageSrc(map.name)}
            alt={map.name}
            className={styles['map-image']} // Use CSS module class for map images
            style={{
              maxWidth: itemWidth * 0.9,
              maxHeight: imageMaxHeight,
              // objectFit and marginBottom are now in CSS module
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              // Consider adding a placeholder text via a sibling element if image fails
              const placeholder = document.createElement('span');
              placeholder.textContent = `${map.name} (img not found)`;
              placeholder.style.fontSize = Math.min(textMaxHeight, itemWidth / (map.name.length * 0.6), 12) + 'px';
              placeholder.style.color = element.textColor || 'grey';
              e.currentTarget.parentNode?.appendChild(placeholder);
            }}
          />
          <p
            className={styles['map-name']} // Use CSS module class for map names
            style={{
              color: element.textColor || 'white',
              fontFamily: element.fontFamily || 'Arial, sans-serif',
              fontSize: Math.min(textMaxHeight, itemWidth / (map.name.length * 0.55), 16) + 'px', // Adjusted multiplier slightly
              // Other text properties (textAlign, margin, whiteSpace, overflow, textOverflow, width) are in CSS module
            }}
          >
            {map.name}
          </p>
        </div>
      ))}
    </div>
  );
};

export default MapPoolElement;
