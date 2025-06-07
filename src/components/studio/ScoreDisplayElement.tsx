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
    isPivotLocked,
    pivotInternalOffset
  } = element;

  const currentFontFamily = fontFamily || 'Arial';
  const currentShowName = typeof showName === 'boolean' ? showName : true;
  const currentShowScore = typeof showScore === 'boolean' ? showScore : true;
  const currentBackgroundColor = backgroundColor || 'transparent';
  const currentBorderColor = borderColor || 'transparent';

  const liveHostName = useDraftStore((state) => state.hostName);
  const liveGuestName = useDraftStore((state) => state.guestName);
  const liveScores = useDraftStore((state) => state.scores);

  // Define styles for the text spans
  const textSpanStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    // overflow: 'visible', // Removed as per subtask
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
    zIndex: 1,
  };

  const halfPivotPadding = (pivotInternalOffset || 0) / 2;

  const baseDivStyle: React.CSSProperties = {
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
    justifyContent: 'space-between', // Verified
    alignItems: 'center',
    overflow: 'hidden', // Verified
    position: 'relative',
  };

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingRight: `${halfPivotPadding}px`,
    flexShrink: 0, // Added
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: `${halfPivotPadding}px`,
    flexShrink: 0, // Added
  };

  const nothingToShow = !currentShowName && !currentShowScore;
  const showLeftContent = (currentShowName && liveHostName) || (currentShowScore && liveScores.host !== undefined);
  const showRightContent = (currentShowName && liveGuestName) || (currentShowScore && liveScores.guest !== undefined);

  return (
    <div style={baseDivStyle}>
      {showLeftContent && (
        <div style={leftSectionStyle}>
          {currentShowName && hostNameDisplay}
          {currentShowName && currentShowScore && liveHostName && liveScores.host !== undefined && <span style={{ margin: '0 4px' }}></span>}
          {currentShowScore && hostScoreDisplay}
        </div>
      )}

      {isPivotLocked && <div style={pivotLineStyle}></div>}

      {showRightContent && (
        <div style={rightSectionStyle}>
          {currentShowScore && guestScoreDisplay}
          {currentShowName && currentShowScore && liveGuestName && liveScores.guest !== undefined && <span style={{ margin: '0 4px' }}></span>}
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
