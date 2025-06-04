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
    borderColor
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
  const scoreSeparator = <span style={{ margin: '0 8px' }}> </span>; // Using space for score separation

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
      justifyContent: 'space-around', // Use space-around for better distribution
      overflow: 'hidden',
      textAlign: 'center', // Ensure text within spans is centered if spans are blocky
    }}>
      {currentShowName && hostNameDisplay}

      {currentShowName && currentShowScore && <span style={{ margin: '0 4px' }}></span>} {/* Minimal spacer */}

      {currentShowScore && hostScoreDisplay}
      {currentShowScore && scoreSeparator}
      {currentShowScore && guestScoreDisplay}

      {currentShowName && currentShowScore && <span style={{ margin: '0 4px' }}></span>} {/* Minimal spacer */}

      {currentShowName && guestNameDisplay}

      {!currentShowName && !currentShowScore && <span style={{fontSize: '0.8em', opacity: 0.7}}>(Content Hidden)</span>}
    </div>
  );
};

export default ScoreDisplayElement;
