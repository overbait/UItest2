import React, { useEffect, useMemo } from 'react';
import useDraftStore from '../store/draftStore';
import { StudioElement } from '../types/draft';
import ScoreOnlyElement from '../components/studio/ScoreOnlyElement';
import NicknamesOnlyElement from '../components/studio/NicknamesOnlyElement';
import BoXSeriesOverviewElement from '../components/studio/BoXSeriesOverviewElement';
import CountryFlagsElement from '../components/studio/CountryFlagsElement';
import ColorGlowElement from '../components/studio/ColorGlowElement';
import MapPoolElement from '../components/studio/MapPoolElement';
import CivPoolElement from '../components/studio/CivPoolElement';
// All elements are now imported.

interface BroadcastViewProps {
  targetCanvasId: string;
}

const BroadcastView: React.FC<BroadcastViewProps> = ({ targetCanvasId }) => {
  const { currentCanvasesFromHook, activeCanvasIdFromHook } = useDraftStore(state => ({
    currentCanvasesFromHook: state.currentCanvases,
    activeCanvasIdFromHook: state.activeCanvasId,
  }));

  useEffect(() => {
    (window as any).IS_BROADCAST_VIEW = true;
    return () => {
      (window as any).IS_BROADCAST_VIEW = false;
    };
  }, []);

  const canvasToRender = useMemo(() => {
    // First, try with targetCanvasId from URL
    let foundCanvas = currentCanvasesFromHook.find(canvas => canvas.id === targetCanvasId);

    if (!foundCanvas && currentCanvasesFromHook.length > 0) {
      // If not found by URL ID, and canvases exist, try the activeCanvasId from the store
      foundCanvas = currentCanvasesFromHook.find(canvas => canvas.id === activeCanvasIdFromHook);
      if (foundCanvas) {
      } else {
      }
    }
    return foundCanvas;
  }, [currentCanvasesFromHook, targetCanvasId, activeCanvasIdFromHook]);

  if (!canvasToRender) {
    return (
      <div style={{ width: '1920px', height: '1080px', backgroundColor: 'rgba(255,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px' }}>
        Canvas with ID '{targetCanvasId}' (or active canvas fallback) not found.
      </div>
    );
  }

  if (canvasToRender) { // Ensure canvasToRender is not null before logging its properties
    console.log('BroadcastView - canvasToRender:', JSON.parse(JSON.stringify(canvasToRender))); // Log a deep clone for cleaner inspection
    console.log('BroadcastView - canvasToRender.layout:', canvasToRender.layout); // Log the layout array directly
  }
  return (
    <div
      style={{
        width: '1920px',
        height: '1080px',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: canvasToRender.backgroundColor || 'transparent', // Apply background color or default to transparent
        // border: '1px dotted rgba(255,255,255,0.1)', // Optional: for dev/setup
      }}
    >
      {canvasToRender.backgroundImage && (
        (() => {
          console.log(`[BROADCAST DEBUG] Canvas ${canvasToRender.id} attempting to render background image: ${canvasToRender.backgroundImage}`);
          return (
            <img
              src={canvasToRender.backgroundImage}
              alt="Canvas Background"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: -1, // Ensure it's behind all other elements
              }}
            />
          );
        })()
      )}
      {canvasToRender.layout.map((element: StudioElement) => {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -1, // Ensure it's behind all other elements
          }}
        />
      )}
      {canvasToRender.layout.map((element: StudioElement) => {
        console.log('BroadcastView - Rendering element.type:', element.type);
        console.log('BroadcastView - Rendering element object:', JSON.parse(JSON.stringify(element))); // Deep clone for cleaner log
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
        } else {
          content = (
            <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dotted #555', color: '#ccc' }}>
              Unknown Element: {element.type}
            </div>
          );
        }

        // const currentScale = element.scale || 1; // Moved up

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
