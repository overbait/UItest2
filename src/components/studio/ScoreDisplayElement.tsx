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
    isPivotLocked, // Added for visualization
    pivotInternalOffset // New property for spacing
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
  // const scoreSeparator = <span style={{ margin: '0 8px' }}> </span>; // No longer explicitly used in this manner

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

  const halfPivotPadding = (pivotInternalOffset || 0) / 2;

  const baseDivStyle: React.CSSProperties = {
    border: `1px solid ${currentBorderColor}`,
    padding: '10px', // Original padding
    borderRadius: '5px',
    backgroundColor: currentBackgroundColor,
    color: 'white',
    fontFamily: currentFontFamily,
    fontSize: '18px',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center', // Center the left/right content groups
    alignItems: 'center',
    overflow: 'hidden',
    // textAlign: 'center', // textAlign on child sections might be more appropriate if needed
    position: 'relative', // Crucial for the absolute pivot line
  };

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    paddingRight: `${halfPivotPadding}px`,
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: `${halfPivotPadding}px`,
  };

  const nothingToShow = !currentShowName && !currentShowScore;
  const showLeftContent = currentShowName || currentShowScore;
  const showRightContent = currentShowName || currentShowScore;


  return (
    <div style={baseDivStyle}>
      {showLeftContent && (
        <div style={leftSectionStyle}>
          {currentShowName && hostNameDisplay}
          {currentShowName && currentShowScore && <span style={{ margin: '0 4px' }}></span>}
          {currentShowScore && hostScoreDisplay}
        </div>
      )}

      {isPivotLocked && <div style={pivotLineStyle}></div>}

      {showRightContent && (
        <div style={rightSectionStyle}>
          {currentShowScore && guestScoreDisplay}
          {currentShowName && currentShowScore && <span style={{ margin: '0 4px' }}></span>}
          {currentShowName && guestNameDisplay}
        </div>
      )}

      {nothingToShow && (
          <span style={{fontSize: '0.8em', opacity: 0.7, position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)'}}>(Content Hidden)</span>
      )}
    </div>
  );
};

export default ScoreDisplayElement;
