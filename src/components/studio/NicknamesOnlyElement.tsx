import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';

interface NicknamesOnlyElementProps {
  element: StudioElement;
  isSelected?: boolean;
  isBroadcast?: boolean; // Keep for prop consistency, though not actively used for major logic here
}

const NicknamesOnlyElement: React.FC<NicknamesOnlyElementProps> = ({ element, isSelected, isBroadcast }) => {
  const {
    fontFamily,
    textColor,
    isPivotLocked,
    pivotInternalOffset,
    size,
    // Destructure other props like backgroundColor, borderColor if they are to be used on baseDivStyle directly
    // For now, focusing on text visibility and centering.
  } = element;

  const liveHostName = useDraftStore((state) => state.hostName);
  const liveGuestName = useDraftStore((state) => state.guestName); // Corrected: useDraftStore

  // Default values
  const currentFontFamily = fontFamily || 'Arial, sans-serif';
  const currentTextColor = textColor || 'white';
  const currentPivotOffset = pivotInternalOffset || 0;
  const currentBackgroundColor = element.backgroundColor || 'transparent'; // Example if used
  const currentBorderColor = element.borderColor || 'transparent';     // Example if used

  // Dynamic font size calculation
  const REFERENCE_PIXEL_HEIGHT_FOR_FONT = 40; // Adjust if base design assumes different ref
  const BASELINE_FONT_SIZE_PX = 18;         // Adjust if base design assumes different ref
  const dynamicFontSize = Math.max(8, (size.height / REFERENCE_PIXEL_HEIGHT_FOR_FONT) * BASELINE_FONT_SIZE_PX);

  // Logging for diagnostics
  // console.log('NicknamesOnlyElement Render:', {
  //   liveHostName,
  //   liveGuestName,
  //   fontFamily: currentFontFamily,
  //   textColor: currentTextColor,
  //   isPivotLocked,
  //   pivotInternalOffset: currentPivotOffset,
  //   'size.width': size.width,
  //   'size.height': size.height,
  //   dynamicFontSize,
  //   isSelected,
  //   backgroundColor: currentBackgroundColor,
  //   borderColor: currentBorderColor,
  // });

  const baseDivStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    fontFamily: currentFontFamily,
    fontSize: `${dynamicFontSize}px`,
    color: currentTextColor,
    backgroundColor: currentBackgroundColor, // Apply if needed
    border: `1px solid ${currentBorderColor}`,   // Apply if needed, ensure transparent by default
    display: 'grid',
    gridTemplateColumns: (isPivotLocked && currentPivotOffset > 0) ? `1fr ${currentPivotOffset}px 1fr` : '1fr 1fr',
    columnGap: (!isPivotLocked && currentPivotOffset > 0) ? `${currentPivotOffset}px` : '0px',
    alignItems: 'stretch', // Make cells take full height
    justifyItems: 'stretch', // Make cells take full width
    overflow: 'hidden',
    position: 'relative', // For the pivot line
  };

  const cellStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%', // Should be redundant due to justifyItems: 'stretch' on parent
    height: '100%', // Should be redundant due to alignItems: 'stretch' on parent
    overflow: 'hidden',
    padding: '0 2px', // Minimal horizontal padding within cell
    boxSizing: 'border-box',
  };

  const nameTextStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'inline-block', // Important for ellipsis to work correctly with width/maxWidth
    maxWidth: '100%',      // Ensure text does not overflow its flex container
    // No absolute positioning needed if flex centering works well
  };

  const pivotLineStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '10%',
    bottom: '10%',
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: 'translateX(-50%)',
    zIndex: 1,
  };

  // Conditional rendering for "(Names Hidden)" if names are blank and not in broadcast mode
  const namesActuallyPresent = (liveHostName && liveHostName.trim() !== "") || (liveGuestName && liveGuestName.trim() !== "");
  const showHiddenPlaceholder = !namesActuallyPresent && !isBroadcast;


  return (
    <div style={baseDivStyle}>
      <div style={cellStyle}>
        <span style={nameTextStyle}>{liveHostName || 'Host'}</span>
      </div>

      {isPivotLocked && currentPivotOffset > 0 && <div></div>} {/* Spacer Cell */}

      <div style={cellStyle}>
        <span style={nameTextStyle}>{liveGuestName || 'Guest'}</span>
      </div>

      {isPivotLocked && isSelected && <div style={pivotLineStyle}></div>}

      {showHiddenPlaceholder && (
          <span style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '0.8em', // Smaller than main text
              opacity: 0.7,
              color: currentTextColor // Ensure it respects textColor setting
            }}
          >
            (Names Hidden)
          </span>
      )}
    </div>
  );
};

export default NicknamesOnlyElement;
