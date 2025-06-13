import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';

interface ScoreOnlyElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
}

const ScoreOnlyElement: React.FC<ScoreOnlyElementProps> = ({ element, isBroadcast }) => {
  const {
    fontFamily,
    backgroundColor,
    borderColor,
    textColor,
    isPivotLocked,
    pivotInternalOffset,
    size
  } = element;

  const REFERENCE_PIXEL_HEIGHT_FOR_FONT = 40; // Reference height in pixels
  const BASELINE_FONT_SIZE_PX = 18;          // Font size for that reference height

  const dynamicFontSize = Math.max(8, (size.height / REFERENCE_PIXEL_HEIGHT_FOR_FONT) * BASELINE_FONT_SIZE_PX);

  const currentFontFamily = fontFamily || 'Arial, sans-serif'; // Changed default
  const currentBackgroundColor = backgroundColor || 'transparent';
  const currentBorderColor = borderColor || 'transparent';
  const currentPivotOffset = pivotInternalOffset || 0;

  const liveScores = useDraftStore((state) => state.scores);

  const scoreSpanStyle: React.CSSProperties = {
    display: 'inline-block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    fontWeight: 'bold',
  };

  const hostScoreDisplay = <span style={scoreSpanStyle}>{liveScores.host}</span>;
  const guestScoreDisplay = <span style={scoreSpanStyle}>{liveScores.guest}</span>;

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
    gridTemplateColumns: `1fr ${currentPivotOffset}px 1fr`, // Use 1fr for score areas
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  };

  const scoreContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  };

  const hostScoreContainerStyle: React.CSSProperties = {
    ...scoreContainerStyle,
    justifyContent: 'flex-end', // Align score to the right
  };

  const guestScoreContainerStyle: React.CSSProperties = {
    ...scoreContainerStyle,
    justifyContent: 'flex-start', // Align score to the left
  };

  const scoresPresent = liveScores.host !== undefined || liveScores.guest !== undefined;

  return (
    <div style={baseDivStyle}>
      {/* Host Score Cell */}
      {liveScores.host !== undefined ? (
        <div style={hostScoreContainerStyle}>
          {hostScoreDisplay}
        </div>
      ) : ( <div></div> )}

      {/* Middle Spacer Cell (explicitly sized by currentPivotOffset) */}
      <div></div>

      {/* Guest Score Cell */}
      {liveScores.guest !== undefined ? (
        <div style={guestScoreContainerStyle}>
          {guestScoreDisplay}
        </div>
      ) : ( <div></div> )}

      {isPivotLocked && <div style={pivotLineStyle}></div>}

      {!scoresPresent && !isBroadcast && (
          <span style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.8em', opacity: 0.7}}>(Scores Hidden)</span>
      )}
    </div>
  );
};

export default ScoreOnlyElement;
