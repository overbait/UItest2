import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
// import styles from './ColorGlowElement.module.css'; // If you create a CSS module

interface ColorGlowElementProps {
  element: StudioElement;
  isSelected?: boolean; // Kept for interface consistency
  isBroadcast?: boolean; // Kept for interface consistency
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

// getGlowInstanceStyle is now defined inside the component or passed glowDimension
// For simplicity, moving its definition inside or making glowDimension available in its scope.
// Let's define it here, modified to accept dimension.

const ColorGlowElement: React.FC<ColorGlowElementProps> = ({ element }) => {
  const {
    currentCanvases,
    activeCanvasId,
    hostColor,
    guestColor
  } = useDraftStore(state => ({
    currentCanvases: state.currentCanvases,
    activeCanvasId: state.activeCanvasId,
    hostColor: state.hostColor,
    guestColor: state.guestColor,
  }));

  // Determine master element and inherited properties
  let displayPlayerId = element.playerId || 'P1';
  let displayScale = element.scale || 1;
  let displayIsPivotLocked = element.isPivotLocked || false;
  let displayPivotInternalOffset = element.pivotInternalOffset || 0;
  let displayBackgroundColor = element.backgroundColor || 'transparent';
  let displayBorderColor = element.borderColor || 'transparent';

  if (element.isPairMaster === false && element.pairId) {
    const activeCanvas = currentCanvases.find(c => c.id === activeCanvasId);
    const masterElement = activeCanvas?.layout.find(el => el.pairId === element.pairId && el.isPairMaster === true);
    if (masterElement) {
      displayScale = masterElement.scale || displayScale;
      displayIsPivotLocked = masterElement.isPivotLocked || displayIsPivotLocked;
      displayPivotInternalOffset = masterElement.pivotInternalOffset || displayPivotInternalOffset;
      displayBackgroundColor = masterElement.backgroundColor || displayBackgroundColor;
      displayBorderColor = masterElement.borderColor || displayBorderColor;
    }
  }

  const layoutWidth = element.size?.width || 125; // Default width from addStudioElement
  const layoutHeight = element.size?.height || 150; // Default height from addStudioElement

  // Calculate finalGlowDimension
  const BORDER_WIDTH_PX = displayBorderColor === 'transparent' || displayBorderColor === '' ? 0 : 1;
  const scalerContentWidth = layoutWidth - (2 * BORDER_WIDTH_PX);
  const scalerContentHeight = layoutHeight - (2 * BORDER_WIDTH_PX);
  const finalGlowDimension = Math.max(0, Math.min(scalerContentWidth, scalerContentHeight));

  const getGlowInstanceStyle = (
    rgbColor: { r: number; g: number; b: number } | null,
    dimension: number
  ): React.CSSProperties => {
    if (!rgbColor || dimension <= 0) {
      return { display: 'none' };
    }
    return {
      width: `${dimension}px`,
      height: `${dimension}px`,
      background: `radial-gradient(circle, rgba(${rgbColor.r},${rgbColor.g},${rgbColor.b},0.4) 0%, rgba(${rgbColor.r},${rgbColor.g},${rgbColor.b},0.0) 70%)`,
    };
  };

  let colorToUse: string | null = null;
  if (displayPlayerId === 'P1') {
    colorToUse = hostColor;
  } else if (displayPlayerId === 'P2') {
    colorToUse = guestColor;
  }
  const rgb = hexToRgb(colorToUse);

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
    overflow: 'hidden', // Ensures glow doesn't spill if element is smaller than glow radius
    transform: rootTransform || undefined,
    transition: 'transform 0.2s ease-out',
    // No specific class from CSS module for base needed unless new styles are added
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
  };

  return (
    <div style={baseElementStyle}> {/* Removed styles.baseElement if not defined */}
      <div style={scalerElementStyle}> {/* Removed styles.scalerElement if not defined */}
        {rgb && <div style={getGlowInstanceStyle(rgb, finalGlowDimension)}></div>}
        {/* Pivot line and any other elements removed */}
      </div>
    </div>
  );
};

export default ColorGlowElement;
