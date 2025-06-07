import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';

interface ScoreDisplayElementProps {
  element: StudioElement;
}

const ScoreDisplayElement: React.FC<ScoreDisplayElementProps> = ({ element }) => {
  const {
    fontFamily,
    showName,
    showScore,
    backgroundColor,
    borderColor,
    isPivotLocked // Added for visualization
  } = element;

  const currentFontFamily = fontFamily || 'Arial';
  const currentShowName = typeof showName === 'boolean' ? showName : true;
  const currentShowScore = typeof showScore === 'boolean' ? showScore : true;
  const currentBackgroundColor = backgroundColor || 'transparent';
  const currentBorderColor = borderColor || 'transparent';

  const liveHostName = useDraftStore((state) => state.hostName);
  const liveGuestName = useDraftStore((state) => state.guestName);
  const liveScores = useDraftStore((state) => state.scores);

  const hostScoreDisplay = <span style={{ fontWeight: 'bold' }}>{liveScores.host}</span>;
  const guestScoreDisplay = <span style={{ fontWeight: 'bold' }}>{liveScores.guest}</span>;
  const hostNameDisplay = <span>{liveHostName}</span>;
  const guestNameDisplay = <span>{liveGuestName}</span>;
  const scoreSeparator = <span style={{ margin: '0 8px' }}> </span>;

  const pivotLineStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '10%', // Start a bit down from the top
    bottom: '10%', // End a bit up from the bottom
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent white
    transform: 'translateX(-50%)', // Center the line precisely
    zIndex: 1, // Ensure it's visible but doesn't interfere with text too much
  };

  return (
    <div style={{
      border: `1px solid ${currentBorderColor}`,
      padding: '10px',
      borderRadius: '5px',
      backgroundColor: currentBackgroundColor,
      color: 'white',
      fontFamily: currentFontFamily,
      fontSize: '18px',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      overflow: 'hidden',
      textAlign: 'center',
      position: 'relative', // Needed for absolute positioning of the pivot line
    }}>
      {currentShowName && hostNameDisplay}
      {currentShowName && currentShowScore && <span style={{ margin: '0 4px' }}></span>}
      {currentShowScore && hostScoreDisplay}
      {currentShowScore && scoreSeparator}
      {currentShowScore && guestScoreDisplay}
      {currentShowName && currentShowScore && <span style={{ margin: '0 4px' }}></span>}
      {currentShowName && guestNameDisplay}
      {!currentShowName && !currentShowScore && <span style={{fontSize: '0.8em', opacity: 0.7}}>(Content Hidden)</span>}

      {isPivotLocked && <div style={pivotLineStyle}></div>}
    </div>
  );
};

export default ScoreDisplayElement;
