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
  const currentBackgroundColor = backgroundColor || 'transparent';
  const currentBorderColor = borderColor || 'transparent';
  const currentPivotOffset = pivotInternalOffset || 0; // Used for grid template

  const liveHostName = useDraftStore((state) => state.hostName);
  const liveGuestName = useDraftStore((state) => state.guestName);
  const liveScores = useDraftStore((state) => state.scores);

  const textSpanStyle: React.CSSProperties = {
    display: 'inline-block', // Or 'block' if it makes more sense in the flex layout
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%', // Crucial for ellipsis to work within its container
    // verticalAlign: 'middle', // Might be useful depending on alignment with score
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
    left: '50%', // This will align with the center of the middle grid column if parent padding is 0
    top: '10%',  // Or, if parent has padding, it aligns relative to the padding box.
    bottom: '10%',
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: 'translateX(-50%)', // Ensures the line itself is centered on the 50% mark
    zIndex: 1,
  };

  const baseDivStyle: React.CSSProperties = {
    border: `1px solid ${currentBorderColor}`,
    padding: '10px', // Padding around the grid
    borderRadius: '5px',
    backgroundColor: currentBackgroundColor,
    color: 'white',
    fontFamily: currentFontFamily,
    fontSize: '18px',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    display: 'grid', // Changed to grid
    gridTemplateColumns: `auto ${currentPivotOffset}px auto`, // Grid layout
    alignItems: 'center', // Vertical alignment for grid items
    overflow: 'hidden',
    position: 'relative', // For pivot line and fallback text
  };

  // Styles for the content within grid cells
  const actualLeftContentStyle: React.CSSProperties = {
    display: 'flex', // To lay out name and score spans
    alignItems: 'center',
    justifyContent: 'flex-end', // Align content to the right of this cell
    // paddingRight: '5px', // Optional: if space from cell edge to content is needed
  };

  const actualRightContentStyle: React.CSSProperties = {
    display: 'flex', // To lay out score and name spans
    alignItems: 'center',
    justifyContent: 'flex-start', // Align content to the left of this cell
    // paddingLeft: '5px', // Optional: if space from cell edge to content is needed
  };

  const currentShowName = typeof element.showName === 'boolean' ? element.showName : true;
  const currentShowScore = typeof element.showScore === 'boolean' ? element.showScore : true;

  const showLeftContent = (currentShowName && liveHostName) || (currentShowScore && liveScores.host !== undefined);
  const showRightContent = (currentShowName && liveGuestName) || (currentShowScore && liveScores.guest !== undefined);
  const nothingToShow = !currentShowName && !currentShowScore;

  return (
    <div style={baseDivStyle}>
      {/* Left Content Cell */}
      {showLeftContent ? (
        <div style={actualLeftContentStyle}>
          {currentShowName && hostNameDisplay}
          {currentShowName && currentShowScore && liveHostName && liveScores.host !== undefined && <span style={{ margin: '0 4px' }}></span>}
          {currentShowScore && hostScoreDisplay}
        </div>
      ) : ( <div></div> ) /* Empty div to occupy the grid cell if no content */}

      {/* Middle Spacer Cell (implicitly sized by gridTemplateColumns) */}
      <div></div>

      {/* Right Content Cell */}
      {showRightContent ? (
        <div style={actualRightContentStyle}>
          {currentShowScore && guestScoreDisplay}
          {currentShowName && currentShowScore && liveGuestName && liveScores.guest !== undefined && <span style={{ margin: '0 4px' }}></span>}
          {currentShowName && guestNameDisplay}
        </div>
      ) : ( <div></div> ) /* Empty div to occupy the grid cell if no content */}

      {isPivotLocked && <div style={pivotLineStyle}></div>}

      {nothingToShow && (
          <span style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.8em', opacity: 0.7}}>(Content Hidden)</span>
      )}
    </div>
  );
};

export default ScoreDisplayElement;
