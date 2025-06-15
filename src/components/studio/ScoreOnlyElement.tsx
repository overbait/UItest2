import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
import styles from './ScoreOnlyElement.module.css'; // Import styles

interface ScoreOnlyElementProps {
  element: StudioElement;
  // isBroadcast and isSelected are not directly used in the new structure but kept for interface consistency if needed elsewhere
  isBroadcast?: boolean;
  isSelected?: boolean;
}

const ScoreOnlyElement: React.FC<ScoreOnlyElementProps> = ({ element }) => {
  const { currentCanvases, activeCanvasId, scores: liveScores } = useDraftStore(state => ({
    currentCanvases: state.currentCanvases,
    activeCanvasId: state.activeCanvasId,
    scores: state.scores,
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

  const layoutWidth = element.size?.width || 100;
  const layoutHeight = element.size?.height || 40;

  const REFERENCE_PIXEL_HEIGHT_FOR_FONT = 40; // Should match default height if that's the baseline
  const BASELINE_FONT_SIZE_PX = 18; // Adjust as needed
  const dynamicFontSize = Math.max(8, (layoutHeight / REFERENCE_PIXEL_HEIGHT_FOR_FONT) * BASELINE_FONT_SIZE_PX);

  let scoreToDisplay: number | string = '';
  if (displayPlayerId === 'P1') {
    scoreToDisplay = liveScores.host !== undefined ? liveScores.host : '';
  } else if (displayPlayerId === 'P2') {
    scoreToDisplay = liveScores.guest !== undefined ? liveScores.guest : '';
  } else {
    // Fallback or error display if playerId is unexpected
    scoreToDisplay = '?';
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
    width: '100%', // Changed
    height: '100%', // Changed
    overflow: 'visible', // Added
    transform: rootTransform || undefined,
    transition: 'transform 0.2s ease-out',
  };

  const scalerElementStyle: React.CSSProperties = {
    width: '100%', // Changed
    height: '100%', // Changed
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
    border: `1px solid ${displayBorderColor === 'transparent' ? 'transparent' : displayBorderColor || 'transparent'}`, // Ensure transparent is explicitly transparent
    boxSizing: 'border-box', // Important for border not to add to size
    overflow: 'visible', // Aggressively prevent content clipping
  };

  return (
    <div style={baseElementStyle} className={styles.baseElement}>
      <div style={scalerElementStyle} className={styles.scalerElement}>
        {/* The content (single score) is directly centered by flex properties on scalerElementStyle */}
        <span className={styles.scoreText}>{scoreToDisplay}</span>
        {/*
          isSelected and isBroadcast props are not used for rendering here.
          Pivot line is removed.
          Hidden scores message is removed as each part is expected to show its score or be empty.
        */}
      </div>
    </div>
  );
};

export default ScoreOnlyElement;
