import React, { useState, useEffect } from 'react'; // Import useEffect
import useDraftStore from '../../store/draftStore';
import { StudioElement, BoxSeriesGame } from '../../types/draft';
import styles from './BoXSeriesOverviewElement.module.css';

// Helper functions
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
    showCivNames = true,  // Default from element prop
    showMapNames = true,  // Default from element prop
    gameEntrySpacing = 10, // Default from element prop, store will set initial 10
    hideCivs = false, // Destructure hideCivs prop
  } = element;

  // const [failedImageFallbacks, setFailedImageFallbacks] = useState<Set<string>>(new Set()); // Removed

  const { hostName, guestName, boxSeriesGames } = useDraftStore(state => ({
    hostName: state.hostName,
    guestName: state.guestName,
    boxSeriesGames: state.boxSeriesGames,
  }));

  // REFERENCE_GAME_ROW_HEIGHT_UNSCALED_PX defines the intrinsic height of a game row's visual elements (like images)
  // before any scaling is applied by the parent's transform: scale(element.scale).
  const REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX = 30;
  // BASELINE_FONT_SIZE_UNSCALED_PX is the font size that corresponds to the REFERENCE_GAME_ROW_HEIGHT_UNSCALED_PX.
  const BASELINE_FONT_SIZE_UNSCALED_PX = 10;

  // numGames is used for adjusting layout or scaling if needed, though not heavily used in current static sizing.
  const numGames = boxSeriesGames.length > 0 ? boxSeriesGames.length : 1;

  // Calculate dimensions and font sizes for internal elements.
  // These are "unscaled" values. The actual on-screen size will be affected by element.scale applied in StudioInterface.
  const gameRowHeight = REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX; // This is the target height for images within a row.

  // Base font size for text within the element, relative to its unscaled dimensions.
  const dynamicFontSize = BASELINE_FONT_SIZE_UNSCALED_PX;

  // Calculate image dimensions based on the unscaled game row height.
  // const civImageWidth = gameRowHeight * 1.2; // Old direct image width
  // const civImageHeight = gameRowHeight; // Old direct image height
  // const mapImageWidth = gameRowHeight * 1.6; // Old direct image width
  // const mapImageHeight = gameRowHeight; // Old direct image height

  // const civImageContainerHeight = REFERENCE_GAME_ROW_HEIGHT_UNSCALED_PX; // Renamed to selectorHeight
  // const mapImageContainerHeight = REFERENCE_GAME_ROW_HEIGHT_UNSCALED_PX; // Renamed to selectorHeight
  // const civImageContainerWidth = civImageContainerHeight * (4/3); // Renamed to civSelectorWidth
  // const mapImageContainerWidth = mapImageContainerHeight * (16/9); // Renamed to mapSelectorWidth

  const selectorHeight = REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX;
  const selectorWidth = 130;

  // Calculate font size and positioning for the "Game X" title.
  const gameTitleFontSize = dynamicFontSize * 0.9; // Slightly smaller than base text.
  // Adjust top offset for "Game X" title to position it above the images.
  // This might need fine-tuning based on actual font rendering and line height.
  const gameTitleTopOffset = -(dynamicFontSize * 1.2); // This might be less relevant or need adjustment

  // Dynamic style for the game image row, primarily for grid layout and applying custom font.
  // The fontFamily for the overall element is set on styles.baseElement,
  // so it should cascade unless overridden here.
  const gameImageRowDynamicStyle: React.CSSProperties = {
    gridTemplateColumns: hideCivs
      ? 'auto' // If civs are hidden, map column takes its own width, centered by grid container
      : (element.pivotInternalOffset && element.pivotInternalOffset > 0)
        ? `1fr ${element.pivotInternalOffset}px auto ${element.pivotInternalOffset}px 1fr`
        : '1fr auto 1fr',
    // fontFamily is inherited
  };

  // Dynamic styles for images, setting their unscaled width and height.
  // const dynamicCivImageStyle: React.CSSProperties = { // Old, applied to <img>
  //   width: `${civImageWidth}px`,
  //   height: `${civImageHeight}px`,
  // };
  // const dynamicMapImageStyle: React.CSSProperties = { // Old, applied to <img>
  //   width: `${mapImageWidth}px`,
  //   height: `${mapImageHeight}px`,
  // };

  // Styles for the selector display divs
  const civSelectorStyle: React.CSSProperties = { // This will style the outer div
    width: `${selectorWidth}px`,
    height: `${selectorHeight}px`,
  };
  const mapSelectorStyle: React.CSSProperties = { // This will style the outer div
    width: `${selectorWidth}px`, // Now uniform width
    height: `${selectorHeight}px`,
  };

  // Dynamic styles for the "Game X" title, setting its font size and positioning.
   const gameTitleFont = element.fontFamilyGameTitle || undefined; // Use undefined to let CSS take over if not set

   const dynamicGameTitleStyle: React.CSSProperties = {
    fontSize: `${gameTitleFontSize}px`,
    // top: `${gameTitleTopOffset}px`, // Removed as it's no longer absolutely positioned
    fontFamily: gameTitleFont,
  };

  // const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, imageKey: string, fallbackSrc: string) => { // Removed
  //   if (!failedImageFallbacks.has(imageKey)) {
  //     setFailedImageFallbacks(prev => new Set(prev).add(imageKey));
  //     e.currentTarget.src = fallbackSrc;
  //   }
  // };

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
        const hostCivKey = `hc-${index}-${game.hostCiv || 'random'}`;
        const mapKey = `map-${index}-${game.map || 'random'}`;
        const guestCivKey = `gc-${index}-${game.guestCiv || 'random'}`;

        // Opacity states for fade-in effect
        const [hostCivOpacity, setHostCivOpacity] = useState(0);
        const [guestCivOpacity, setGuestCivOpacity] = useState(0);
        const [mapOpacity, setMapOpacity] = useState(0);

        useEffect(() => {
            setHostCivOpacity(0); // Reset opacity before fade-in
            if (game.hostCiv) {
                setTimeout(() => setHostCivOpacity(1), 50); // Start fade-in after a brief delay
            }
        }, [game.hostCiv]);

        useEffect(() => {
            setGuestCivOpacity(0);
            if (game.guestCiv) {
                setTimeout(() => setGuestCivOpacity(1), 50);
            }
        }, [game.guestCiv]);

        useEffect(() => {
            setMapOpacity(0);
            if (game.map) {
                setTimeout(() => setMapOpacity(1), 50);
            }
        }, [game.map]);

        return (
         <div
           key={index}
           className={styles.gameEntryContainer}
           style={{ paddingTop: index > 0 ? `${gameEntrySpacing}px` : '0px' }}
         >
            <div className={styles.gameTitle} style={dynamicGameTitleStyle}>
              Game {index + 1}
            </div>
           <div className={styles.gameImageRow} style={gameImageRowDynamicStyle}>
              {/* Left civilization display. */}
              {!hideCivs && (
              <div className={`${styles.civCell} ${styles.leftCivCell}`}>
                <div
                  key={hostCivKey + '-container'}
                  className={`${styles.selectorDisplay} ${game.winner === 'host' ? styles.winnerGlow : ''}`}
                  style={{ // Base placeholder image
                    ...civSelectorStyle,
                    backgroundImage: `linear-gradient(to bottom, rgba(74,59,42,0.7), rgba(74,59,42,0.1)), url('/assets/civflags_normal/${formatCivNameForImagePath('random')}.png')`,
                  }}
                >
                  {game.hostCiv && (
                    <img
                      src={`/assets/civflags_normal/${formatCivNameForImagePath(game.hostCiv)}.png`}
                      alt={game.hostCiv}
                      className={styles.boxPickedImage} // Use new class
                      style={{ opacity: hostCivOpacity }}
                    />
                  )}
                  {showCivNames && game.hostCiv && (
                    <div className={styles.selectorTextOverlay}>{game.hostCiv}</div>
                  )}
                </div>
              </div>
              )}

              {/* Spacer element */}
              {!hideCivs && (pivotInternalOffset > 0) && <div className={styles.spacer}></div>}

              {/* Map display. */}
              <div className={styles.mapCell}>
                <div
                  key={mapKey + '-container'}
                  className={styles.selectorDisplay} // No winnerGlow for maps
                  style={{ // Base placeholder image
                    ...mapSelectorStyle,
                    backgroundImage: `linear-gradient(to bottom, rgba(74,59,42,0.7), rgba(74,59,42,0.1)), url('/assets/maps/${formatMapNameForImagePath('random')}.png')`, // Assuming a random map placeholder exists
                  }}
                >
                  {game.map && (
                    <img
                      src={`/assets/maps/${formatMapNameForImagePath(game.map)}.png`}
                      alt={game.map}
                      className={styles.boxPickedImage} // Use new class
                      style={{ opacity: mapOpacity }}
                    />
                  )}
                  {showMapNames && game.map && (
                    <div className={styles.selectorTextOverlay}>{game.map}</div>
                  )}
                </div>
              </div>

              {/* Spacer element */}
              {!hideCivs && (pivotInternalOffset > 0) && <div className={styles.spacer}></div>}

              {/* Right civilization display. */}
              {!hideCivs && (
              <div className={`${styles.civCell} ${styles.rightCivCell}`}>
                <div
                  key={guestCivKey + '-container'}
                  className={`${styles.selectorDisplay} ${game.winner === 'guest' ? styles.winnerGlow : ''}`}
                  style={{ // Base placeholder image
                    ...civSelectorStyle,
                    backgroundImage: `linear-gradient(to bottom, rgba(74,59,42,0.7), rgba(74,59,42,0.1)), url('/assets/civflags_normal/${formatCivNameForImagePath('random')}.png')`,
                  }}
                >
                  {game.guestCiv && (
                    <img
                      src={`/assets/civflags_normal/${formatCivNameForImagePath(game.guestCiv)}.png`}
                      alt={game.guestCiv}
                      className={styles.boxPickedImage} // Use new class
                      style={{ opacity: guestCivOpacity }}
                    />
                  )}
                  {showCivNames && game.guestCiv && (
                    <div className={styles.selectorTextOverlay}>{game.guestCiv}</div>
                  )}
                </div>
              </div>
              )}
           </div> {/* End of gameImageRow */}
        </div>
      )})}
    </div>
  );
};

export default BoXSeriesOverviewElement;
