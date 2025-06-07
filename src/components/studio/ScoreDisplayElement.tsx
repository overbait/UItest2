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
    overflow: 'visible', // For diagnostic purposes as per subtask
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
    zIndex: 1, // Ensure it's above content if they overlap, but below interactive elements if any
  };

  const halfPivotPadding = (pivotInternalOffset || 0) / 2;

  const baseDivStyle: React.CSSProperties = {
    border: `1px solid ${currentBorderColor}`,
    padding: '10px', // Original padding, can be adjusted if needed
    borderRadius: '5px',
    backgroundColor: currentBackgroundColor,
    color: 'white',
    fontFamily: currentFontFamily,
    fontSize: '18px', // Default font size
    width: '100%', // Essential for sizing
    height: '100%', // Essential for sizing
    boxSizing: 'border-box', // Essential for consistent sizing
    display: 'flex',
    justifyContent: 'space-between', // Push left/right sections to edges
    alignItems: 'center',
    overflow: 'hidden', // Final clipping boundary
    position: 'relative',
  };

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align content to the start (left)
    paddingRight: `${halfPivotPadding}px`,
    // Potentially add overflow: 'hidden' here if this section should clip its own content
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end', // Align content to the end (right)
    paddingLeft: `${halfPivotPadding}px`,
    // Potentially add overflow: 'hidden' here if this section should clip its own content
  };

  const nothingToShow = !currentShowName && !currentShowScore;
  // Determine if there's any content to show in left/right sections to avoid rendering empty divs that still take space
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
