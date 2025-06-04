import React from 'react';
import useDraftStore from '../../store/draftStore'; // Ensure this is not commented out
import { StudioElement } from '../../types/draft'; // Import StudioElement type

interface ScoreDisplayElementProps {
  element: StudioElement; // Expect the full element object as a prop
}

const ScoreDisplayElement: React.FC<ScoreDisplayElementProps> = ({ element }) => {
  // Destructure styling and visibility settings from the element prop
  const {
    fontFamily,
    showName,
    showScore,
    backgroundColor,
    borderColor
  } = element;

  // Fallback to defaults if properties are undefined
  const currentFontFamily = fontFamily || 'Arial';
  const currentShowName = typeof showName === 'boolean' ? showName : true;
  const currentShowScore = typeof showScore === 'boolean' ? showScore : true;
  const currentBackgroundColor = backgroundColor || 'transparent';
  const currentBorderColor = borderColor || 'transparent';

  // Retrieve live data from the store
  const liveHostName = useDraftStore((state) => state.hostName);
  const liveGuestName = useDraftStore((state) => state.guestName);
  const liveScores = useDraftStore((state) => state.scores);

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
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {currentShowName && <span>{liveHostName}</span>}
      {currentShowName && currentShowScore && <span style={{ margin: '0 5px' }}> </span>}

      {currentShowScore && <span style={{ fontWeight: 'bold', margin: '0 5px' }}>({liveScores.host})</span>}
      {currentShowScore && <span style={{ margin: '0 5px' }}>-</span>}
      {currentShowScore && <span style={{ fontWeight: 'bold', margin: '0 5px' }}>({liveScores.guest})</span>}

      {currentShowName && currentShowScore && <span style={{ margin: '0 5px' }}> </span>}
      {currentShowName && <span>{liveGuestName}</span>}

      {!currentShowName && !currentShowScore && <span style={{fontSize: '0.8em', opacity: 0.7}}>(Content Hidden)</span>}
    </div>
  );
};

export default ScoreDisplayElement;
