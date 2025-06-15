import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
import styles from './CountryFlagsElement.module.css';

interface CountryFlagsElementProps {
  element: StudioElement;
  isSelected?: boolean;
  isBroadcast?: boolean;
}

const CountryFlagsElement: React.FC<CountryFlagsElementProps> = ({ element, isSelected, isBroadcast }) => {
  const {
    size,
    fontFamily = 'Arial, sans-serif', // Kept for potential use if text was ever added
    textColor = 'white',             // Kept for potential use if text was ever added
    backgroundColor = 'transparent', // For grid background
    borderColor = 'transparent',     // For grid border
    isPivotLocked = false,
    pivotInternalOffset = 0,
    scale = 1,
  } = element;

  const liveHostFlag = useDraftStore((state) => state.hostFlag);
  const liveGuestFlag = useDraftStore((state) => state.guestFlag);

  const flagBaseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
    pointerEvents: 'none',
    userSelect: 'none',
  };

  const hostFlagPath = liveHostFlag ? `/assets/countryflags/${liveHostFlag.toLowerCase()}.png` : null;
  const guestFlagPath = liveGuestFlag ? `/assets/countryflags/${liveGuestFlag.toLowerCase()}.png` : null;

  const hostFlagDisplay = hostFlagPath ? <img src={hostFlagPath} alt={liveHostFlag || 'Host Flag'} style={flagBaseStyle} draggable="false" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <div style={{width: '100%', height: '100%'}} />;
  const guestFlagDisplay = guestFlagPath ? <img src={guestFlagPath} alt={liveGuestFlag || 'Guest Flag'} style={flagBaseStyle} draggable="false" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <div style={{width: '100%', height: '100%'}} />;

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

  const layoutWidth = size?.width || 150; // Default width
  const layoutHeight = size?.height || 50; // Default height

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

  const hostFlagContainerDynamicStyle: React.CSSProperties = {
    transform: (isPivotLocked && pivotInternalOffset) ? `translateX(-${pivotInternalOffset}px)` : 'none',
    transition: 'transform 0.2s ease-out',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const guestFlagContainerDynamicStyle: React.CSSProperties = {
    transform: (isPivotLocked && pivotInternalOffset) ? `translateX(${pivotInternalOffset}px)` : 'none',
    transition: 'transform 0.2s ease-out',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div className={styles.baseElement} style={{
      width: `${layoutWidth * scale}px`,
      height: `${layoutHeight * scale}px`,
      overflow: 'hidden',
      // fontFamily: fontFamily, // Not strictly needed on base if grid has it
    }}>
      <div className={styles.scalerElement} style={scalerElementStyle}>
        <div className={styles.flagsGrid} style={{
          backgroundColor: backgroundColor,
          border: `1px solid ${borderColor}`,
        }}>
          <div className={styles.flagContainer} style={hostFlagContainerDynamicStyle}>
            {hostFlagDisplay}
          </div>
          <div className={styles.flagContainer} style={guestFlagContainerDynamicStyle}>
            {guestFlagDisplay}
          </div>
          {isPivotLocked && isSelected && (
            <div style={pivotLineStyle}></div>
          )}
          {/* Placeholder for hidden message if flags are not set - adapt if needed
          {!liveHostFlag && !liveGuestFlag && !isBroadcast && (
            <span className={styles.hiddenNamesMessage} style={{ color: textColor }}>(Flags Hidden)</span>
          )}
          */}
        </div>
      </div>
    </div>
  );
};

export default CountryFlagsElement;
