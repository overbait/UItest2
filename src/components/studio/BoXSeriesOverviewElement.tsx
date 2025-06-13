import React, { useState } from 'react'; // Import useState
import useDraftStore from '../../store/draftStore';
import { StudioElement, BoxSeriesGame } from '../../types/draft';
import styles from './BoXSeriesOverviewElement.module.css'; // IMPORT CSS MODULE

// Helper functions (remain the same)
const formatCivNameForImagePath = (civName: string): string => {
  if (!civName) return 'random';
  return civName.toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_').replace(/'/g, '');
};
const formatMapNameForImagePath = (mapName: string): string => {
  if (!mapName) return 'random';
  return mapName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};

interface BoXSeriesOverviewElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
}

const BoXSeriesOverviewElement: React.FC<BoXSeriesOverviewElementProps> = ({ element, isBroadcast }) => {
  const {
    scale = 1, // scale is part of element but not directly used for internal calculations here
    isPivotLocked = false,
    pivotInternalOffset = 0,
    size, // size is part of element but not directly used for internal calculations here
    fontFamily = 'Arial, sans-serif',
  } = element;

  // State to track images that have attempted fallback
  const [failedImageFallbacks, setFailedImageFallbacks] = useState<Set<string>>(new Set());

  const { hostName, guestName, boxSeriesGames } = useDraftStore(state => ({
    hostName: state.hostName,
    guestName: state.guestName,
    boxSeriesGames: state.boxSeriesGames,
  }));

  // REFERENCE_GAME_ROW_HEIGHT_UNSCALED_PX defines the intrinsic height of a game row's visual elements (like images)
  // before any scaling is applied by the parent's transform: scale(element.scale).
  const REFERENCE_GAME_ROW_HEIGHT_UNSCALED_PX = 30;
  // BASELINE_FONT_SIZE_UNSCALED_PX is the font size that corresponds to the REFERENCE_GAME_ROW_HEIGHT_UNSCALED_PX.
  const BASELINE_FONT_SIZE_UNSCALED_PX = 10;

  // numGames is used for adjusting layout or scaling if needed, though not heavily used in current static sizing.
  const numGames = boxSeriesGames.length > 0 ? boxSeriesGames.length : 1;

  // Calculate dimensions and font sizes for internal elements.
  // These are "unscaled" values. The actual on-screen size will be affected by element.scale applied in StudioInterface.
  const gameRowHeight = REFERENCE_GAME_ROW_HEIGHT_UNSCALED_PX; // This is the target height for images within a row.

  // Base font size for text within the element, relative to its unscaled dimensions.
  const dynamicFontSize = BASELINE_FONT_SIZE_UNSCALED_PX;

  // Calculate image dimensions based on the unscaled game row height.
  const civImageWidth = gameRowHeight * 1.2;
  const civImageHeight = gameRowHeight;
  const mapImageWidth = gameRowHeight * 1.6;
  const mapImageHeight = gameRowHeight;

  // Calculate font size and positioning for the "Game X" title.
  const gameTitleFontSize = dynamicFontSize * 0.9; // Slightly smaller than base text.
  // Adjust top offset for "Game X" title to position it above the images.
  // This might need fine-tuning based on actual font rendering and line height.
  const gameTitleTopOffset = -(dynamicFontSize * 1.2);

  // Dynamic style for the game row, primarily for grid layout and applying custom font.
  const gameRowDynamicStyle: React.CSSProperties = {
    gridTemplateColumns: isPivotLocked
      ? `1fr ${pivotInternalOffset}px auto ${pivotInternalOffset}px 1fr`
      : '1fr auto 1fr',
    fontFamily: fontFamily, // Apply fontFamily from element props to ensure it cascades.
  };

  // Dynamic styles for images, setting their unscaled width and height.
  const dynamicCivImageStyle: React.CSSProperties = {
    width: `${civImageWidth}px`,
    height: `${civImageHeight}px`,
  };
  const dynamicMapImageStyle: React.CSSProperties = {
    width: `${mapImageWidth}px`,
    height: `${mapImageHeight}px`,
  };

  // Dynamic styles for the "Game X" title, setting its font size and positioning.
   const dynamicGameTitleStyle: React.CSSProperties = {
    fontSize: `${gameTitleFontSize}px`,
    top: `${gameTitleTopOffset}px`,
  };

  // Fallback display if no games are available.
  if (!boxSeriesGames || boxSeriesGames.length === 0) {
    if (isBroadcast) return null; // Don't render anything in broadcast mode if no games.
    // Apply custom font to the no-games message as well.
    return (
      <div className={styles.noGamesMessage} style={{ fontFamily }}>
        (BoX Series: No Games)
      </div>
    );
  }

  // Main render method for the component.
  return (
    // Base element container, applying CSS module style and dynamic font settings.
    // The overall 'transform: scale(element.scale)' will be applied by the parent StudioElementWrapper.
    // Thus, fontSize here is the "unscaled" font size.
    <div
      className={styles.baseElement}
      style={{ fontFamily, fontSize: `${dynamicFontSize}px` }}
    >
      {boxSeriesGames.map((game: BoxSeriesGame, index: number) => {
        const hostCivKey = `hc-${index}-${game.hostCiv || 'random'}`;
        const mapKey = `map-${index}-${game.map || 'random'}`;
        const guestCivKey = `gc-${index}-${game.guestCiv || 'random'}`;

        return (
        // Container for each game row, applying dynamic grid layout.
        <div key={index} className={styles.gameRow} style={gameRowDynamicStyle}>
          {/* "Game X" title, positioned absolutely above the row. */}
          <div className={styles.gameTitle} style={dynamicGameTitleStyle}>
            Game {index + 1}
          </div>

          {/* Left civilization display. */}
          <div className={`${styles.civCell} ${styles.leftCivCell}`}>
            <img
              key={hostCivKey} // ADDED REACT KEY
              src={`/assets/civflags_normal/${formatCivNameForImagePath(game.hostCiv || 'random')}.png`}
              alt={game.hostCiv || 'N/A'}
              // Apply base image style, and winnerGlow style if host is the winner.
              className={`${styles.civImage} ${game.winner === 'host' ? styles.winnerGlow : ''}`}
              style={dynamicCivImageStyle} // Apply dynamic width/height.
              onError={(e) => handleImageError(e, hostCivKey, '/assets/civflags_normal/random.png')}
            />
          </div>

          {/* Spacer element, shown if pivot is locked. */}
          {isPivotLocked && <div className={styles.spacer}></div>}

          {/* Map display. */}
          <div className={styles.mapCell}>
            <img
              key={mapKey} // ADDED REACT KEY
              src={`/assets/maps/${formatMapNameForImagePath(game.map || 'random')}.png`}
              alt={game.map || 'N/A'}
              className={styles.mapImage} // Maps typically don't have a winner glow.
              style={dynamicMapImageStyle} // Apply dynamic width/height.
              onError={(e) => handleImageError(e, mapKey, '/assets/maps/random.png')}
            />
          </div>

          {/* Spacer element, shown if pivot is locked. */}
          {isPivotLocked && <div className={styles.spacer}></div>}

          {/* Right civilization display. */}
          <div className={`${styles.civCell} ${styles.rightCivCell}`}>
            <img
              key={guestCivKey} // ADDED REACT KEY
              src={`/assets/civflags_normal/${formatCivNameForImagePath(game.guestCiv || 'random')}.png`}
              alt={game.guestCiv || 'N/A'}
              // Apply base image style, and winnerGlow style if guest is the winner.
              className={`${styles.civImage} ${game.winner === 'guest' ? styles.winnerGlow : ''}`}
              style={dynamicCivImageStyle} // Apply dynamic width/height.
              onError={(e) => handleImageError(e, guestCivKey, '/assets/civflags_normal/random.png')}
            />
          </div>
        </div>
      )})}
    </div>
  );
};

export default BoXSeriesOverviewElement;
