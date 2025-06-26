import React, { useState, useEffect } from 'react';
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
    fontFamily = 'Arial, sans-serif',
    showCivNames = true,
    showMapNames = true,
    gameEntrySpacing = 10,
    hideCivs = false,
    hideMaps = false,
    hideGameXText = false, // Added hideGameXText
    pivotInternalOffset = 0,
  } = element;

  const { boxSeriesGames } = useDraftStore(state => ({
    boxSeriesGames: state.boxSeriesGames,
  }));

  // Filter games based on the isVisible flag
  const visibleGames = boxSeriesGames.filter(game => game.isVisible === undefined ? false : game.isVisible);

  const REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX = 30;
  const BASELINE_FONT_SIZE_UNSCALED_PX = 10;
  const dynamicFontSize = BASELINE_FONT_SIZE_UNSCALED_PX;
  const selectorHeight = REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX;
  const selectorWidth = 130;
  const gameTitleFontSize = dynamicFontSize * 0.9;

  // Adjust gridTemplateColumns based on hideCivs and hideMaps
  let gridTemplateColumnsValue = '';

  if (hideCivs) {
    if (hideMaps) {
      // Case 1: Civs hidden, Maps hidden (element is effectively empty or only shows game titles, which are also hidden)
      gridTemplateColumnsValue = 'auto'; // Or 'none', or doesn't matter much as content is hidden
    } else {
      // Case 2: Civs hidden, Maps visible
      gridTemplateColumnsValue = 'auto'; // Map takes up the space
    }
  } else { // Civs are visible
    if (hideMaps) {
      // Case 3: Civs visible, Maps hidden
      if (pivotInternalOffset && pivotInternalOffset > 0) {
        // Civs visible, Maps hidden, Pivot Active
        // Structure: LeftCiv, DynamicCentralSpacer, RightCiv
        gridTemplateColumnsValue = '1fr auto 1fr';
      } else {
        // Civs visible, Maps hidden, Pivot NOT Active
        // Structure: LeftCiv, RightCiv (adjacent)
        gridTemplateColumnsValue = '1fr 1fr';
      }
    } else {
      // Case 4: Civs visible, Maps visible (original logic)
      if (pivotInternalOffset && pivotInternalOffset > 0) {
        // Civs visible, Maps visible, Pivot Active
        // Structure: LeftCiv, OriginalSpacer, Map, OriginalSpacer, RightCiv
        gridTemplateColumnsValue = `1fr ${pivotInternalOffset}px auto ${pivotInternalOffset}px 1fr`;
      } else {
        // Civs visible, Maps visible, Pivot NOT Active
        // Structure: LeftCiv, Map, RightCiv
        gridTemplateColumnsValue = '1fr auto 1fr';
      }
    }
  }

  const gameImageRowDynamicStyle: React.CSSProperties = {
    gridTemplateColumns: gridTemplateColumnsValue,
  };

  const civSelectorStyleBase: React.CSSProperties = {
    width: `${selectorWidth}px`,
    height: `${selectorHeight}px`,
  };
  const mapSelectorStyleBase: React.CSSProperties = {
    width: `${selectorWidth}px`,
    height: `${selectorHeight}px`,
  };
  const gameTitleFont = element.fontFamilyGameTitle || undefined;
  const dynamicGameTitleStyle: React.CSSProperties = {
    fontSize: `${gameTitleFontSize}px`,
    fontFamily: gameTitleFont,
  };

  if (!visibleGames || visibleGames.length === 0) { // Use visibleGames here
    if (isBroadcast) return null;
    return <div className={styles.noGamesMessage} style={{ fontFamily }}>(BoX Series: No Visible Games)</div>; // Updated message
  }

  return (
    <div className={styles.baseElement} style={{ fontFamily, fontSize: `${dynamicFontSize}px` }}>
      {visibleGames.map((game: BoxSeriesGame, index: number) => { // Use visibleGames here
        // Note: The 'index' here is for the visibleGames array. If the original index is needed for Game X text,
        // and we want to preserve original numbering (e.g. Game 1, Game 3 if Game 2 is hidden),
        // we would need to find the original index from boxSeriesGames.
        // For now, assuming Game {index + 1} refers to the sequence of VISIBLE games.
        // If original game numbering is critical even when some are hidden, this logic will need adjustment.
        // Based on "Игры в элементе Box Series Overview на странице Broadcast Studio должны продолжать подстраиваться относительно центра",
        // re-numbering based on visible games seems acceptable.

        const hostCivKey = `hc-${game.hostCiv || 'random'}-${index}`; // Ensure key uniqueness with potentially sparse original indices
        const mapKey = `map-${game.map || 'random'}-${index}`;
        const guestCivKey = `gc-${game.guestCiv || 'random'}-${index}`;

        // Opacity states for the <img> overlay fade-in effect
        const [hostCivImgOpacity, setHostCivImgOpacity] = useState(0);
        const [guestCivImgOpacity, setGuestCivImgOpacity] = useState(0);
        const [mapImgOpacity, setMapImgOpacity] = useState(0);

        useEffect(() => {
          if (game.hostCiv) {
            setHostCivImgOpacity(0); // Reset for fade-in if civ changes
            const timer = setTimeout(() => setHostCivImgOpacity(1), 50);
            return () => clearTimeout(timer);
          } else {
            setHostCivImgOpacity(0);
          }
        }, [game.hostCiv]);

        useEffect(() => {
          if (game.guestCiv) {
            setGuestCivImgOpacity(0);
            const timer = setTimeout(() => setGuestCivImgOpacity(1), 50);
            return () => clearTimeout(timer);
          } else {
            setGuestCivImgOpacity(0);
          }
        }, [game.guestCiv]);

        useEffect(() => {
          if (game.map) {
            setMapImgOpacity(0);
            const timer = setTimeout(() => setMapImgOpacity(1), 50);
            return () => clearTimeout(timer);
          } else {
            setMapImgOpacity(0);
          }
        }, [game.map]);

        // Restore linear gradient for a subtle effect, can be removed if problematic
        const gradient = 'linear-gradient(to bottom, rgba(74,59,42,0.1), rgba(74,59,42,0.0))';

        return (
         <div key={index} className={styles.gameEntryContainer} style={{ paddingTop: index > 0 ? `${gameEntrySpacing}px` : '0px' }}>
            {!hideGameXText && <div className={styles.gameTitle} style={dynamicGameTitleStyle}>Game {index + 1}</div>}
            <div className={styles.gameImageRow} style={gameImageRowDynamicStyle}>
              {!hideCivs && (
                <div className={`${styles.civCell} ${styles.leftCivCell}`}>
                  <div
                    key={hostCivKey}
                    className={`${styles.selectorDisplay} ${game.winner === 'host' ? styles.winnerGlow : ''}`}
                    style={{
                      ...civSelectorStyleBase,
                      backgroundImage: `${gradient}, url('/assets/civflags_normal/${formatCivNameForImagePath('random')}.png')`,
                    }}
                  >
                    {game.hostCiv && (
                      <img
                        src={`/assets/civflags_normal/${formatCivNameForImagePath(game.hostCiv)}.png`}
                        alt={game.hostCiv || 'Host Civ'}
                        className={styles.boxPickedImage}
                        style={{ opacity: hostCivImgOpacity }}
                      />
                    )}
                    {showCivNames && game.hostCiv && (
                      <div className={styles.selectorTextOverlay}>{game.hostCiv}</div>
                    )}
                  </div>
                </div>
              )}
              {!hideCivs && !hideMaps && (pivotInternalOffset > 0) && <div className={styles.spacer}></div>}
              {/* Central content: Map or Spacer if map is hidden and pivot is active */}
              {(!hideMaps) && (
                <div className={styles.mapCell}>
                  <div
                    key={mapKey}
                    className={styles.selectorDisplay}
                    style={{
                      ...mapSelectorStyleBase,
                      backgroundImage: `${gradient}, url('/assets/maps/${formatMapNameForImagePath('random')}.png')`,
                    }}
                  >
                    {game.map && (
                      <img
                        src={`/assets/maps/${formatMapNameForImagePath(game.map)}.png`}
                        alt={game.map || 'Map'}
                        className={styles.boxPickedImage}
                        style={{ opacity: mapImgOpacity }}
                      />
                    )}
                    {showMapNames && game.map && (
                      <div className={styles.selectorTextOverlay}>{game.map}</div>
                    )}
                  </div>
                </div>
              )}
              {/* Dedicated spacer for when maps are hidden, civs are visible, and pivot is active */}
              {hideMaps && !hideCivs && pivotInternalOffset > 0 && (
                <div style={{ width: `${pivotInternalOffset * 2}px`, flexShrink: 0 /* Prevent shrinking */ }}></div>
              )}
              {!hideCivs && !hideMaps && (pivotInternalOffset > 0) && <div className={styles.spacer}></div>}
              {!hideCivs && (
                <div className={`${styles.civCell} ${styles.rightCivCell}`}>
                  <div
                    key={guestCivKey}
                    className={`${styles.selectorDisplay} ${game.winner === 'guest' ? styles.winnerGlow : ''}`}
                    style={{
                      ...civSelectorStyleBase,
                      backgroundImage: `${gradient}, url('/assets/civflags_normal/${formatCivNameForImagePath('random')}.png')`,
                    }}
                  >
                    {game.guestCiv && (
                      <img
                        src={`/assets/civflags_normal/${formatCivNameForImagePath(game.guestCiv)}.png`}
                        alt={game.guestCiv || 'Guest Civ'}
                        className={styles.boxPickedImage}
                        style={{ opacity: guestCivImgOpacity }}
                      />
                    )}
                    {showCivNames && game.guestCiv && (
                      <div className={styles.selectorTextOverlay}>{game.guestCiv}</div>
                    )}
                  </div>
                </div>
              )}
           </div>
        </div>
      )})}
    </div>
  );
};

export default BoXSeriesOverviewElement;
