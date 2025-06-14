import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';

interface ColorGlowElementProps {
  element: StudioElement;
  isSelected?: boolean;
  isBroadcast?: boolean;
}

// Helper function to convert HEX to RGB
const hexToRgb = (hex: string | null | undefined): { r: number; g: number; b: number } | null => {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const ColorGlowElement: React.FC<ColorGlowElementProps> = ({ element, isSelected }) => {
  const {
    isPivotLocked,
    pivotInternalOffset,
    // size, // Not directly used for gradient calculation, but for overall element dimensions
    // scale, // Applied by wrapper
    // backgroundColor, // Could be used for the base div if not transparent
    // borderColor, // Could be used for the base div
  } = element;

  const hostColor = useDraftStore((state) => state.hostColor);
  const guestColor = useDraftStore((state) => state.guestColor);

  const currentPivotOffset = pivotInternalOffset || 0;
  const currentBorderColor = element.borderColor || 'transparent'; // Use if element needs its own border

  const hostRgb = hexToRgb(hostColor);
  const guestRgb = hexToRgb(guestColor);

  const getGlowInstanceStyle = (rgb: { r: number; g: number; b: number } | null): React.CSSProperties => {
    if (!rgb) {
      return { display: 'none' }; // Hide if no color
    }
    return {
      height: '100%', // Glow circle diameter will be based on element's height
      width: 'auto',   // Width will be derived from height to maintain aspect ratio
      aspectRatio: '1/1',
      background: `radial-gradient(circle, rgba(${rgb.r},${rgb.g},${rgb.b},0.4) 0%, rgba(${rgb.r},${rgb.g},${rgb.b},0.0) 70%)`,
      maxWidth: '100%',
    };
  };

  const baseDivStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${currentBorderColor}`, // Optional: if element itself should have a border
    display: 'grid',
    gridTemplateColumns: (isPivotLocked && currentPivotOffset > 0) ? `1fr ${currentPivotOffset}px 1fr` : '1fr 1fr',
    columnGap: (!isPivotLocked && currentPivotOffset > 0) ? `${currentPivotOffset}px` : '0px',
    alignItems: 'stretch',
    justifyItems: 'stretch',
    overflow: 'hidden', // Important for gradient edges if element is small
    position: 'relative',
    backgroundColor: element.backgroundColor || 'transparent', // Element background
  };

  const cellStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex', // To center the glow div if it's smaller or has fixed aspect ratio
    alignItems: 'center',
    justifyContent: 'center',
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

  return (
    <div style={baseDivStyle}>
      <div style={cellStyle}> {/* Host Glow Cell */}
        <div style={getGlowInstanceStyle(hostRgb)}></div>
      </div>

      {isPivotLocked && currentPivotOffset > 0 && <div></div>} {/* Spacer Cell */}

      <div style={cellStyle}> {/* Guest Glow Cell */}
        <div style={getGlowInstanceStyle(guestRgb)}></div>
      </div>

      {isPivotLocked && isSelected && <div style={pivotLineStyle}></div>}
    </div>
  );
};

export default ColorGlowElement;
