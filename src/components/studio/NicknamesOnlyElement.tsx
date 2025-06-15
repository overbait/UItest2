import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
import styles from './NicknamesOnlyElement.module.css'; // Import styles

interface NicknamesOnlyElementProps {
  element: StudioElement;
  isSelected?: boolean;
  isBroadcast?: boolean; // Keep for prop consistency, though not actively used for major logic here
}

const NicknamesOnlyElement: React.FC<NicknamesOnlyElementProps> = ({ element, isSelected, isBroadcast }) => {
  const {
    size,
    fontFamily = 'Arial, sans-serif',
    textColor = 'white',
    backgroundColor = 'transparent',
    borderColor = 'transparent',
    isPivotLocked = false,
    pivotInternalOffset = 0,
    scale = 1,
  } = element;

  const liveHostName = useDraftStore((state) => state.hostName);
  const liveGuestName = useDraftStore((state) => state.guestName);

  // Dynamic font size calculation
  const REFERENCE_PIXEL_HEIGHT_FOR_FONT = 40;
  const BASELINE_FONT_SIZE_PX = 18;
  const currentSizeHeight = size?.height || REFERENCE_PIXEL_HEIGHT_FOR_FONT; // Fallback for size.height
  const dynamicFontSize = Math.max(8, (currentSizeHeight / REFERENCE_PIXEL_HEIGHT_FOR_FONT) * BASELINE_FONT_SIZE_PX);

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
  //   backgroundColor: backgroundColor, // Use destructured prop
  //   borderColor: borderColor,       // Use destructured prop
  // });

  const layoutWidth = size?.width || 200;
  const layoutHeight = size?.height || 40;

  const scalerElementStyle: React.CSSProperties = {
    width: `${layoutWidth}px`,
    height: `${layoutHeight}px`,
    position: 'relative',
  };

  if (isPivotLocked) {
    scalerElementStyle.left = '50%';
    scalerElementStyle.top = '50%';
    scalerElementStyle.transform = `translate(-50%, -50%) scale(${scale})`;
    scalerElementStyle.transformOrigin = 'center center';
  } else {
    scalerElementStyle.left = '0%';
    scalerElementStyle.top = '0%';
    scalerElementStyle.transform = `scale(${scale})`;
    scalerElementStyle.transformOrigin = 'top left';
  }

  const hostNicknameCellDynamicStyle: React.CSSProperties = {
    transform: (isPivotLocked && pivotInternalOffset) ? `translateX(-${pivotInternalOffset}px)` : 'none',
    transition: 'transform 0.2s ease-out',
  };
  const guestNicknameCellDynamicStyle: React.CSSProperties = {
    transform: (isPivotLocked && pivotInternalOffset) ? `translateX(${pivotInternalOffset}px)` : 'none',
    transition: 'transform 0.2s ease-out',
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
  const showHiddenPlaceholder = !namesActuallyPresent && !isBroadcast; // isBroadcast is from props

  return (
    <div className={styles.baseElement} style={{
      width: `${layoutWidth * scale}px`,
      height: `${layoutHeight * scale}px`,
      overflow: 'hidden',
    }}>
      <div className={styles.scalerElement} style={scalerElementStyle}>
        <div className={styles.nicknamesGrid} style={{
          fontFamily: fontFamily,
          fontSize: `${dynamicFontSize}px`,
          color: textColor,
          backgroundColor: backgroundColor,
          border: `1px solid ${borderColor}`,
        }}>
          <div className={styles.nicknameCell} style={hostNicknameCellDynamicStyle}>
            <span className={styles.nicknameText}>{liveHostName || 'Host'}</span>
          </div>

          <div className={styles.nicknameCell} style={guestNicknameCellDynamicStyle}>
            <span className={styles.nicknameText}>{liveGuestName || 'Guest'}</span>
          </div>

          {isPivotLocked && isSelected && <div style={pivotLineStyle}></div>}

          {showHiddenPlaceholder && (
            <span className={styles.hiddenNamesMessage} style={{ color: textColor }}>
              (Names Hidden)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default NicknamesOnlyElement;
