import React from 'react';
import useDraftStore from '../../store/draftStore';
import { StudioElement } from '../../types/draft';

interface ScoreDisplayElementProps {
  element: StudioElement;
}

const ScoreDisplayElement: React.FC<ScoreDisplayElementProps> = ({ element }) => {
  const {
    fontFamily,
    showName, // Use element.showName directly for conditions
    showScore, // Use element.showScore directly for conditions
    backgroundColor,
    borderColor,
    isPivotLocked,
    pivotInternalOffset
  } = element;

  const currentFontFamily = fontFamily || 'Arial';
  const currentBackgroundColor = backgroundColor || 'transparent';
  const currentBorderColor = borderColor || 'transparent';

  const liveHostName = useDraftStore((state) => state.hostName);
  const liveGuestName = useDraftStore((state) => state.guestName);
  const liveScores = useDraftStore((state) => state.scores);

  const textSpanStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
  };
  const scoreSpanStyle: React.CSSProperties = {
    ...textSpanStyle,
    fontWeight: 'bold',
  };

  const hostScoreDisplay = <span style={scoreSpanStyle}>{liveScores.host}</span>;
  const guestScoreDisplay = <span style={scoreSpanStyle}>{liveScores.guest}</span>;
  const hostNameDisplay = <span style={textSpanStyle}>{liveHostName}</span>;
  const guestNameDisplay = <span style={textSpanStyle}>{liveGuestName}</span>;

  const pivotLineStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '10%',
    bottom: '10%',
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: 'translateX(-50%)',
    zIndex: 1, // Should be above the spacer but below any interactive elements if they existed
  };

  const baseDivStyle: React.CSSProperties = {
    border: `1px solid ${currentBorderColor}`,
    padding: '10px', // This padding is around the entire flex container
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
    // justifyContent removed, direct spacer will handle central spacing
    overflow: 'hidden',
    position: 'relative',
  };

  const actualLeftContentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  };

  const actualRightContentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  };

  // Use element.showName and element.showScore for conditions
  const currentShowName = typeof element.showName === 'boolean' ? element.showName : true;
  const currentShowScore = typeof element.showScore === 'boolean' ? element.showScore : true;

  const showLeftContent = (currentShowName && liveHostName) || (currentShowScore && liveScores.host !== undefined);
  const showRightContent = (currentShowName && liveGuestName) || (currentShowScore && liveScores.guest !== undefined);
  const nothingToShow = !currentShowName && !currentShowScore;


  return (
    <div style={baseDivStyle}>
      {showLeftContent && (
        <div style={actualLeftContentStyle}>
          {currentShowName && hostNameDisplay}
          {currentShowName && currentShowScore && liveHostName && liveScores.host !== undefined && <span style={{ margin: '0 4px' }}></span>}
          {currentShowScore && hostScoreDisplay}
        </div>
      )}

      {/* Spacer Div using pivotInternalOffset */}
      <div style={{ flexShrink: 0, width: `${pivotInternalOffset || 0}px`, height: '100%' /* take full height to ensure separation */ }}></div>

      {showRightContent && (
        <div style={actualRightContentStyle}>
          {currentShowScore && guestScoreDisplay}
          {currentShowName && currentShowScore && liveGuestName && liveScores.guest !== undefined && <span style={{ margin: '0 4px' }}></span>}
          {currentShowName && guestNameDisplay}
        </div>
      )}

      {isPivotLocked && <div style={pivotLineStyle}></div>}

      {nothingToShow && (
          <span style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.8em', opacity: 0.7}}>(Content Hidden)</span>
      )}
    </div>
  );
};

export default ScoreDisplayElement;
