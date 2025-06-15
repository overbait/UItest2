import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStudio } from '@/contexts/StudioContext';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css'; // Import styles for ResizableBox
import styles from './MapPoolElement.module.css'; // Import CSS module
import { CivIcon } from '@/components/CivIcon/CivIcon';
import { MapIcon }
from '@/components/MapIcon/MapIcon';

interface MapPoolElementProps {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  scale?: number;
  playerId?: 'P1' | 'P2'; // Added to identify player context
  pairId?: string; // Added for pairing elements
  isPairMaster?: boolean; // Designates this as the master element for paired resizing
}

const MapPoolElement: React.FC<MapPoolElementProps> = ({
  id,
  position,
  size,
  scale = 1,
  playerId,
  pairId,
  isPairMaster,
}) => {
  const { updateElementPosition, updateElementSize, selectedElementId, setSelectedElementId, getElement } = useStudio();
  const [currentSize, setCurrentSize] = useState(size);
  const [currentPosition, setCurrentPosition] = useState(position);
  constscaledWidth = useMemo(() => currentSize.width * scale, [currentSize.width, scale]);
  const scaledHeight = useMemo(() => currentSize.height * scale, [currentSize.height, scale]);

  const maps = ['Arabia', 'Arena', 'Baltic', 'Blackforest', 'Coastal', 'Continental', 'Craterlake', 'Fortress', 'Ghostlake', 'Goldrush', 'Highland', 'Islands', 'Lombardia', 'Mediterranean', 'Megarandom', 'Nomad', 'Oasis', 'Pacificislands', 'Rivers', 'Scandinavia', 'Socotra', 'Steppe', 'Teamislands', 'Valley', 'Yucatan'];

  // Handle element selection
  const handleSelectElement = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    setSelectedElementId(id);
  };

  constisSelected = selectedElementId === id;

  // Effect to update local state when props change (e.g., undo/redo, loading layout)
  useEffect(() => {
    setCurrentSize(size);
  }, [size]);

  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  // Master element logic for paired resizing
  useEffect(() => {
    if (isPairMaster && pairId) {
      const pairedElement = getElement(pairId);
      if (pairedElement && (pairedElement.size.width !== currentSize.width || pairedElement.size.height !== currentSize.height)) {
        updateElementSize(pairId, currentSize.width, currentSize.height);
      }
    }
  }, [currentSize, isPairMaster, pairId, updateElementSize, getElement]);


  return (
    <ResizableBox
      width={scaledWidth}
      height={scaledHeight}
      onResizeStop={(e, data) => {
        const newWidth = data.size.width / scale;
        const newHeight = data.size.height / scale;
        updateElementSize(id, newWidth, newHeight);
        setCurrentSize({ width: newWidth, height: newHeight }); // Update local state
      }}
      draggableOpts={{
        onStop: (e, data) => {
          updateElementPosition(id, data.x, data.y);
          setCurrentPosition({ x: data.x, y: data.y }); // Update local state
        },
        disabled: isSelected ? false : true, // Enable dragging only if selected
      }}
      minConstraints={[100 * scale, 50 * scale]} // Minimum size, adjusted by scale
      maxConstraints={[1200 * scale, 1000 * scale]} // Maximum size, adjusted by scale
      style={{
        position: 'absolute',
        left: currentPosition.x,
        top: currentPosition.y,
        border: isSelected ? '2px solid #007bff' : '2px solid transparent',
        transition: 'border-color 0.2s', // Smooth transition for border color
        overflow: 'hidden', // Ensure content does not spill out
      }}
      className={styles.mapPoolContainer} // Apply main container style
      onClick={handleSelectElement} // Select element on click
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexWrap: 'wrap', // Allow items to wrap to the next line
          justifyContent: 'flex-start', // Align items to the start of the container
          alignItems: 'flex-start', // Align items to the start of the container
          padding: '10px', // Add some padding inside the container
          boxSizing: 'border-box', // Ensure padding is included in width/height
          overflowY: 'auto', // Allow vertical scrolling if content overflows
        }}
      >
        {maps.map((map) => (
          <div key={map} className={styles.mapItem}>
            <MapIcon mapName={map} style={{ width: '50px', height: '50px' }} />
            <span className={styles.mapName}>{map}</span>
          </div>
        ))}
      </div>
    </ResizableBox>
  );
};

export default MapPoolElement;
