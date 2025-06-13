import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';

interface NicknamesOnlyElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
}

const NicknamesOnlyElement: React.FC<NicknamesOnlyElementProps> = ({ element, isBroadcast }) => {
  const {
    fontFamily,
    backgroundColor,
    borderColor,
    textColor,
    isPivotLocked,
    pivotInternalOffset,
    size
  } = element;

  const REFERENCE_PIXEL_HEIGHT_FOR_FONT = 40;
  const BASELINE_FONT_SIZE_PX = 18;

  const dynamicFontSize = Math.max(8, (size.height / REFERENCE_PIXEL_HEIGHT_FOR_FONT) * BASELINE_FONT_SIZE_PX);

  const currentFontFamily = fontFamily || 'Arial, sans-serif';
  const currentBackgroundColor = backgroundColor || 'transparent';
  const currentBorderColor = borderColor || 'transparent';
  const currentPivotOffset = pivotInternalOffset || 0;

  const liveHostName = useDraftStore((state) => state.hostName);
  const liveGuestName = useDraftStore((state) => state.guestName);

  const nameSpanStyle: React.CSSProperties = {
    display: 'inline-block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%', // Text itself can be as wide as its container
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  };

  const hostNameDisplay = <span style={nameSpanStyle}>{liveHostName || 'Host'}</span>;
  const guestNameDisplay = <span style={nameSpanStyle}>{liveGuestName || 'Guest'}</span>;

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

  const baseDivStyle: React.CSSProperties = {
    border: `1px solid ${currentBorderColor}`,
    padding: '10px',
    borderRadius: '5px',
    backgroundColor: currentBackgroundColor,
    color: textColor || 'white',
    fontFamily: currentFontFamily,
    fontSize: `${dynamicFontSize}px`,
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: `1fr ${currentPivotOffset}px 1fr`, // Use 1fr for name areas
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  };

  // Styles for the content within grid cells
  const nameContainerStyle: React.CSSProperties = {
    display: 'flex', // Keep flex for vertical centering via alignItems
    alignItems: 'center', // Vertically center content
    overflow: 'hidden',
    position: 'relative', // For absolute positioning of the name span
    // text-align will be managed by child or specific centering logic in next step
  };

  const hostNameContainerStyle: React.CSSProperties = {
    ...nameContainerStyle,
    // justifyContent: 'flex-end', // Removed, centering handled by child span
  };

  const guestNameContainerStyle: React.CSSProperties = {
    ...nameContainerStyle,
    // justifyContent: 'flex-start', // Removed, centering handled by child span
  };

  const namesPresent = (liveHostName && liveHostName.trim() !== "") || (liveGuestName && liveGuestName.trim() !== "");

  console.log('NicknamesOnlyElement rendering with:');
  console.log('liveHostName:', liveHostName);
  console.log('liveGuestName:', liveGuestName);
  console.log('element.fontFamily:', element.fontFamily);
  console.log('element.backgroundColor:', element.backgroundColor);
  console.log('element.borderColor:', element.borderColor);
  console.log('element.textColor:', element.textColor);
  console.log('isBroadcast:', isBroadcast);

  return (
    <div style={baseDivStyle}>
      {/* Host Name Cell */}
      <div style={hostNameContainerStyle}>
        {hostNameDisplay}
      </div>

      {/* Middle Spacer Cell (explicitly sized by currentPivotOffset) */}
      <div></div>

      {/* Guest Name Cell */}
      <div style={guestNameContainerStyle}>
        {guestNameDisplay}
      </div>

      {isPivotLocked && <div style={pivotLineStyle}></div>}

      {!namesPresent && !isBroadcast && (
          <span style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.8em', opacity: 0.7}}>(Names Hidden)</span>
      )}
    </div>
  );
};

export default NicknamesOnlyElement;
