import React, { useEffect, useMemo, useState } from 'react';
import useDraftStore from '../store/draftStore';
import { StudioElement } from '../types/draft';
import ScoreOnlyElement from '../components/studio/ScoreOnlyElement';
import NicknamesOnlyElement from '../components/studio/NicknamesOnlyElement';
import BoXSeriesOverviewElement from '../components/studio/BoXSeriesOverviewElement';
import CountryFlagsElement from '../components/studio/CountryFlagsElement';
import ColorGlowElement from '../components/studio/ColorGlowElement';
import MapPoolElement from '../components/studio/MapPoolElement';
import CivPoolElement from '../components/studio/CivPoolElement';
import BackgroundImageElement from '../components/studio/BackgroundImageElement'; // Import new component
// All elements are now imported.

interface BroadcastViewProps {
  targetCanvasId: string;
}

const BroadcastView: React.FC<BroadcastViewProps> = ({ targetCanvasId }) => {
  const { currentCanvasesFromHook, activeCanvasIdFromHook } = useDraftStore(state => ({
    currentCanvasesFromHook: state.currentCanvases,
    activeCanvasIdFromHook: state.activeCanvasId,
  }));
  // const [refreshKey, setRefreshKey] = useState(0); // No longer needed

  useEffect(() => {
    (window as any).IS_BROADCAST_VIEW = true;

    const handlePresetChange = (event: Event) => {
      console.log('[BroadcastView] Detected externalPresetChange event, reloading page. Details:', (event as CustomEvent).detail);
      window.location.reload();
    };

    window.addEventListener('externalPresetChange', handlePresetChange);

    return () => {
      (window as any).IS_BROADCAST_VIEW = false;
      window.removeEventListener('externalPresetChange', handlePresetChange);
    };
  }, []);

  const canvasToRender = useMemo(() => {
    // First, try with targetCanvasId from URL
    let foundCanvas = currentCanvasesFromHook.find(canvas => canvas.id === targetCanvasId);

    if (!foundCanvas && activeCanvasIdFromHook && currentCanvasesFromHook.length > 0) {
      // Try fallback to activeCanvasIdFromHook if targetCanvasId not found
      console.log(`[BroadcastView] Target canvas ID "${targetCanvasId}" not found. Attempting fallback to activeCanvasIdFromHook: "${activeCanvasIdFromHook}"`);
      foundCanvas = currentCanvasesFromHook.find(canvas => canvas.id === activeCanvasIdFromHook);
    }

    if (!foundCanvas && currentCanvasesFromHook.length > 0) {
      // If still not found (e.g., targetCanvasId was invalid AND activeCanvasIdFromHook was invalid/null),
      // and there are canvases available, fall back to the first available canvas.
      console.log(`[BroadcastView] Target canvas ID "${targetCanvasId}" and activeCanvasIdFromHook "${activeCanvasIdFromHook}" not found or invalid. Attempting fallback to the first available canvas.`);
      foundCanvas = currentCanvasesFromHook[0];
      if (foundCanvas) {
        console.log(`[BroadcastView] Fell back to first available canvas: ID "${foundCanvas.id}", Name "${foundCanvas.name}"`);
      }
    }
    // If foundCanvas is still undefined here, it means currentCanvasesFromHook is empty.
    return foundCanvas;
  }, [currentCanvasesFromHook, targetCanvasId, activeCanvasIdFromHook]); // Removed refreshKey dependency

  if (!canvasToRender) {
    // This message will now primarily appear if currentCanvasesFromHook is empty.
    const message = currentCanvasesFromHook.length === 0
      ? "No canvases available in the current layout."
      : `Canvas with ID '${targetCanvasId}' not found, and fallback to active or first canvas also failed.`;
    return (
      <div style={{ width: '1920px', height: '1080px', backgroundColor: 'rgba(255,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px' }}>
        {message}
      </div>
    );
  }

  // if (canvasToRender) { // Ensure canvasToRender is not null before logging its properties
  //   console.log('BroadcastView - canvasToRender:', JSON.parse(JSON.stringify(canvasToRender))); // Log a deep clone for cleaner inspection
  //   console.log('BroadcastView - canvasToRender.layout:', canvasToRender.layout); // Log the layout array directly
  // }

  const debugInfoStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    left: '10px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: '10px',
    zIndex: 9999,
    fontSize: '12px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap', // To respect newlines
  };

  // const backgroundImageStyle: React.CSSProperties = { // Old style, no longer needed here
  //   position: 'absolute',
  //   top: 0,
  //   left: 0,
  //   width: '100%',
  //   height: '100%',
  //   objectFit: 'cover',
  //   zIndex: -1,
  // };

  return (
    <div
      style={{
        width: '1920px',
        height: '1080px',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: canvasToRender.backgroundColor || 'transparent', // Canvas background color remains
        border: canvasToRender.showBroadcastBorder === false ? '1px dashed transparent' : '1px dashed #777', // Conditional border
      }}
    >
      <div style={debugInfoStyle}>
        DEBUG INFO (BroadcastView):
        Target Canvas ID: {targetCanvasId || "N/A"}
        Active Hook ID: {activeCanvasIdFromHook || "N/A"}
        Rendered Canvas ID: {canvasToRender.id}
        Rendered Canvas Name: {canvasToRender.name}
        Layout Elements Count: {canvasToRender.layout.length}
        Layout Element Types: {canvasToRender.layout.map(el => el.type).join(', ') || "None"}
        Current Canvases from Hook Count: {currentCanvasesFromHook.length}
        Window Dimensions: {window.innerWidth}x{window.innerHeight}
        User Agent (for OBS debugging): {navigator.userAgent}
      </div>
      {/* Old direct background image rendering removed */}
      {canvasToRender.layout.map((element: StudioElement) => {
        // console.log('BroadcastView - Rendering element.type:', element.type);
        // console.log('BroadcastView - Rendering element object:', JSON.parse(JSON.stringify(element))); // Deep clone for cleaner log
        const currentScale = element.scale || 1;

        const outerDivStyle = {
          position: 'absolute',
          left: `${element.position.x}px`,
          top: `${element.position.y}px`,
          width: `${element.size.width * currentScale}px`,
          height: `${element.size.height * currentScale}px`,
          boxSizing: 'border-box',
        };

        const currentOverflow = (element.type === "MapPoolElement" || element.type === "CivPoolElement") ? 'visible' : 'hidden';

        const innerDivStyle = {
          width: `${element.size.width}px`,
          height: `${element.size.height}px`,
          transform: `scale(${currentScale})`,
          transformOrigin: 'top left',
          overflow: currentOverflow, // Use the conditional overflow
          boxSizing: 'border-box',
        };

        let content = null;
        if (element.type === "ScoreOnly") {
          content = <ScoreOnlyElement element={element} isBroadcast={true} />;
        } else if (element.type === "NicknamesOnly") {
          content = <NicknamesOnlyElement element={element} isBroadcast={true} />;
        } else if (element.type === "BoXSeriesOverview") {
          content = <BoXSeriesOverviewElement element={element} isBroadcast={true} />;
        } else if (element.type === "CountryFlags") {
          content = <CountryFlagsElement element={element} isBroadcast={true} />;
        } else if (element.type === "ColorGlowElement") {
          content = <ColorGlowElement element={element} isBroadcast={true} />;
        } else if (element.type === "MapPoolElement") {
          content = <MapPoolElement element={element} isBroadcast={true} />;
        } else if (element.type === "CivPoolElement") {
          content = <CivPoolElement element={element} isBroadcast={true} />;
        } else if (element.type === "BackgroundImage") {
          content = <BackgroundImageElement element={element} isBroadcast={true} />;
        } else {
          content = (
            <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555', color: '#ccc' }}>
              Unknown Element: {element.type}
            </div>
          );
        }

        // const currentScale = element.scale || 1; // Moved up

        // If content is null (e.g., BackgroundImageElement returned null for broadcast),
        // then don't render the wrapper divs for this element.
        if (!content) {
          return null;
        }

        return (
          <div
            key={element.id}
            style={outerDivStyle} // Use the logged style object
          >
            <div style={innerDivStyle}> {/* Use the logged style object */}
               {content}
            </div>
          </div>
        );
      })}
      {/* Debug Overlay Start */}
      {/*
      <div
        style={{
          position: 'absolute',
          left: '0px',
          top: '0px',
          width: '1920px',
          height: '1080px',
          border: '1px solid red',
          boxSizing: 'border-box', // Ensures border is within the dimensions
          pointerEvents: 'none', // So it doesn't interfere with any (future) interaction
        }}
      ></div>

      <div
        style={{
          position: 'absolute',
          left: '0px',
          top: '539.5px', // 1080 / 2 - (1/2) = 540 - 0.5 (for 1px line centering)
          width: '1920px',
          height: '1px',
          backgroundColor: 'red',
          pointerEvents: 'none',
        }}
      ></div>

      <div
        style={{
          position: 'absolute',
          left: '959.5px', // 1920 / 2 - (1/2) = 960 - 0.5 (for 1px line centering)
          top: '0px',
          width: '1px',
          height: '1080px',
          backgroundColor: 'red',
          pointerEvents: 'none',
        }}
      ></div>
      */}
      {/* Debug Overlay End */}
    </div>
  );
};

export default BroadcastView;
