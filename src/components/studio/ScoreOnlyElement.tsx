import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';
import styles from './ScoreOnlyElement.module.css'; // Import styles

interface ScoreOnlyElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
  isSelected?: boolean;
}

const ScoreOnlyElement: React.FC<ScoreOnlyElementProps> = ({ element, isBroadcast, isSelected }) => {
  const {
    size,
    fontFamily = 'Arial, sans-serif', // Default added
    backgroundColor = 'transparent', // Default added
    borderColor = 'transparent', // Default added
    textColor = 'white', // Default added
    isPivotLocked = false, // Default added
    pivotInternalOffset = 0, // Default added
    scale = 1, // Default added
  } = element;

  const REFERENCE_PIXEL_HEIGHT_FOR_FONT = 40;
  const BASELINE_FONT_SIZE_PX = 18;

  // Ensure size height is valid for calculation, provide a fallback if not.
  const currentSizeHeight = size?.height || REFERENCE_PIXEL_HEIGHT_FOR_FONT;
  const dynamicFontSize = Math.max(8, (currentSizeHeight / REFERENCE_PIXEL_HEIGHT_FOR_FONT) * BASELINE_FONT_SIZE_PX);

  const liveScores = useDraftStore((state) => state.scores);

  // scoreSpanStyle will be replaced by .scoreText class
  const hostScoreDisplay = <span className={styles.scoreText}>{liveScores.host}</span>;
  const guestScoreDisplay = <span className={styles.scoreText}>{liveScores.guest}</span>;

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

  const layoutWidth = size?.width || 100;
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

  const hostScoreContainerDynamicStyle: React.CSSProperties = {
    transform: (isPivotLocked && pivotInternalOffset) ? `translateX(-${pivotInternalOffset}px)` : 'none',
    transition: 'transform 0.2s ease-out',
  };
  const guestScoreContainerDynamicStyle: React.CSSProperties = {
    transform: (isPivotLocked && pivotInternalOffset) ? `translateX(${pivotInternalOffset}px)` : 'none',
    transition: 'transform 0.2s ease-out',
  };

  const scoresPresent = liveScores.host !== undefined || liveScores.guest !== undefined;

  return (
    <div className={styles.baseElement} style={{
      width: `${layoutWidth * scale}px`,
      height: `${layoutHeight * scale}px`,
      overflow: 'hidden',
    }}>
      <div className={styles.scalerElement} style={scalerElementStyle}>
        <div className={styles.scoresGrid} style={{
          fontFamily: fontFamily,
          fontSize: `${dynamicFontSize}px`,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          color: textColor,
          // CSS module handles other fixed styles like padding, border-radius, grid setup
        }}>
          {/* Host Score Cell */}
          {liveScores.host !== undefined ? (
            <div className={`${styles.scoreContainer} ${styles.hostScoreContainer}`} style={hostScoreContainerDynamicStyle}>
              {hostScoreDisplay}
            </div>
          ) : ( <div /> )} {/* Empty div to maintain grid structure */}

          {/* Guest Score Cell */}
          {liveScores.guest !== undefined ? (
            <div className={`${styles.scoreContainer} ${styles.guestScoreContainer}`} style={guestScoreContainerDynamicStyle}>
              {guestScoreDisplay}
            </div>
          ) : ( <div /> )} {/* Empty div to maintain grid structure */}

          {isPivotLocked && isSelected && <div style={pivotLineStyle}></div>}

          {!scoresPresent && !isBroadcast && (
              <span className={styles.hiddenScoresMessage}>(Scores Hidden)</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScoreOnlyElement;
