import React, { useState, useRef } from 'react'; // Import useState and useRef
import useDraftStore from '../../store/draftStore';
import { StudioElement, BoxSeriesGame } from '../../types/draft';
import styles from './BoXSeriesOverviewElement.module.css'; // IMPORT CSS MODULE
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable'; // IMPORT Draggable

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

// const VALID_BOX_ROLES = ['BoXLeftCivs', 'BoXMaps', 'BoXRightCivs']; // Removed

const BoXSeriesOverviewElement: React.FC<BoXSeriesOverviewElementProps> = ({ element, isBroadcast }) => {
  const {
    scale = 1, // scale is part of element but not directly used for internal calculations here
    isPivotLocked = false,
    pivotInternalOffset = 0, // Ensure this is destructured
    size, // size is part of element but not directly used for internal calculations here
    fontFamily = 'Arial, sans-serif',
    showCivNames = true,  // Default from element prop
    showMapNames = true,  // Default from element prop
    gameEntrySpacing = 10, // Default from element prop, store will set initial 10
    // elementRole, // Removed
  } = element;

  console.log(`[BoXSeriesOverview] Init - Props: isPivotLocked=${isPivotLocked}, pivotInternalOffset=${pivotInternalOffset}, scale=${scale}, element.size.width=${size?.width}, element.size.height=${size?.height}`);

  // const [failedImageFallbacks, setFailedImageFallbacks] = useState<Set<string>>(new Set()); // Removed

  const { hostName, guestName, boxSeriesGames, updateStudioElementSettings } = useDraftStore(state => ({ // Added updateStudioElementSettings
    hostName: state.hostName,
    guestName: state.guestName,
    boxSeriesGames: state.boxSeriesGames,
    updateStudioElementSettings: state.updateStudioElementSettings, // Added
  }));

  const handleCivDrag = (side: 'left' | 'right', data: DraggableData) => {
    const currentOffset = element.pivotInternalOffset || 0;
    let newOffset = currentOffset;

    // Note: deltaX is the change from the last drag event.
    // We want to adjust the offset based on this delta.
    // If dragging left column to the right (increasing its visual offset from center), deltaX is positive.
    // This means pivotInternalOffset (which pushes left col left, right col right) should decrease.
    // If dragging right column to the right (increasing its visual offset), deltaX is positive.
    // This means pivotInternalOffset should increase.

    if (side === 'left') {
      newOffset -= data.deltaX; // Moving left column right decreases offset, left increases offset
    } else { // side === 'right'
      newOffset += data.deltaX; // Moving right column right increases offset, left decreases offset
    }

    // Apply some limits if desired, e.g., Math.max(-150, Math.min(150, newOffset))
    // For now, no explicit limits here, but the SettingsPanel slider has them.
    updateStudioElementSettings(element.id, { pivotInternalOffset: newOffset });
  };

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
  // Obsolete styles: gameImageRowDynamicStyle, leftCivCellStyle, rightCivCellStyle removed.

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

  // Scaler setup
  // element.size IS the natural dimension at scale = 1.
  // The baseElement (viewport) will be element.size * scale.
  // The boxScaler (layout container) will be element.size, and then scaled up.
  const layoutWidth = size.width || 300; // Default if size.width is undefined
  const layoutHeight = size.height || 200; // Default if size.height is undefined
  const scalerTransformOrigin = isPivotLocked ? 'center center' : 'top left';

  // Define boxScalerStyle object
  const boxScalerStyle: React.CSSProperties = {
    width: `${layoutWidth}px`, // Use base layout dimensions
    height: `${layoutHeight}px`, // Use base layout dimensions
    fontSize: `${dynamicFontSize}px`,
    position: 'relative',
    transformOrigin: scalerTransformOrigin,
    overflowY: 'auto', // Enable vertical scrolling
    overflowX: 'hidden', // Prevent horizontal scrolling
  };

  if (isPivotLocked) {
    // When pivot is locked, scale from the center.
    // Position the element's top-left at the center of the baseElement,
    // then translate it back by half its own size, then scale.
    boxScalerStyle.left = '50%';
    boxScalerStyle.top = '50%';
    boxScalerStyle.transform = `translate(-50%, -50%) scale(${scale})`;
    // Removed elementRole and pivotInternalOffset based translateX from boxScaler
  } else {
    // When pivot is not locked, scale from top-left.
    boxScalerStyle.left = '0%'; // Explicitly
    boxScalerStyle.top = '0%';  // Explicitly
    boxScalerStyle.transform = `scale(${scale})`;
  }

return (
  <div
    className={styles.baseElement}
    style={{
      fontFamily,
      overflow: 'hidden',
      width: `${layoutWidth * scale}px`, // Viewport is scaled size
      height: `${layoutHeight * scale}px`, // Viewport is scaled size
    }}
  >
    <div
      className={styles.boxScaler}
      style={boxScalerStyle} // Apply the new style object
    >
      {/* Unified Rendering - restored row-per-game structure */}
      {boxSeriesGames.map((game, index) => {
        // Create refs for Draggable nodeRef if needed, though direct div children might work.
        // For simplicity, if direct divs don't cause issues, we can omit nodeRef.
        // const leftCivRef = useRef<HTMLDivElement>(null);
        // const rightCivRef = useRef<HTMLDivElement>(null);

        const leftCivSpecificStyle: React.CSSProperties = {
          justifySelf: 'end',
          transform: (isPivotLocked && pivotInternalOffset) ? `translateX(-${pivotInternalOffset}px)` : 'none',
          transition: 'transform 0.2s ease-out',
          cursor: isPivotLocked ? 'ew-resize' : 'default',
          userSelect: isPivotLocked ? 'none' : 'auto',
        };

        const rightCivSpecificStyle: React.CSSProperties = {
          justifySelf: 'start',
          transform: (isPivotLocked && pivotInternalOffset) ? `translateX(${pivotInternalOffset}px)` : 'none',
          transition: 'transform 0.2s ease-out',
          cursor: isPivotLocked ? 'ew-resize' : 'default',
          userSelect: isPivotLocked ? 'none' : 'auto',
        };

        // console.log(`[BoXSeriesOverview] Game ${index + 1} - Pivot Styles: isPivotLocked=${isPivotLocked}, pivotInternalOffset=${pivotInternalOffset}, leftCivTransform='${leftCivSpecificStyle.transform}', rightCivTransform='${rightCivSpecificStyle.transform}'`);

        return (
        // Assuming styles.gameEntry is similar to old styles.gameEntryContainer
        <div key={index} className={styles.gameEntry} style={{ paddingTop: index > 0 ? `${gameEntrySpacing}px` : '0px' }}>
          <div className={styles.gameTitle} style={dynamicGameTitleStyle}>
            Game {index + 1}
          </div>
          {/* Assuming styles.gameDataRow is a new class for the grid container */}
          <div className={styles.gameDataRow} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>

    {/* Left Civ Draggable Wrapper */}
    <Draggable axis="x" disabled={!isPivotLocked} onDrag={(e, data) => handleCivDrag('left', data)} defaultPosition={{x:0, y:0}}>
      <div className={`${styles.civCell} ${styles.leftCivCell}`} style={leftCivSpecificStyle}>
        <div
          key={`hostciv-${index}`} // Keep keys on the actual content elements if map is involved
          className={`${styles.selectorDisplay} ${game.winner === 'host' ? styles.winnerGlow : ''}`}
          style={{
            ...civSelectorStyle,
            backgroundImage: `linear-gradient(to bottom, rgba(74,59,42,0.7) 0%, rgba(74,59,42,0.1) 100%), url('/assets/civflags_normal/${formatCivNameForImagePath(game.hostCiv || 'random')}.png')`,
          }}
        >
          {showCivNames && game.hostCiv && (
            <div className={styles.selectorTextOverlay}>{game.hostCiv}</div>
          )}
        </div>
      </div>
    </Draggable>

    {/* Map Cell (Central, not draggable independently here) */}
    <div className={styles.mapCell} style={{ justifySelf: 'center' }}>
      <div
        key={`map-${index}`}
        className={styles.selectorDisplay}
        style={{
          ...mapSelectorStyle,
          backgroundImage: `linear-gradient(to bottom, rgba(74,59,42,0.7) 0%, rgba(74,59,42,0.1) 100%), url('/assets/maps/${formatMapNameForImagePath(game.map || 'random')}.png')`,
        }}
      >
        {showMapNames && game.map && (
          <div className={styles.selectorTextOverlay}>{game.map}</div>
        )}
      </div>
    </div>

    {/* Right Civ Draggable Wrapper */}
    <Draggable axis="x" disabled={!isPivotLocked} onDrag={(e, data) => handleCivDrag('right', data)} defaultPosition={{x:0, y:0}}>
      <div className={`${styles.civCell} ${styles.rightCivCell}`} style={rightCivSpecificStyle}>
        <div
          key={`guestciv-${index}`}
          className={`${styles.selectorDisplay} ${game.winner === 'guest' ? styles.winnerGlow : ''}`}
          style={{
            ...civSelectorStyle,
            backgroundImage: `linear-gradient(to bottom, rgba(74,59,42,0.7) 0%, rgba(74,59,42,0.1) 100%), url('/assets/civflags_normal/${formatCivNameForImagePath(game.guestCiv || 'random')}.png')`,
          }}
        >
          {showCivNames && game.guestCiv && (
            <div className={styles.selectorTextOverlay}>{game.guestCiv}</div>
          )}
        </div>
      </div>
    </Draggable>
          </div> {/* This closes gameDataRow */}
        </div>
      );
      })}
    </div>
  </div>
);
};

export default BoXSeriesOverviewElement;
