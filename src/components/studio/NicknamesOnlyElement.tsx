import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
import styles from './NicknamesOnlyElement.module.css'; // Import styles

interface NicknamesOnlyElementProps {
  element: StudioElement;
  isSelected?: boolean; // Kept for interface consistency, not used in rendering logic
  isBroadcast?: boolean; // Kept for interface consistency
}

const NicknamesOnlyElement: React.FC<NicknamesOnlyElementProps> = ({ element }) => {
  const {
    currentCanvases,
    activeCanvasId,
    liveHostName,
    liveGuestName
  } = useDraftStore(state => ({
    currentCanvases: state.currentCanvases,
    activeCanvasId: state.activeCanvasId,
    liveHostName: state.hostName,
    liveGuestName: state.guestName,
  }));

  // Determine master element and inherited properties
  let displayPlayerId = element.playerId || 'P1'; // Default to P1 if not specified
  let displayScale = element.scale || 1;
  let displayIsPivotLocked = element.isPivotLocked || false;
  let displayPivotInternalOffset = element.pivotInternalOffset || 0;
  let displayFontFamily = element.fontFamily || 'Arial, sans-serif';
  let displayTextColor = element.textColor || 'white';
  let displayBackgroundColor = element.backgroundColor || 'transparent';
  let displayBorderColor = element.borderColor || 'transparent';

  if (element.isPairMaster === false && element.pairId) {
    const activeCanvas = currentCanvases.find(c => c.id === activeCanvasId);
    const masterElement = activeCanvas?.layout.find(el => el.pairId === element.pairId && el.isPairMaster === true);
    if (masterElement) {
      displayScale = masterElement.scale || displayScale;
      displayIsPivotLocked = masterElement.isPivotLocked || displayIsPivotLocked;
      displayPivotInternalOffset = masterElement.pivotInternalOffset || displayPivotInternalOffset;
      displayFontFamily = masterElement.fontFamily || displayFontFamily;
      displayTextColor = masterElement.textColor || displayTextColor;
      displayBackgroundColor = masterElement.backgroundColor || displayBackgroundColor;
      displayBorderColor = masterElement.borderColor || displayBorderColor;
      // displayPlayerId remains the slave's own playerId
    }
  }

  const layoutWidth = element.size?.width || 200; // Default width
  const layoutHeight = element.size?.height || 40;  // Default height

  // Dynamic font size calculation
  const REFERENCE_PIXEL_HEIGHT_FOR_FONT = 40; // Should match default height if that's the baseline
  const BASELINE_FONT_SIZE_PX = 18; // Adjust as needed
  const dynamicFontSize = Math.max(8, (layoutHeight / REFERENCE_PIXEL_HEIGHT_FOR_FONT) * BASELINE_FONT_SIZE_PX);

  let nameToDisplay = '';
  if (displayPlayerId === 'P1') {
    nameToDisplay = liveHostName || 'Host';
  } else if (displayPlayerId === 'P2') {
    nameToDisplay = liveGuestName || 'Guest';
  } else {
    nameToDisplay = 'Nickname'; // Fallback for unexpected playerId
  }

  // Root transform for pivot offset
  let rootTransform = '';
  if (displayIsPivotLocked && displayPivotInternalOffset && displayPlayerId) {
    if (displayPlayerId === 'P1') {
      rootTransform = `translateX(-${displayPivotInternalOffset}px)`;
    } else if (displayPlayerId === 'P2') {
      rootTransform = `translateX(${displayPivotInternalOffset}px)`;
    }
  }

  const baseElementStyle: React.CSSProperties = {
    width: `${layoutWidth * displayScale}px`,
    height: `${layoutHeight * displayScale}px`,
    overflow: 'hidden',
    transform: rootTransform || undefined,
    transition: 'transform 0.2s ease-out',
    // position: 'absolute', // This should be handled by the Draggable/ResizableBox wrapper
  };

  const scalerElementStyle: React.CSSProperties = {
    width: `${layoutWidth}px`,
    height: `${layoutHeight}px`,
    position: 'relative', // Needed for correct transform-origin behavior with translate
    transformOrigin: displayIsPivotLocked ? 'center center' : 'top left',
    transform: displayIsPivotLocked
      ? `translate(-50%, -50%) scale(${displayScale})`
      : `scale(${displayScale})`,
    left: displayIsPivotLocked ? '50%' : '0%',
    top: displayIsPivotLocked ? '50%' : '0%',
    // Styles for content within the scaler - this becomes the main display area
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: displayFontFamily,
    fontSize: `${dynamicFontSize}px`,
    color: displayTextColor,
    backgroundColor: displayBackgroundColor,
    border: `1px solid ${displayBorderColor === 'transparent' ? 'transparent' : displayBorderColor || 'transparent'}`,
    boxSizing: 'border-box', // Important for border not to add to size
    padding: '0 5px', // Basic padding, can be adjusted or made dynamic
    textAlign: 'center', // Ensure text is centered if it wraps
  };

  return (
    <div style={baseElementStyle} className={styles.baseElement}>
      <div style={scalerElementStyle} className={styles.scalerElement}>
        {/* The content (single nickname) is directly centered by flex properties on scalerElementStyle */}
        <span className={styles.nicknameText}>{nameToDisplay}</span>
        {/*
          isSelected, isBroadcast props are not used for rendering here.
          Pivot line is removed.
          Hidden names message is removed as each part is expected to show its name or a default.
        */}
      </div>
    </div>
  );
};

export default NicknamesOnlyElement;
