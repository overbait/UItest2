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
    hideMaps = false, // Added hideMaps
    pivotInternalOffset = 0,
  } = element;

  const { boxSeriesGames } = useDraftStore(state => ({
    boxSeriesGames: state.boxSeriesGames,
  }));

  const REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX = 30;
  const BASELINE_FONT_SIZE_UNSCALED_PX = 10;
  const dynamicFontSize = BASELINE_FONT_SIZE_UNSCALED_PX;
  const selectorHeight = REFERENCE_SELECTOR_HEIGHT_UNSCALED_PX;
  const selectorWidth = 130;
  const gameTitleFontSize = dynamicFontSize * 0.9;

  // Adjust gridTemplateColumns based on hideCivs and hideMaps
  let gridTemplateColumnsValue = '1fr auto 1fr'; // Default: HostCiv Map GuestCiv
  if (hideCivs && hideMaps) {
    gridTemplateColumnsValue = 'auto'; // Should not happen based on UI, but good to handle (maybe just Game X title)
  } else if (hideCivs) {
    gridTemplateColumnsValue = 'auto'; // Only Map visible
  } else if (hideMaps) {
    // If pivot is used: HostCiv Spacer GuestCiv
    gridTemplateColumnsValue = (pivotInternalOffset && pivotInternalOffset > 0)
      ? `1fr ${pivotInternalOffset}px 1fr`
      : '1fr 1fr'; // HostCiv GuestCiv
  } else {
    // All visible, consider pivot
    gridTemplateColumnsValue = (pivotInternalOffset && pivotInternalOffset > 0)
      ? `1fr ${pivotInternalOffset}px auto ${pivotInternalOffset}px 1fr` // HostCiv Spacer Map Spacer GuestCiv
      : '1fr auto 1fr'; // HostCiv Map GuestCiv
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

  if (!boxSeriesGames || boxSeriesGames.length === 0) {
    if (isBroadcast) return null;
    return <div className={styles.noGamesMessage} style={{ fontFamily }}>(BoX Series: No Games)</div>;
  }

  return (
    <div className={styles.baseElement} style={{ fontFamily, fontSize: `${dynamicFontSize}px` }}>
      {boxSeriesGames.map((game: BoxSeriesGame, index: number) => {
        const hostCivKey = `hc-${index}-${game.hostCiv || 'random'}`;
        const mapKey = `map-${index}-${game.map || 'random'}`;
        const guestCivKey = `gc-${index}-${game.guestCiv || 'random'}`;

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
            <div className={styles.gameTitle} style={dynamicGameTitleStyle}>Game {index + 1}</div>
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
              {!hideMaps && (
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
