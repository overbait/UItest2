import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
import styles from './CountryFlagsElement.module.css';

interface CountryFlagsElementProps {
  element: StudioElement;
  isSelected?: boolean; // Kept for interface consistency
  isBroadcast?: boolean; // Kept for interface consistency
}

const CountryFlagsElement: React.FC<CountryFlagsElementProps> = ({ element }) => {
  const {
    currentCanvases,
    activeCanvasId,
    liveHostFlag,
    liveGuestFlag
  } = useDraftStore(state => ({
    currentCanvases: state.currentCanvases,
    activeCanvasId: state.activeCanvasId,
    liveHostFlag: state.hostFlag,
    liveGuestFlag: state.guestFlag,
  }));

  // Determine master element and inherited properties
  let displayPlayerId = element.playerId || 'P1';
  let displayScale = element.scale || 1;
  let displayIsPivotLocked = element.isPivotLocked || false;
  let displayPivotInternalOffset = element.pivotInternalOffset || 0;
  let displayBackgroundColor = element.backgroundColor || 'transparent';
  let displayBorderColor = element.borderColor || 'transparent';
  // fontFamily and textColor are less relevant but can be inherited if needed for consistency
  // let displayFontFamily = element.fontFamily || 'Arial, sans-serif';
  // let displayTextColor = element.textColor || 'white';


  if (element.isPairMaster === false && element.pairId) {
    const activeCanvas = currentCanvases.find(c => c.id === activeCanvasId);
    const masterElement = activeCanvas?.layout.find(el => el.pairId === element.pairId && el.isPairMaster === true);
    if (masterElement) {
      displayScale = masterElement.scale || displayScale;
      displayIsPivotLocked = masterElement.isPivotLocked || displayIsPivotLocked;
      displayPivotInternalOffset = masterElement.pivotInternalOffset || displayPivotInternalOffset;
      displayBackgroundColor = masterElement.backgroundColor || displayBackgroundColor;
      displayBorderColor = masterElement.borderColor || displayBorderColor;
      // displayFontFamily = masterElement.fontFamily || displayFontFamily;
      // displayTextColor = masterElement.textColor || displayTextColor;
    }
  }

  const layoutWidth = element.size?.width || 60; // Default width from addStudioElement
  const layoutHeight = element.size?.height || 40; // Default height from addStudioElement

  interface FlagInfo { path: string | null; alt: string; }
  let flagInfo: FlagInfo = { path: null, alt: '' };

  if (displayPlayerId === 'P1') {
    flagInfo = {
      path: liveHostFlag ? `/assets/countryflags/${liveHostFlag.toLowerCase()}.png` : null,
      alt: liveHostFlag || 'Host Flag',
    };
  } else if (displayPlayerId === 'P2') {
    flagInfo = {
      path: liveGuestFlag ? `/assets/countryflags/${liveGuestFlag.toLowerCase()}.png` : null,
      alt: liveGuestFlag || 'Guest Flag',
    };
  }

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
    transform: rootTransform || undefined,
    transition: 'transform 0.2s ease-out',
  };

  const scalerElementStyle: React.CSSProperties = {
    width: `${layoutWidth}px`,
    height: `${layoutHeight}px`,
    position: 'relative',
    transformOrigin: displayIsPivotLocked ? 'center center' : 'top left',
    transform: displayIsPivotLocked
      ? `translate(-50%, -50%) scale(${displayScale})`
      : `scale(${displayScale})`,
    left: displayIsPivotLocked ? '50%' : '0%',
    top: displayIsPivotLocked ? '50%' : '0%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: displayBackgroundColor,
    border: `1px solid ${displayBorderColor === 'transparent' ? 'transparent' : displayBorderColor || 'transparent'}`,
    boxSizing: 'border-box',
    overflow: 'visible', // Aggressively prevent content clipping
  };

  const flagImageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain', // Changed from 'cover' to 'contain' to ensure full flag visibility
    display: 'block', // Ensures img behaves like a block element for layout
    pointerEvents: 'none', // Prevents dragging image
    userSelect: 'none', // Prevents selecting image text
  };

  return (
    <div style={baseElementStyle} className={styles.baseElement}>
      <div style={scalerElementStyle} className={styles.scalerElement}>
        {flagInfo.path ? (
          <img
            src={flagInfo.path}
            alt={flagInfo.alt}
            style={flagImageStyle}
            draggable="false"
            onError={(e) => (e.currentTarget.style.display = 'none')} // Hide if image fails to load
          />
        ) : (
          // Placeholder if no flag is set, to maintain layout and background/border
          <div style={{ width: '100%', height: '100%' }} />
        )}
        {/* Pivot line and hidden messages removed */}
      </div>
    </div>
  );
};

export default CountryFlagsElement;
